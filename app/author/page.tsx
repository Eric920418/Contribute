'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Clock, CheckCircle, PenTool, Home } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import YearDropdown from '@/components/ui/YearDropdown'
import Breadcrumb from '@/components/ui/Breadcrumb'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/hooks/useAuth'
import { useSubmissions, useSubmissionMutations } from '@/hooks/useSubmissions'

// 統一稿件編號格式化函數：日期時間_亂數5碼（與後台一致）
const formatSubmissionNumber = (submission: any): string => {
  const date = new Date(submission.submittedAt || submission.createdAt || Date.now())
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  // 從submission id生成5位亂數碼（確保一致性）
  const randomCode = submission.id.slice(-8).toUpperCase().slice(0, 5)

  return `${year}${month}${day}${hours}${minutes}_${randomCode}`
}

type MenuTab = 'home' | 'submissions' | 'history' | 'completed' | 'submission'
type SubmissionView = 'list' | 'drafts' | 'revisions'
type HomeView =
  | 'overview'
  | 'submitted'
  | 'underReview'
  | 'accepted'
  | 'rejected'
type NavigationSource = 'home' | 'history'

export default function AuthorPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedConferenceId, setSelectedConferenceId] = useState<string>('')
  const [year, setYear] = useState(2025)
  const [availableYears, setAvailableYears] = useState<{ value: number; label: string; id?: string; isActive?: boolean }[]>([])
  const [activeTab, setActiveTab] = useState<MenuTab>('home')
  const [submissionView, setSubmissionView] = useState<SubmissionView>('list')
  const [homeView, setHomeView] = useState<HomeView>('overview')
  const [navigationSource, setNavigationSource] =
    useState<NavigationSource>('home')

  // 載入可用的會議年份
  const loadAvailableYears = async () => {
    try {
      const response = await fetch('/api/conferences')
      if (!response.ok) throw new Error('Failed to fetch conferences')
      
      const data = await response.json()
      const { conferences } = data
      
      if (conferences && conferences.length > 0) {
        const years = conferences.map((conf: any) => ({
          value: conf.year,
          label: conf.title || `${conf.year} 課程教學與傳播科技研討會`,
          id: conf.id,
          isActive: conf.isActive
        })).sort((a: any, b: any) => b.value - a.value)
        
        setAvailableYears(years)
        
        // 設定初始選中的會議
        if (years.length > 0) {
          if (!selectedConferenceId || !years.some((y: any) => y.id === selectedConferenceId)) {
            setSelectedConferenceId(years[0].id || `year-${years[0].value}`)
            setYear(years[0].value)
          }
        }
      } else {
        // 沒有會議時的預設值
        const currentYear = new Date().getFullYear()
        const defaultYears = [
          { value: currentYear, label: `${currentYear} 課程教學與傳播科技研討會`, id: `default-${currentYear}` }
        ]
        setAvailableYears(defaultYears)
        
        if (!selectedConferenceId) {
          setSelectedConferenceId(defaultYears[0].id)
          setYear(defaultYears[0].value)
        }
      }
    } catch (error) {
      console.error('載入會議列表失敗:', error)
      // 使用預設會議
      const currentYear = new Date().getFullYear()
      const defaultYears = [
        { value: currentYear, label: `${currentYear} 課程教學與傳播科技研討會`, id: `default-${currentYear}` }
      ]
      setAvailableYears(defaultYears)
    }
  }

  useEffect(() => {
    loadAvailableYears()
  }, [])

  // 使用真實資料 - 傳入會議ID以確保獲取正確會議的投稿
  const { submissions, stats, conference, loading, error, refetch } =
    useSubmissions(year, undefined, selectedConferenceId)
  const {
    saveDraft: saveSubmissionDraft,
    submitSubmission,
    updateSubmission,
    deleteSubmission,
    loading: mutationLoading,
    error: mutationError,
  } = useSubmissionMutations()
  const [currentStep, setCurrentStep] = useState(1)
  // 定義作者類型
  interface Author {
    name: string
    institution: string
    email: string
    isCorresponding: boolean
  }

  const [submissionData, setSubmissionData] = useState<{
    paperType: string
    conferenceSubject: string
    title: string
    abstract: string
    keywords: string
    manuscriptFile: File | null
    titlePageFile: File | null
    authors: Author[]
    agreements: {
      originalWork: boolean
      noConflictOfInterest: boolean
      consentToPublish: boolean
    }
    copyrightPermission: string
    formatCheck: string
  }>({
    paperType: '',
    conferenceSubject: '',
    title: '',
    abstract: '',
    keywords: '',
    manuscriptFile: null,
    titlePageFile: null,
    authors: [],
    agreements: {
      originalWork: false,
      noConflictOfInterest: false,
      consentToPublish: false,
    },
    copyrightPermission: '',
    formatCheck: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isEditingDraft, setIsEditingDraft] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 檔案上傳狀態
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<{
    manuscriptFile?: {
      id: string;
      originalName: string;
      size: number;
      version: number;
    };
    titlePageFile?: {
      id: string;
      originalName: string;
      size: number;
      version: number;
    };
  }>({})
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null)
  
  // 作者模態視窗狀態
  const [showAuthorModal, setShowAuthorModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [editingAuthorIndex, setEditingAuthorIndex] = useState<number | null>(null)
  const [modalAuthorData, setModalAuthorData] = useState({
    name: '',
    institution: '',
    email: '',
    isCorresponding: false,
  })

  // 頁面載入時自動載入草稿
  useEffect(() => {
    loadDraft()
  }, [])

  // 恢復檔案狀態的輔助函數
  const restoreFileStatus = async (draftId: string) => {
    try {
      console.log('嘗試從資料庫恢復檔案狀態，draftId:', draftId)
      const response = await fetch(`/api/submissions/${draftId}`)
      if (response.ok) {
        const data = await response.json()
        const submission = data.submission
        
        // 恢復已上傳的檔案狀態
        const restoredFiles: any = {}
        if (submission.files && submission.files.length > 0) {
          submission.files.forEach((file: any) => {
            if (file.kind === 'MANUSCRIPT_ANONYMOUS' && file.id && file.originalName) {
              restoredFiles.manuscriptFile = {
                id: file.id,
                originalName: file.originalName,
                size: file.size || 0,
                version: file.version
              }
            } else if (file.kind === 'TITLE_PAGE' && file.id && file.originalName) {
              restoredFiles.titlePageFile = {
                id: file.id,
                originalName: file.originalName,
                size: file.size || 0,
                version: file.version
              }
            }
          })
        }
        setUploadedFiles(restoredFiles)
        console.log('檔案狀態恢復成功:', restoredFiles)
      } else {
        console.warn('草稿不存在，清除檔案狀態')
        setUploadedFiles({})
      }
    } catch (error) {
      console.warn('無法從資料庫恢復檔案狀態:', error)
      setUploadedFiles({})
    }
  }

  // 載入草稿功能
  const loadDraft = () => {
    try {
      const savedDraft = localStorage.getItem('submissionDraft')
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft)
        setSubmissionData({
          paperType: draftData.paperType || '',
          conferenceSubject: draftData.conferenceSubject || '',
          title: draftData.title || '',
          abstract: draftData.abstract || '',
          keywords: draftData.keywords || '',
          // 注意：檔案無法從 localStorage 恢復，只能顯示檔案資訊
          manuscriptFile: null, // File 物件無法保存到 localStorage
          titlePageFile: null,
          authors:
            draftData.authors && draftData.authors.length > 0
              ? draftData.authors
              : [],
          agreements: draftData.agreements || {
            originalWork: false,
            noConflictOfInterest: false,
            consentToPublish: false,
          },
          copyrightPermission: draftData.copyrightPermission || '',
          formatCheck: draftData.formatCheck || '',
        })
        // 新建稿件時不載入步驟狀態，維持從步驟1開始
        // setCurrentStep(draftData.currentStep || 1)

      

        // 如果有草稿ID，設定為當前 submission ID並嘗試恢復檔案狀態
        if (draftData.draftId) {
          setCurrentSubmissionId(draftData.draftId)
          
          // 異步恢復檔案狀態
          restoreFileStatus(draftData.draftId)
        } else {
          // 沒有草稿ID時，清空檔案狀態
          setUploadedFiles({})
        }

       
      }
    } catch (error) {
     
    }
  }

  // 開始新投稿功能
  const startNewSubmission = async () => {
    try {
      // 如果當前有表單內容，先保存為草稿
      const hasContent =
        submissionData.title.trim() ||
        submissionData.abstract.trim() ||
        submissionData.keywords.trim() ||
        submissionData.paperType ||
        submissionData.conferenceSubject ||
        submissionData.manuscriptFile ||
        submissionData.authors.some(
          author =>
            author.name.trim() ||
            author.email.trim() ||
            author.institution.trim()
        )

      if (hasContent && activeTab === 'submission') {
        // 自動保存當前內容為草稿
        const draftData = {
          title: submissionData.title,
          abstract: submissionData.abstract,
          track: submissionData.conferenceSubject,
          authors: submissionData.authors.map(author => ({
            name: author.name,
            email: author.email,
            institution: author.institution,
            isCorresponding: author.isCorresponding,
          })),
          conferenceId: selectedConferenceId,
          conferenceYear: year,
        }

        try {
          await saveSubmissionDraft(draftData)
         
        } catch (err) {
         
        }
      }

      // 清空表單並重置狀態
      setSubmissionData({
        paperType: '',
        conferenceSubject: '',
        title: '',
        abstract: '',
        keywords: '',
        manuscriptFile: null,
        titlePageFile: null,
        authors: [
          {
            name: '',
            institution: '',
            email: '',
            isCorresponding: true,
          },
        ],
        agreements: {
          originalWork: false,
          noConflictOfInterest: false,
          consentToPublish: false,
        },
        copyrightPermission: '',
        formatCheck: '',
      })
      setCurrentStep(1)
      setErrors({})
      setIsEditingDraft(true) // 進入投稿模式，顯示步驟

      // 清空檔案上傳狀態
      setUploadedFiles({})
      setCurrentSubmissionId('')

      // 清除本地草稿緩存
      localStorage.removeItem('submissionDraft')

      // 切換到投稿表單
      setActiveTab('submission')

     
    } catch (error) {
     
    }
  }

  const PAPER_TYPES = [
    { value: 'research', label: '研究論文' },
    { value: 'case_study', label: '案例研究' },
    { value: 'review', label: '文獻回顧' },
    { value: 'technical', label: '技術報告' },
  ]

  // 根據選中的會議獲取其tracks作為會議子題選項
  const selectedConference = availableYears.find(conf => conf.id === selectedConferenceId)
  const [selectedConferenceData, setSelectedConferenceData] = useState<any>(null)

  useEffect(() => {
    // 當選中會議時，獲取該會議的詳細資料
    const loadSelectedConferenceData = async () => {
      if (selectedConferenceId && selectedConferenceId !== `default-${year}`) {
        try {
          const response = await fetch(`/api/conferences?conferenceId=${selectedConferenceId}`)
          if (response.ok) {
            const data = await response.json()
            setSelectedConferenceData(data)
          }
        } catch (error) {
          console.error('載入選中會議資料失敗:', error)
        }
      }
    }
    loadSelectedConferenceData()
  }, [selectedConferenceId])

  const CONFERENCE_SUBJECTS = selectedConferenceData?.tracks
    ? Object.entries(selectedConferenceData.tracks).map(([value, label]) => ({
        value,
        label: typeof label === 'string' ? label : value,
      }))
    : conference?.tracks
    ? Object.entries(conference.tracks).map(([value, label]) => ({
        value,
        label: typeof label === 'string' ? label : value,
      }))
    : [
        { value: 'ai_education', label: 'AI在教育中的應用' },
        { value: 'digital_learning', label: '數位學習與教學科技' },
        { value: 'curriculum_design', label: '課程設計與開發' },
        { value: 'assessment', label: '學習評量與分析' },
        { value: 'media_technology', label: '傳播科技與媒體素養' },
        { value: 'teacher_training', label: '教師專業發展' },
      ]

  // 純驗證函數，不改變狀態
  const checkStepValid = (step: number): boolean => {
    const checkErrors: Record<string, string> = {}

    switch (step) {
      case 1:
        if (!submissionData.paperType) checkErrors.paperType = '請選擇論文類型'
        if (!submissionData.conferenceSubject)
          checkErrors.conferenceSubject = '請選擇會議子題'
        break
      case 2:
        if (!submissionData.title.trim()) checkErrors.title = '請輸入標題'
        if (!submissionData.abstract.trim()) checkErrors.abstract = '請輸入摘要'
        if (!submissionData.keywords.trim())
          checkErrors.keywords = '請輸入關鍵詞'
        break
      case 3:
        // 檢查匿名稿件：本地檔案或已上傳檔案
        if (!submissionData.manuscriptFile && !uploadedFiles.manuscriptFile) {
          checkErrors.manuscriptFile = '請上傳匿名稿件'
        }
        // 檢查標題頁面：本地檔案或已上傳檔案
        if (!submissionData.titlePageFile && !uploadedFiles.titlePageFile) {
          checkErrors.titlePageFile = '請上傳標題頁面'
        }
        break
      case 4:
        submissionData.authors.forEach((author, index) => {
          if (!author.name.trim())
            checkErrors[`author_${index}_name`] = '請輸入作者姓名'
          if (!author.institution.trim())
            checkErrors[`author_${index}_institution`] = '請輸入服務機構'
          if (!author.email.trim())
            checkErrors[`author_${index}_email`] = '請輸入電子郵件'
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author.email)) {
            checkErrors[`author_${index}_email`] = '請輸入有效的電子郵件'
          }
        })
        break
      case 5:
        if (!submissionData.agreements.originalWork)
          checkErrors.originalWork = '必須確認此為原創作品'
        if (!submissionData.agreements.noConflictOfInterest)
          checkErrors.noConflictOfInterest = '必須聲明無利益衝突'
        if (!submissionData.agreements.consentToPublish)
          checkErrors.consentToPublish = '必須同意發表條款'
        break
    }

    return Object.keys(checkErrors).length === 0
  }

  // 有副作用的驗證函數，用於實際驗證並設置錯誤
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    switch (step) {
      case 1:
        if (!submissionData.paperType) newErrors.paperType = '請選擇論文類型'
        if (!submissionData.conferenceSubject)
          newErrors.conferenceSubject = '請選擇會議子題'
        break
      case 2:
        if (!submissionData.title.trim()) newErrors.title = '請輸入標題'
        if (!submissionData.abstract.trim()) newErrors.abstract = '請輸入摘要'
        if (!submissionData.keywords.trim()) newErrors.keywords = '請輸入關鍵詞'
        break
      case 3:
        // 檢查匿名稿件：本地檔案或已上傳檔案
        if (!submissionData.manuscriptFile && !uploadedFiles.manuscriptFile) {
          newErrors.manuscriptFile = '請上傳匿名稿件'
        }
        // 檢查標題頁面：本地檔案或已上傳檔案  
        if (!submissionData.titlePageFile && !uploadedFiles.titlePageFile) {
          newErrors.titlePageFile = '請上傳標題頁面'
        }
        break
      case 4:
        submissionData.authors.forEach((author, index) => {
          if (!author.name.trim())
            newErrors[`author_${index}_name`] = '請輸入作者姓名'
          if (!author.institution.trim())
            newErrors[`author_${index}_institution`] = '請輸入服務機構'
          if (!author.email.trim())
            newErrors[`author_${index}_email`] = '請輸入電子郵件'
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author.email)) {
            newErrors[`author_${index}_email`] = '請輸入有效的電子郵件'
          }
        })
        break
      case 5:
        if (!submissionData.agreements.originalWork)
          newErrors.originalWork = '必須確認此為原創作品'
        if (!submissionData.agreements.noConflictOfInterest)
          newErrors.noConflictOfInterest = '必須確認研究倫理遵循'
        if (!submissionData.agreements.consentToPublish)
          newErrors.consentToPublish = '必須確認已準備匿名稿件'
        if (!submissionData.copyrightPermission)
          newErrors.copyrightPermission = '請選擇是否已取得著作權授權'
        if (!submissionData.formatCheck)
          newErrors.formatCheck = '請確認是否已檢查格式'
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 6))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  // 檢查是否可以跳轉到指定步驟
  const canGoToStep = (targetStep: number): boolean => {
    if (targetStep <= currentStep) return true // 可以回到之前的步驟

    // 檢查是否每個步驟都已完成才能前進
    for (let step = 1; step < targetStep; step++) {
      if (!checkStepValid(step)) {
        return false
      }
    }
    return true
  }

  // 安全的步驟跳轉函數
  const goToStep = (targetStep: number) => {
    if (canGoToStep(targetStep)) {
      setCurrentStep(targetStep)
    } else {
      // 找到第一個未完成的步驟
      for (let step = 1; step <= 6; step++) {
        if (!checkStepValid(step)) {
          setCurrentStep(step)
          alert(`請先完成步驟${step}的必填欄位後再繼續`)
          break
        }
      }
    }
  }

  const handleManuscriptFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSubmissionData(prev => ({ ...prev, manuscriptFile: file }))
    }
  }

  const handleTitlePageFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSubmissionData(prev => ({ ...prev, titlePageFile: file }))
    }
  }

  // 檔案下載函數
  const downloadFile = async (fileId: string, originalName: string) => {
    try {
     
      const response = await fetch(`/api/submissions/download?fileId=${fileId}`)
      
     
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
       
        throw new Error(errorData.error || `檔案下載失敗 (${response.status})`)
      }

      // 創建下載連結
      const blob = await response.blob()
     
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = originalName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      alert(`檔案下載失敗: ${errorMessage}`)
    }
  }

  // 檔案上傳函數
  const uploadFiles = async () => {
    // 檢查是否有需要上傳的檔案
    const hasManuscriptToUpload = submissionData.manuscriptFile && !uploadedFiles.manuscriptFile
    const hasTitlePageToUpload = submissionData.titlePageFile && !uploadedFiles.titlePageFile
    
    if (!hasManuscriptToUpload && !hasTitlePageToUpload) {
      setErrors(prev => ({ ...prev, upload: '請選擇要上傳的檔案' }))
      return
    }

    setUploadingFiles(true)
    setErrors(prev => ({ ...prev, upload: '' }))

    try {
      // 如果沒有投稿ID，先創建草稿
      let submissionId = currentSubmissionId
      console.log('檔案上傳開始 - currentSubmissionId:', currentSubmissionId)
      
      if (!submissionId) {
        console.log('沒有 submissionId，創建新草稿...')
        const draftPayload = {
          title: submissionData.title || '未命名稿件',
          abstract: submissionData.abstract || '',
          track: submissionData.conferenceSubject || '',
          paperType: submissionData.paperType || '',
          keywords: submissionData.keywords || '',
          authors: submissionData.authors.filter(author => author.name.trim()),
          status: 'DRAFT'
        }
        console.log('草稿 payload:', draftPayload)
        
        const draftResponse = await fetch('/api/submissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(draftPayload),
        })

        if (!draftResponse.ok) {
          const errorData = await draftResponse.json()
          console.error('創建草稿失敗:', errorData)
          throw new Error('創建草稿失敗: ' + (errorData.error || '未知錯誤'))
        }

        const draftData = await draftResponse.json()
        console.log('草稿創建成功:', draftData)
        submissionId = draftData.submission.id
        console.log('獲得的 submissionId:', submissionId)
        setCurrentSubmissionId(submissionId)
      }
      
      console.log('最終用於上傳的 submissionId:', submissionId)

      const uploadResults: any = {}

      // 只上傳匿名稿件（如果選擇了且尚未上傳）
      if (hasManuscriptToUpload) {
        console.log('準備上傳匿名稿件，submissionId:', submissionId)
        const manuscriptFormData = new FormData()
        manuscriptFormData.append('submissionId', submissionId || '')
        manuscriptFormData.append('fileType', 'MANUSCRIPT_ANONYMOUS')
        manuscriptFormData.append('file', submissionData.manuscriptFile!)
        
        console.log('FormData 內容:')
        console.log('- submissionId:', manuscriptFormData.get('submissionId'))
        console.log('- fileType:', manuscriptFormData.get('fileType'))
        console.log('- file:', (manuscriptFormData.get('file') as File)?.name)

        const manuscriptResponse = await fetch('/api/submissions/upload', {
          method: 'POST',
          body: manuscriptFormData,
        })

        if (!manuscriptResponse.ok) {
          const errorData = await manuscriptResponse.json()
          throw new Error(errorData.error || '匿名稿件上傳失敗')
        }

        const manuscriptData = await manuscriptResponse.json()
        uploadResults.manuscriptFile = manuscriptData.file
      }

      // 只上傳標題頁面（如果選擇了且尚未上傳）
      if (hasTitlePageToUpload) {
        const titlePageFormData = new FormData()
        titlePageFormData.append('submissionId', submissionId || '')
        titlePageFormData.append('fileType', 'TITLE_PAGE')
        titlePageFormData.append('file', submissionData.titlePageFile!)

        const titlePageResponse = await fetch('/api/submissions/upload', {
          method: 'POST',
          body: titlePageFormData,
        })

        if (!titlePageResponse.ok) {
          const errorData = await titlePageResponse.json()
          throw new Error(errorData.error || '標題頁面上傳失敗')
        }

        const titlePageData = await titlePageResponse.json()
        uploadResults.titlePageFile = titlePageData.file
      }

      // 上傳檔案後，始終同步更新稿件元數據
      if (submissionId) {
        console.log('同步更新稿件元數據...')
        const updatePayload = {
          title: submissionData.title || '未命名稿件',
          abstract: submissionData.abstract || '',
          track: submissionData.conferenceSubject || '',
          paperType: submissionData.paperType || '',
          keywords: submissionData.keywords || '',
          authors: submissionData.authors.filter(author => author.name.trim()),
        }
        
        const updateResponse = await fetch(`/api/submissions/${submissionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        })

        if (!updateResponse.ok) {
          console.warn('更新稿件元數據失敗，但檔案上傳成功')
        } else {
          console.log('稿件元數據同步成功')
        }
      }

      // 更新已上傳檔案狀態（保留現有的，加入新上傳的）
      setUploadedFiles(prev => ({
        ...prev,
        ...uploadResults
      }))

      // 清除已上傳檔案的選擇狀態
      setSubmissionData(prev => ({
        ...prev,
        manuscriptFile: hasManuscriptToUpload ? null : prev.manuscriptFile,
        titlePageFile: hasTitlePageToUpload ? null : prev.titlePageFile
      }))

      // 立即更新 localStorage，包含新上傳的檔案資訊
      const updatedUploadedFiles = { ...uploadedFiles, ...uploadResults }
      const currentData = { ...submissionData }
      const updatedData = {
        ...currentData,
        manuscriptFile: hasManuscriptToUpload ? null : currentData.manuscriptFile,
        titlePageFile: hasTitlePageToUpload ? null : currentData.titlePageFile,
        // 更新檔案資訊，優先使用已上傳的檔案（如果需要的話可以在這裡添加檔案信息）
        draftId: submissionId
      }
      
      localStorage.setItem('submissionDraft', JSON.stringify(updatedData))
     

      setErrors(prev => ({ ...prev, upload: '' }))
      const uploadCount = Object.keys(uploadResults).length
      alert(`成功上傳 ${uploadCount} 個檔案！`)
      
    } catch (error) {
     
      setErrors(prev => ({ 
        ...prev, 
        upload: error instanceof Error ? error.message : '檔案上傳失敗' 
      }))
    } finally {
      setUploadingFiles(false)
    }
  }

  const addAuthor = () => {
    setModalMode('add')
    setEditingAuthorIndex(null)
    setModalAuthorData({
      name: '',
      institution: '',
      email: '',
      isCorresponding: false,
    })
    setShowAuthorModal(true)
  }

  const removeAuthor = (index: number) => {
    if (submissionData.authors.length > 1) {
      setSubmissionData(prev => ({
        ...prev,
        authors: prev.authors.filter((_, i) => i !== index),
      }))
    }
  }

  const updateAuthor = (
    index: number,
    field: string,
    value: string | boolean
  ) => {
    setSubmissionData(prev => ({
      ...prev,
      authors: prev.authors.map((author, i) =>
        i === index ? { ...author, [field]: value } : author
      ),
    }))
  }
  
  const setCorresponding = (index: number) => {
    setSubmissionData(prev => ({
      ...prev,
      authors: prev.authors.map((author, i) => ({
        ...author,
        isCorresponding: i === index,
      })),
    }))
  }
  
  const editAuthor = (index: number) => {
    const author = submissionData.authors[index]
    setModalMode('edit')
    setEditingAuthorIndex(index)
    setModalAuthorData({
      name: author.name,
      institution: author.institution,
      email: author.email,
      isCorresponding: author.isCorresponding,
    })
    setShowAuthorModal(true)
  }
  
  const moveAuthor = (index: number, direction: number) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= submissionData.authors.length) return
    
    setSubmissionData(prev => {
      const newAuthors = [...prev.authors]
      const [movedAuthor] = newAuthors.splice(index, 1)
      newAuthors.splice(newIndex, 0, movedAuthor)
      return {
        ...prev,
        authors: newAuthors,
      }
    })
  }
  
  // 處理模態視窗的函數
  const handleModalSave = () => {
    // 驗證必填欄位
    if (!modalAuthorData.name.trim()) {
      alert('請輸入作者姓名')
      return
    }
    if (!modalAuthorData.institution.trim()) {
      alert('請輸入服務機構')
      return
    }
    if (!modalAuthorData.email.trim()) {
      alert('請輸入電子郵件')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(modalAuthorData.email)) {
      alert('請輸入有效的電子郵件')
      return
    }

    if (modalMode === 'add') {
      // 新增作者
      setSubmissionData(prev => ({
        ...prev,
        authors: [
          ...prev.authors,
          { ...modalAuthorData },
        ],
      }))
    } else if (modalMode === 'edit' && editingAuthorIndex !== null) {
      // 編輯作者
      setSubmissionData(prev => ({
        ...prev,
        authors: prev.authors.map((author, i) =>
          i === editingAuthorIndex ? { ...modalAuthorData } : author
        ),
      }))
    }

    // 關閉模態視窗
    setShowAuthorModal(false)
    setModalAuthorData({
      name: '',
      institution: '',
      email: '',
      isCorresponding: false,
    })
    setEditingAuthorIndex(null)
  }

  const handleModalCancel = () => {
    setShowAuthorModal(false)
    setModalAuthorData({
      name: '',
      institution: '',
      email: '',
      isCorresponding: false,
    })
    setEditingAuthorIndex(null)
  }

  const saveDraft = async () => {
    try {
      // 草稿可以隨時保存，不需要驗證當前步驟

      // 檢查是否有現有草稿
      let existingDraftId = null
      
      // 優先使用當前的 submission ID（檔案上傳時建立的）
      if (currentSubmissionId) {
        const currentSubmission = submissions.find(
          s => s.id === currentSubmissionId && s.status === 'DRAFT'
        )
        if (currentSubmission) {
          existingDraftId = currentSubmissionId
        }
      }
      
      // 如果沒有 currentSubmissionId，從 localStorage 找草稿ID
      if (!existingDraftId) {
        try {
          const savedDraft = localStorage.getItem('submissionDraft')
          if (savedDraft) {
            const draftData = JSON.parse(savedDraft)
            if (draftData.draftId) {
              const existingDraft = submissions.find(
                s => s.id === draftData.draftId && s.status === 'DRAFT'
              )
              if (existingDraft) {
                existingDraftId = draftData.draftId
              }
            }
          }
        } catch (e) {
          // 忽略解析錯誤
        }
      }

      // 完整的草稿資料，包含所有欄位
      const draftData = {
        title: submissionData.title || '',
        abstract: submissionData.abstract || '',
        track: submissionData.conferenceSubject || '',
        authors: submissionData.authors.filter(author => author.name.trim()).map(author => ({
          name: author.name.trim(),
          email: author.email.trim(),
          institution: author.institution.trim(),
          isCorresponding: author.isCorresponding || false,
        })),
        conferenceId: selectedConferenceId,
        conferenceYear: year,
        // 新增完整欄位
        paperType: submissionData.paperType || '',
        keywords: submissionData.keywords || '',
        manuscriptFileInfo: submissionData.manuscriptFile
          ? {
              name: submissionData.manuscriptFile.name,
              size: submissionData.manuscriptFile.size,
              type: submissionData.manuscriptFile.type,
              lastModified: submissionData.manuscriptFile.lastModified,
            }
          : uploadedFiles.manuscriptFile
          ? {
              name: uploadedFiles.manuscriptFile.originalName,
              size: uploadedFiles.manuscriptFile.size,
              type: 'application/pdf', // 上傳的檔案已轉為PDF
              lastModified: Date.now(),
            }
          : null,
        titlePageFileInfo: submissionData.titlePageFile
          ? {
              name: submissionData.titlePageFile.name,
              size: submissionData.titlePageFile.size,
              type: submissionData.titlePageFile.type,
              lastModified: submissionData.titlePageFile.lastModified,
            }
          : uploadedFiles.titlePageFile
          ? {
              name: uploadedFiles.titlePageFile.originalName,
              size: uploadedFiles.titlePageFile.size,
              type: 'application/pdf', // 上傳的檔案已轉為PDF
              lastModified: Date.now(),
            }
          : null,
        agreements: submissionData.agreements || {
          originalWork: false,
          noConflictOfInterest: false,
          consentToPublish: false,
        },
        copyrightPermission: submissionData.copyrightPermission || '',
        formatCheck: submissionData.formatCheck || '',
        // 如果有現有草稿，傳送其ID以更新而不是創建新的
        draftId: existingDraftId,
      }

      const result = await saveSubmissionDraft(draftData)

      // 保存到本地存儲（備份），使用返回的草稿ID
      const savedDraftId = result.submission.id
      
      // 更新當前的 submission ID，確保檔案和草稿關聯
      setCurrentSubmissionId(savedDraftId)
      const localDraftData = {
        paperType: submissionData.paperType,
        conferenceSubject: submissionData.conferenceSubject,
        title: submissionData.title,
        abstract: submissionData.abstract,
        keywords: submissionData.keywords,
        manuscriptFileInfo: submissionData.manuscriptFile
          ? {
              name: submissionData.manuscriptFile.name,
              size: submissionData.manuscriptFile.size,
              type: submissionData.manuscriptFile.type,
              lastModified: submissionData.manuscriptFile.lastModified,
            }
          : uploadedFiles.manuscriptFile
          ? {
              name: uploadedFiles.manuscriptFile.originalName,
              size: uploadedFiles.manuscriptFile.size,
              type: 'application/pdf', // 上傳的檔案已轉為PDF
              lastModified: Date.now(),
            }
          : null,
        titlePageFileInfo: submissionData.titlePageFile
          ? {
              name: submissionData.titlePageFile.name,
              size: submissionData.titlePageFile.size,
              type: submissionData.titlePageFile.type,
              lastModified: submissionData.titlePageFile.lastModified,
            }
          : uploadedFiles.titlePageFile
          ? {
              name: uploadedFiles.titlePageFile.originalName,
              size: uploadedFiles.titlePageFile.size,
              type: 'application/pdf', // 上傳的檔案已轉為PDF
              lastModified: Date.now(),
            }
          : null,
        authors: submissionData.authors,
        agreements: submissionData.agreements,
        copyrightPermission: submissionData.copyrightPermission,
        formatCheck: submissionData.formatCheck,
        currentStep,
        lastSaved: new Date().toISOString(),
        draftId: savedDraftId, // 使用實際保存的草稿ID
      }
      localStorage.setItem('submissionDraft', JSON.stringify(localDraftData))

      alert('草稿已保存成功！')
      refetch() // 重新載入資料
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || '保存草稿失敗'
      alert('保存草稿失敗: ' + errorMessage)
    }
  }

  const handleSubmit = async () => {
    // 防止重複提交
    if (isSubmitting) {
      console.log('正在提交中，請勿重複點擊')
      return
    }

    try {
      setIsSubmitting(true)
      
      // 驗證所有步驟
      const allStepsValid = [1, 2, 3, 4, 5].every(step => validateStep(step))

      if (!allStepsValid) {
        alert('請完成所有必填欄位後再提交')
        setIsSubmitting(false)
        return
      }

      // 檢查會議是否開放
      if (!conference?.isActive) {
        alert('此會議目前未開放投稿，請聯繫管理員或選擇其他開放的會議')
        setIsSubmitting(false)
        return
      }

      // 優先使用當前的 submission ID，否則查找對應的草稿
      let existingDraftId = null
      
      if (currentSubmissionId) {
        const currentSubmission = submissions.find(
          s => s.id === currentSubmissionId && s.status === 'DRAFT'
        )
        if (currentSubmission) {
          existingDraftId = currentSubmissionId
        }
      }
      
      // 如果沒有 currentSubmissionId，嘗試查找對應的草稿
      if (!existingDraftId) {
        const existingDraft = submissions.find(
          s =>
            s.status === 'DRAFT' &&
            s.title === submissionData.title &&
            s.abstract === submissionData.abstract &&
            s.track === submissionData.conferenceSubject
        )
        existingDraftId = existingDraft?.id
      }

      const submissionPayload = {
        title: submissionData.title,
        abstract: submissionData.abstract,
        track: submissionData.conferenceSubject,
        authors: submissionData.authors.map(author => ({
          name: author.name,
          email: author.email,
          institution: author.institution,
          isCorresponding: author.isCorresponding,
        })),
        conferenceId: selectedConferenceId,
        conferenceYear: year,
        draftId: existingDraftId, // 如果找到對應草稿，使用其ID
      }

      const result = await submitSubmission(submissionPayload)

      // 顯示提交成功信息，包含流水號
      const successMessage = result.serialNumber
        ? `稿件提交成功！\n流水號：${result.serialNumber}\n${
            result.emailNotificationSent
              ? '已發送電子郵件通知所有作者。'
              : '電子郵件通知發送失敗，請聯繫管理員。'
          }`
        : '稿件提交成功！'

      alert(successMessage)

      // 清除草稿
      localStorage.removeItem('submissionDraft')

      // 重置表單
      setActiveTab('home')
      setCurrentStep(1)
      setCurrentSubmissionId(null) // 清除當前 submission ID
      setSubmissionData({
        paperType: '',
        conferenceSubject: '',
        title: '',
        abstract: '',
        keywords: '',
        manuscriptFile: null,
        titlePageFile: null,
        authors: [
          {
            name: '',
            institution: '',
            email: '',
            isCorresponding: true,
          },
        ],
        agreements: {
          originalWork: false,
          noConflictOfInterest: false,
          consentToPublish: false,
        },
        copyrightPermission: '',
        formatCheck: '',
      })
      setErrors({})

      // 重新載入資料
      refetch()
    } catch (err: any) {
      alert('提交稿件失敗: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 取得草稿清單
  const drafts = submissions
    .filter(s => s.status === 'DRAFT')
    .map((submission, index) => ({
      id: submission.id,
      no: formatSubmissionNumber(submission),
      title: submission.title,
      date: new Date(submission.createdAt).toLocaleDateString('zh-TW'),
      submission,
    }))

  // 載入草稿到編輯表單
  const loadDraftForEdit = async (submission: any) => {
    try {
      // 重新獲取最新的submission資料，包含最新的檔案狀態
      let latestSubmission = submission
      try {
        const response = await fetch(`/api/submissions/${submission.id}`)
        if (response.ok) {
          const data = await response.json()
          latestSubmission = data.submission
        } else {
        }
      } catch (error) {
      }

      // 首先嘗試從 localStorage 載入完整資料（如果有的話）
      let fullData = null
      try {
        const savedDraft = localStorage.getItem('submissionDraft')
        if (savedDraft) {
          const draftData = JSON.parse(savedDraft)
          // 檢查是否是同一份草稿
          if (
            draftData.title === latestSubmission.title &&
            draftData.abstract === latestSubmission.abstract
          ) {
            fullData = draftData
          }
        }
      } catch (e) {
        console.warn('無法從 localStorage 載入草稿資料')  // TODO: 需要處理
      }

      // 將草稿資料載入到表單狀態
      setSubmissionData({
        paperType: fullData?.paperType || latestSubmission.paperType || '',
        conferenceSubject: latestSubmission.track || '',
        title: latestSubmission.title || '',
        abstract: latestSubmission.abstract || '',
        keywords: fullData?.keywords || latestSubmission.keywords || '',
        manuscriptFile: null, // 檔案需要特別處理，無法從後端恢復
        titlePageFile: null,
        authors:
          latestSubmission.authors?.length > 0
            ? latestSubmission.authors.map((author: any) => ({
                name: author.name || '',
                institution: author.affiliation || author.institution || '',
                email: author.email || '',
                isCorresponding: author.isCorresponding || false,
              }))
            : [],
        agreements: fullData?.agreements || {
          originalWork: false,
          noConflictOfInterest: false,
          consentToPublish: false,
        },
        copyrightPermission: fullData?.copyrightPermission || '',
        formatCheck: fullData?.formatCheck || '',
      })

      setCurrentStep(fullData?.currentStep || 1) // 載入之前的步驟
      setActiveTab('submission') // 切換到投稿表單
      setIsEditingDraft(true) // 設置為編輯模式
      setCurrentSubmissionId(latestSubmission.id) // 設定當前編輯的草稿ID
      
      // 恢復已上傳的檔案狀態 (使用最新的檔案資料)
      const restoredFiles: any = {}
      
      if (latestSubmission.files && latestSubmission.files.length > 0) {
        latestSubmission.files.forEach((file: any) => {
          // 只有在檔案資訊完整時才添加到 restoredFiles
          if (file.kind === 'MANUSCRIPT_ANONYMOUS' && file.id && file.originalName) {
            restoredFiles.manuscriptFile = {
              id: file.id,
              originalName: file.originalName,
              size: file.size || 0,
              version: file.version
            }
          } else if (file.kind === 'TITLE_PAGE' && file.id && file.originalName) {
            restoredFiles.titlePageFile = {
              id: file.id,
              originalName: file.originalName,
              size: file.size || 0,
              version: file.version
            }
          }
        })
      }
      
      // 只有在有有效檔案時才設置，否則保持空物件
      setUploadedFiles(restoredFiles)

      // 檢查檔案狀態並清理過時的 localStorage 資訊
      if (fullData?.manuscriptFileInfo || fullData?.titlePageFileInfo) {
        let needsUpdate = false
        let fileList = []
        const updatedData = { ...fullData }
        
        // 檢查匿名稿件：如果已有實際檔案，清除 localStorage 中的過時資訊
        if (fullData.manuscriptFileInfo) {
          if (restoredFiles.manuscriptFile) {
            // 已有實際檔案，清除 localStorage 中的檔案資訊
            updatedData.manuscriptFileInfo = null
            needsUpdate = true
          } else {
            // 沒有實際檔案，需要重新上傳
            fileList.push(`匿名稿件「${fullData.manuscriptFileInfo.name}」`)
          }
        }
        
        // 檢查標題頁面：如果已有實際檔案，清除 localStorage 中的過時資訊
        if (fullData.titlePageFileInfo) {
          if (restoredFiles.titlePageFile) {
            // 已有實際檔案，清除 localStorage 中的檔案資訊
            updatedData.titlePageFileInfo = null
            needsUpdate = true
          } else {
            // 沒有實際檔案，需要重新上傳
            fileList.push(`標題頁面「${fullData.titlePageFileInfo.name}」`)
          }
        }
        
        // 更新 localStorage 清除過時資訊
        if (needsUpdate) {
          localStorage.setItem('submissionDraft', JSON.stringify(updatedData))
        }
        
        // 只有當確實有檔案需要重新上傳時才顯示提示
        if (fileList.length > 0) {
          setTimeout(() => {
            alert(
              `提示：此草稿原本包含 ${fileList.join(' 和 ')}，請重新上傳檔案。`
            )
          }, 500)
        }
      }

    } catch (error) {
      alert('載入草稿失敗，請稍後再試')
    }
  }

  // 顯示草稿詳情
  const [viewingDraft, setViewingDraft] = useState<any>(null)

  const viewDraft = (submission: any) => {
    setViewingDraft(submission)
  }

  const closeDraftView = () => {
    setViewingDraft(null)
  }

  // 刪除草稿
  const deleteDraftById = async (submission: any) => {
    if (!confirm('確定要刪除這份草稿嗎？此操作無法復原。')) {
      return
    }

    try {
      await deleteSubmission(submission.id)
      alert('草稿已成功刪除')
      refetch() // 重新載入列表
    } catch (err: any) {
      alert('刪除失敗: ' + (err.message || '未知錯誤'))
    }
  }

  // 統計資料處理
  const processingCount = stats.submitted + stats.underReview
  const revisionCount = stats.revisionRequired
  const completedCount = stats.accepted + stats.rejected

  // 渲染正在處理的稿件列表
  const renderSubmittedView = () => {
    const submittedSubmissions = submissions
      .filter(s => s.status === 'SUBMITTED')
      .map((submission, index) => ({
        id: submission.id,
        no: formatSubmissionNumber(submission),
        title: submission.title,
        date: new Date(submission.createdAt).toLocaleDateString('zh-TW'),
        track: submission.track,
        submission,
      }))

    return (
      <div className="space-y-8 lg:space-y-[56px]">
        <div>
          <Breadcrumb
            items={[
              {
                label: '待處理中',
                onClick: () => {
                  setActiveTab('history')
                  setHomeView('overview')
                },
                active: false,
              },
              { label: '正在處理', onClick: () => {}, active: true },
            ]}
          />
        </div>

        <div className="space-y-8 lg:space-y-14">
          <section className="bg-white rounded-xl shadow-sm">
            <header className="px-[48px] py-[40px]">
              <h3 className="text-[32px] md:text-[40px] font-medium text-[#00182C]">
                正在處理的稿件
              </h3>
            </header>

            <div className="border-t border-gray-200">
              <div className="overflow-x-auto">
                <table
                  className="w-full table-auto border-collapse"
                  aria-label="正在處理的稿件"
                >
                  <thead className="bg-white border-y border-gray-200 text-gray-700">
                    <tr>
                      <th
                        scope="col"
                        className="w-32 px-[48px] py-[24px] text-left text-24M font-medium"
                      >
                        編號
                      </th>
                      <th
                        scope="col"
                        className="px-[48px] py-[24px] text-left text-24M font-medium"
                      >
                        標題
                      </th>
                      <th
                        scope="col"
                        className="w-40 px-4 py-[24px] text-left text-24M font-medium"
                      >
                        提交日期
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-[60px] text-center text-gray-500"
                        >
                          載入中...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-[60px] text-center text-red-500"
                        >
                          載入失敗: {error}
                        </td>
                      </tr>
                    ) : submittedSubmissions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-[60px] text-center text-gray-500"
                        >
                          目前沒有正在處理的稿件
                        </td>
                      </tr>
                    ) : (
                      submittedSubmissions.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] font-medium text-24R">
                              {s.no}
                            </p>
                          </td>
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] leading-relaxed break-words text-24R">
                              {s.title}
                            </p>
                          </td>
                          <td className="w-40 px-4 py-[60px] align-middle text-gray-500 tabular-nums text-24R">
                            {s.date}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

  // 渲染審稿中的稿件列表
  const renderUnderReviewView = () => {
    const underReviewSubmissions = submissions
      .filter(s => s.status === 'UNDER_REVIEW')
      .map((submission, index) => ({
        id: submission.id,
        no: formatSubmissionNumber(submission),
        title: submission.title,
        date: new Date(submission.updatedAt).toLocaleDateString('zh-TW'),
        track: submission.track,
        submission,
      }))

    return (
      <div className="space-y-8 lg:space-y-[56px]">
        <div>
          <Breadcrumb
            items={[
              {
                label: '待處理中',
                onClick: () => {
                  setActiveTab('history')
                  setHomeView('overview')
                },
                active: false,
              },
              { label: '審稿中', onClick: () => {}, active: true },
            ]}
          />
        </div>

        <div className="space-y-8 lg:space-y-14">
          <section className="bg-white rounded-xl shadow-sm">
            <header className="px-[48px] py-[40px]">
              <h3 className="text-[32px] md:text-[40px] font-medium text-[#00182C]">
                審稿中的稿件
              </h3>
            </header>

            <div className="border-t border-gray-200">
              <div className="overflow-x-auto">
                <table
                  className="w-full table-auto border-collapse"
                  aria-label="審稿中的稿件"
                >
                  <thead className="bg-white border-y border-gray-200 text-gray-700">
                    <tr>
                      <th
                        scope="col"
                        className="w-32 px-[48px] py-[24px] text-left text-24M font-medium"
                      >
                        編號
                      </th>
                      <th
                        scope="col"
                        className="px-[48px] py-[24px] text-left text-24M font-medium"
                      >
                        標題
                      </th>
                      <th
                        scope="col"
                        className="w-40 px-4 py-[24px] text-left text-24M font-medium"
                      >
                        送審日期
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-[60px] text-center text-gray-500"
                        >
                          載入中...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-[60px] text-center text-red-500"
                        >
                          載入失敗: {error}
                        </td>
                      </tr>
                    ) : underReviewSubmissions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-[60px] text-center text-gray-500"
                        >
                          目前沒有審稿中的稿件
                        </td>
                      </tr>
                    ) : (
                      underReviewSubmissions.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] font-medium text-24R">
                              {s.no}
                            </p>
                          </td>
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] leading-relaxed break-words text-24R">
                              {s.title}
                            </p>
                          </td>
                          <td className="w-40 px-4 py-[60px] align-middle text-gray-500 tabular-nums text-24R">
                            {s.date}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

  // 渲染已接受的稿件列表
  const renderAcceptedView = () => {
    const acceptedSubmissions = submissions
      .filter(s => s.status === 'ACCEPTED')
      .map((submission, index) => ({
        id: submission.id,
        no: formatSubmissionNumber(submission),
        title: submission.title,
        date: new Date(submission.updatedAt).toLocaleDateString('zh-TW'),
        track: submission.track,
        submission,
      }))

    return (
      <div className="space-y-8 lg:space-y-[56px]">
        <div>
          <Breadcrumb
            items={[
              {
                label: '已完成',
                onClick: () => {
                  setActiveTab('completed')
                  setHomeView('overview')
                },
                active: false,
              },
              { label: '已接受', onClick: () => {}, active: true },
            ]}
          />
        </div>

        <div className="space-y-8 lg:space-y-14">
          <section className="bg-white rounded-xl shadow-sm">
            <header className="px-[48px] py-[40px]">
              <h3 className="text-[32px] md:text-[40px] font-medium text-[#00182C]">
                已接受的稿件
              </h3>
            </header>

            <div className="border-t border-gray-200">
              <div className="overflow-x-auto">
                <table
                  className="w-full table-auto border-collapse"
                  aria-label="已接受的稿件"
                >
                  <thead className="bg-white border-y border-gray-200 text-gray-700">
                    <tr>
                      <th
                        scope="col"
                        className="w-32 px-[48px] py-[24px] text-left text-24M font-medium"
                      >
                        編號
                      </th>
                      <th
                        scope="col"
                        className="px-[48px] py-[24px] text-left text-24M font-medium"
                      >
                        標題
                      </th>
                      <th
                        scope="col"
                        className="w-40 px-4 py-[24px] text-left text-24M font-medium"
                      >
                        接受日期
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-[60px] text-center text-gray-500"
                        >
                          載入中...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-[60px] text-center text-red-500"
                        >
                          載入失敗: {error}
                        </td>
                      </tr>
                    ) : acceptedSubmissions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-[60px] text-center text-gray-500"
                        >
                          目前沒有已接受的稿件
                        </td>
                      </tr>
                    ) : (
                      acceptedSubmissions.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] font-medium text-24R">
                              {s.no}
                            </p>
                          </td>
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] leading-relaxed break-words text-24R">
                              {s.title}
                            </p>
                          </td>
                          <td className="w-40 px-4 py-[60px] align-middle text-gray-500 tabular-nums text-24R">
                            {s.date}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

  // 渲染已拒絕的稿件列表
  const renderRejectedView = () => {
    const rejectedSubmissions = submissions
      .filter(s => s.status === 'REJECTED')
      .map((submission, index) => ({
        id: submission.id,
        no: formatSubmissionNumber(submission),
        title: submission.title,
        date: new Date(submission.updatedAt).toLocaleDateString('zh-TW'),
        track: submission.track,
        submission,
      }))

    return (
      <div className="space-y-8 lg:space-y-[56px]">
        <div>
          <Breadcrumb
            items={[
              {
                label: '已完成',
                onClick: () => {
                  setActiveTab('completed')
                  setHomeView('overview')
                },
                active: false,
              },
              { label: '已拒絕', onClick: () => {}, active: true },
            ]}
          />
        </div>

        <div className="space-y-8 lg:space-y-14">
          <section className="bg-white rounded-xl shadow-sm">
            <header className="px-[48px] py-[40px]">
              <h3 className="text-[32px] md:text-[40px] font-medium text-[#00182C]">
                已拒絕的稿件
              </h3>
            </header>

            <div className="border-t border-gray-200">
              <div className="overflow-x-auto">
                <table
                  className="w-full table-auto border-collapse"
                  aria-label="已拒絕的稿件"
                >
                  <thead className="bg-white border-y border-gray-200 text-gray-700">
                    <tr>
                      <th
                        scope="col"
                        className="w-32 px-[48px] py-[24px] text-left text-24M font-medium"
                      >
                        編號
                      </th>
                      <th
                        scope="col"
                        className="px-[48px] py-[24px] text-left text-24M font-medium"
                      >
                        標題
                      </th>
                      <th
                        scope="col"
                        className="w-40 px-4 py-[24px] text-left text-24M font-medium"
                      >
                        拒絕日期
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-[60px] text-center text-gray-500"
                        >
                          載入中...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-[60px] text-center text-red-500"
                        >
                          載入失敗: {error}
                        </td>
                      </tr>
                    ) : rejectedSubmissions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-[60px] text-center text-gray-500"
                        >
                          目前沒有已拒絕的稿件
                        </td>
                      </tr>
                    ) : (
                      rejectedSubmissions.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] font-medium text-24R">
                              {s.no}
                            </p>
                          </td>
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] leading-relaxed break-words text-24R">
                              {s.title}
                            </p>
                          </td>
                          <td className="w-40 px-4 py-[60px] align-middle text-gray-500 tabular-nums text-24R">
                            {s.date}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        if (homeView === 'submitted') {
          return renderSubmittedView()
        } else if (homeView === 'underReview') {
          return renderUnderReviewView()
        } else if (homeView === 'accepted') {
          return renderAcceptedView()
        } else if (homeView === 'rejected') {
          return renderRejectedView()
        }
        return (
          <div className="space-y-8 lg:space-y-[56px]">
            <div>
              <h1 className="text-3xl md:text-[64px] font-medium text-[#00182C] leading-tight">
                首頁
              </h1>
            </div>

            <div className="bg-white rounded-lg p-6 md:p-[48px]">
              <h3 className="text-xl md:text-40M font-semibold text-[#00182C] mb-[24px]">
                投稿列表
              </h3>
              <div className="space-y-3 p-[24px]">
                <div className="flex items-center gap-3 p-2">
                  <span className="w-[20px] h-[20px] rounded-full bg-transparent "></span>
                  <span className="text-primary text-32R">提交新稿件</span>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('submissions')
                    setSubmissionView('drafts')
                    setHomeView('overview')
                  }}
                  className="flex items-center gap-3 w-full text-left hover:bg-gray-50 p-2 rounded transition-colors"
                >
                  <span className="w-[20px] h-[20px] rounded-full bg-primary "></span>
                  <span className="text-gray-600 text-32R">草稿狀態</span>
                  <span className="text-gray-800 text-32R">
                    ({stats.draft})
                  </span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('submissions')
                    setSubmissionView('revisions')
                    setHomeView('overview')
                  }}
                  className="flex items-center gap-3 text-orange-600 w-full text-left hover:bg-orange-50 p-2 rounded transition-colors"
                >
                  <span className="w-[20px] h-[20px] rounded-full bg-transparent "></span>
                  <span className="text-32R">草稿修訂</span>
                  <span className="text-32R">({revisionCount})</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className=" bg-white rounded-lg p-6 md:p-[48px]">
                <h4 className="text-40M text-[#00182C] mb-[24px]">待處理中</h4>
                <div className="space-y-2 p-[24px]">
                  <button
                    onClick={() => {
                      setActiveTab('history')
                      setHomeView('submitted')
                      setNavigationSource('history')
                    }}
                    className="flex items-center text-blue-600 gap-3 w-full text-left hover:bg-blue-50 p-2 rounded transition-colors"
                  >
                    <span className="w-[20px] h-[20px] rounded-full bg-transparent "></span>
                    <span className="text-32R">正在處理</span>
                    <span className="text-32R">({stats.submitted})</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('history')
                      setHomeView('underReview')
                      setNavigationSource('history')
                    }}
                    className="flex items-center gap-3 w-full text-left hover:bg-gray-50 p-2 rounded transition-colors"
                  >
                    <span className="w-[20px] h-[20px] rounded-full bg-transparent "></span>
                    <span className="text-gray-600 text-32R">審稿中</span>
                    <span className="text-gray-800 text-32R">
                      ({stats.underReview})
                    </span>
                  </button>
                </div>
              </div>

              <div className=" bg-white rounded-lg p-6 md:p-[48px]">
                <h4 className="text-40M text-[#00182C] mb-[24px]">已完成</h4>
                <div className="space-y-2 p-[24px]">
                  <button
                    onClick={() => {
                      setActiveTab('completed')
                      setHomeView('accepted')
                      setNavigationSource('home')
                    }}
                    className="flex items-center text-blue-600 gap-3 w-full text-left hover:bg-blue-50 p-2 rounded transition-colors"
                  >
                    <span className="w-[20px] h-[20px] rounded-full bg-transparent "></span>
                    <span className="text-32R">已接受</span>
                    <span className="text-32R">({stats.accepted})</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('completed')
                      setHomeView('rejected')
                      setNavigationSource('home')
                    }}
                    className="flex items-center text-blue-600 gap-3 w-full text-left hover:bg-blue-50 p-2 rounded transition-colors"
                  >
                    <span className="w-[20px] h-[20px] rounded-full bg-transparent "></span>
                    <span className="text-32R">已拒絕</span>
                    <span className="text-32R">({stats.rejected})</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      case 'submissions':
        const renderSubmissionContent = () => {
          switch (submissionView) {
            case 'list':
              return (
                <div className="bg-white rounded-lg p-6 md:p-[48px]">
                  <h3 className="text-xl md:text-40M font-semibold text-[#00182C] mb-[24px]">
                    投稿列表
                  </h3>
                  <div className="space-y-3 p-[24px]">
                    <div className="flex items-center gap-3 p-2">
                      <span className="w-[20px] h-[20px] rounded-full bg-transparent "></span>
                      <span className="text-primary text-32R">提交新稿件</span>
                    </div>
                    <button
                      onClick={() => setSubmissionView('drafts')}
                      className="flex items-center gap-3 w-full text-left p-2 hover:bg-gray-50  rounded"
                    >
                      <span className="w-[20px] h-[20px] rounded-full bg-primary "></span>
                      <span className="text-gray-600 text-32R">草稿狀態</span>
                      <span className="text-gray-800 text-32R">
                        ({stats.draft})
                      </span>
                    </button>
                    <button
                      onClick={() => setSubmissionView('revisions')}
                      className="flex items-center gap-3 text-orange-600 w-full text-left p-2 hover:bg-orange-50 rounded transition-colors"
                    >
                      <span className="w-[20px] h-[20px] rounded-full bg-transparent "></span>
                      <span className="text-32R">草稿修訂</span>
                      <span className="text-32R">({revisionCount})</span>
                    </button>
                  </div>
                </div>
              )

            case 'drafts':
              return (
                <div className="space-y-8 lg:space-y-14">
                  <section className="bg-white rounded-xl shadow-sm">
                    <header className="px-[48px] py-[40px]">
                      <h3 className="text-[32px] md:text-[40px] font-medium text-[#00182C]">
                        草稿列表
                      </h3>
                    </header>

                    <div className="border-t border-gray-200 ">
                      <div className="overflow-x-auto">
                        <table
                          className="w-full table-auto border-collapse"
                          aria-label="草稿清單"
                        >
                          <thead className="bg-white border-y border-gray-200  text-gray-700">
                            <tr>
                              <th
                                scope="col"
                                className=" px-[48px] py-[24px] text-left text-24M font-medium"
                              >
                                標題
                              </th>
                              <th
                                scope="col"
                                className="w-40 px-4 py-[24px] text-left text-24M font-medium"
                              >
                                建立日期
                              </th>
                              <th
                                scope="col"
                                className="w-80 px-4 py-[24px] text-left text-24M font-medium"
                              >
                                操作
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-200 ">
                            {loading ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-[60px] text-center text-gray-500"
                                >
                                  載入中...
                                </td>
                              </tr>
                            ) : error ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-[60px] text-center text-red-500"
                                >
                                  載入失敗: {error}
                                </td>
                              </tr>
                            ) : drafts.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-[60px] text-center text-gray-500"
                                >
                                  目前沒有草稿
                                </td>
                              </tr>
                            ) : (
                              drafts.map(d => (
                                <tr key={d.id} className="hover:bg-gray-50">
                                  <td className="px-[48px] py-[40px] align-middle">
                                    <p className="text-[#00182C] leading-relaxed break-words text-24R">
                                      {d.title}
                                    </p>
                                  </td>

                                  <td className="w-40 px-4 py-[60px] align-middle text-gray-500 tabular-nums text-24R">
                                    {d.date}
                                  </td>

                                  <td className="w-80 px-4 py-[54.5px] align-middle">
                                    <div className="flex gap-3">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          loadDraftForEdit(d.submission)
                                        }
                                        className="inline-flex items-center rounded-md border border-gray-300 px-[24px] py-[8px]  text-gray-700 hover:bg-gray-50 text-24R"
                                      >
                                        編輯
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => viewDraft(d.submission)}
                                        className="inline-flex items-center rounded-md border border-gray-300 px-[24px] py-[8px]  text-gray-700 hover:bg-gray-50 text-24R"
                                      >
                                        查看
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          deleteDraftById(d.submission)
                                        }
                                        className="inline-flex items-center rounded-md border border-red-300 px-[24px] py-[8px]  text-red-600 hover:bg-red-50 text-24R"
                                      >
                                        刪除
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                </div>
              )

            case 'revisions':
              const revisions = submissions
                .filter(s => s.status === 'REVISION_REQUIRED')
                .map((submission, index) => ({
                  id: submission.id,
                  no:
                    formatSubmissionNumber(submission),
                  title: submission.title,
                  date: new Date(submission.updatedAt).toLocaleDateString(
                    'zh-TW'
                  ),
                  submission,
                }))

              return (
                <div className="space-y-8 lg:space-y-14">
                  <section className="bg-white rounded-xl shadow-sm">
                    <header className="px-[48px] py-[40px]">
                      <h3 className="text-[32px] md:text-[40px] font-medium text-[#00182C]">
                        草稿修訂列表
                      </h3>
                    </header>

                    <div className="border-t border-gray-200 ">
                      <div className="overflow-x-auto">
                        <table
                          className="w-full table-auto border-collapse"
                          aria-label="修訂清單"
                        >
                          <thead className="bg-white border-y border-gray-200  text-gray-700">
                            <tr>
                              <th
                                scope="col"
                                className="w-32 px-[48px] py-[24px] text-left text-24M font-medium"
                              >
                                編號
                              </th>
                              <th
                                scope="col"
                                className=" px-[48px] py-[24px] text-left text-24M font-medium"
                              >
                                標題
                              </th>
                              <th
                                scope="col"
                                className="w-40 px-4 py-[24px] text-left text-24M font-medium"
                              >
                                修訂日期
                              </th>
                              <th
                                scope="col"
                                className="w-80 px-4 py-[24px] text-left text-24M font-medium"
                              >
                                操作
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-200 ">
                            {loading ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-[60px] text-center text-gray-500"
                                >
                                  載入中...
                                </td>
                              </tr>
                            ) : error ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-[60px] text-center text-red-500"
                                >
                                  載入失敗: {error}
                                </td>
                              </tr>
                            ) : revisions.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-[60px] text-center text-gray-500"
                                >
                                  目前沒有需要修訂的稿件
                                </td>
                              </tr>
                            ) : (
                              revisions.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50">
                                  <td className="px-[48px] py-[40px] align-middle">
                                    <p className="text-[#00182C] font-medium text-24R">
                                      {r.no}
                                    </p>
                                  </td>

                                  <td className="px-[48px] py-[40px] align-middle">
                                    <p className="text-[#00182C] leading-relaxed break-words text-24R">
                                      {r.title}
                                    </p>
                                  </td>

                                  <td className="w-40 px-4 py-[60px] align-middle text-gray-500 tabular-nums text-24R">
                                    {r.date}
                                  </td>

                                  <td className="w-80 px-4 py-[54.5px] align-middle">
                                    <div className="flex gap-3">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          loadDraftForEdit(r.submission)
                                        }
                                        className="inline-flex items-center rounded-md border border-gray-300 px-[24px] py-[8px]  text-gray-700 hover:bg-gray-50 text-24R"
                                      >
                                        修訂
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => viewDraft(r.submission)}
                                        className="inline-flex items-center rounded-md border border-gray-300 px-[24px] py-[8px]  text-gray-700 hover:bg-gray-50 text-24R"
                                      >
                                        查看
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                </div>
              )

            default:
              return null
          }
        }

        const getBreadcrumbItems = () => {
          const items = [
            {
              label: '投稿列表',
              onClick: () => setSubmissionView('list'),
              active: submissionView === 'list',
            },
          ]

          if (submissionView === 'drafts') {
            items.push({
              label: '草稿狀態',
              onClick: () => {},
              active: true,
            })
          }

          if (submissionView === 'revisions') {
            items.push({
              label: '草稿修訂',
              onClick: () => {},
              active: true,
            })
          }

          return items
        }

        return (
          <div className="space-y-8 lg:space-y-[56px]">
            <div className={`${submissionView === 'list' ? '' : 'hidden'}`}>
              <h1 className="text-3xl md:text-[64px] font-medium text-[#00182C] leading-tight">
                投稿列表
              </h1>
            </div>

            <div className={`${submissionView === 'list' ? 'hidden' : ''}`}>
              <Breadcrumb items={getBreadcrumbItems()} />
            </div>

            {renderSubmissionContent()}
          </div>
        )
      case 'history':
        if (homeView === 'submitted') {
          return renderSubmittedView()
        } else if (homeView === 'underReview') {
          return renderUnderReviewView()
        }
        return (
          <div className="space-y-8 lg:space-y-[56px]">
            <div>
              <h1 className="text-3xl md:text-[64px] font-medium text-[#00182C] leading-tight">
                待處理中
              </h1>
            </div>

            <div className="bg-white rounded-lg p-6 md:p-[48px]">
              <h3 className="text-40M  text-[#00182C] mb-[24px]">待處理中</h3>

              <div className="space-y-4">
                {loading ? (
                  <div className="text-center text-gray-500 py-8">
                    載入中...
                  </div>
                ) : error ? (
                  <div className="text-center text-red-500 py-8">
                    載入失敗: {error}
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    目前沒有投稿歷史
                  </div>
                ) : (
                  // 按年度分組顯示投稿歷史
                  <div className="space-y-2 p-[24px]">
                    <button
                      onClick={() => {
                        setHomeView('submitted')
                        setNavigationSource('history')
                      }}
                      className="flex items-center text-blue-600 gap-3 w-full text-left hover:bg-blue-50 p-2 rounded transition-colors"
                    >
                      <span className="w-[20px] h-[20px] rounded-full bg-transparent "></span>
                      <span className="text-32R">正在處理</span>
                      <span className="text-32R">({stats.submitted})</span>
                    </button>
                    <button
                      onClick={() => {
                        setHomeView('underReview')
                        setNavigationSource('history')
                      }}
                      className="flex items-center gap-3 w-full text-left hover:bg-gray-50 p-2 rounded transition-colors"
                    >
                      <span className="w-[20px] h-[20px] rounded-full bg-transparent "></span>
                      <span className="text-gray-600 text-32R">審稿中</span>
                      <span className="text-gray-800 text-32R">
                        ({stats.underReview})
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      case 'completed':
        if (homeView === 'accepted') {
          return renderAcceptedView()
        } else if (homeView === 'rejected') {
          return renderRejectedView()
        }
        return (
          <div className="space-y-8 lg:space-y-14">
            <div>
              <h1 className="text-3xl md:text-[64px] font-medium text-[#00182C] leading-tight">
                已完成
              </h1>
            </div>

            <div className="bg-white rounded-lg p-6 md:p-[48px]">
              <h3 className="text-xl font-semibold text-[#00182C] mb-6">
                已完成的投稿
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                  <div className="col-span-full text-center text-gray-500 py-8">
                    載入中...
                  </div>
                ) : error ? (
                  <div className="col-span-full text-center text-red-500 py-8">
                    載入失敗: {error}
                  </div>
                ) : submissions.filter(
                    s => s.status === 'ACCEPTED' || s.status === 'REJECTED'
                  ).length === 0 ? (
                  <div className="col-span-full text-center text-gray-500 py-8">
                    目前沒有已完成的投稿
                  </div>
                ) : (
                  submissions
                    .filter(
                      s => s.status === 'ACCEPTED' || s.status === 'REJECTED'
                    )
                    .map(submission => (
                      <div
                        key={submission.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-[#00182C]">
                            {submission.title}
                          </h4>
                          {submission.status === 'ACCEPTED' ? (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                              已接受
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                              已拒絕
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          完成日期:{' '}
                          {new Date(submission.updatedAt).toLocaleDateString(
                            'zh-TW'
                          )}
                        </p>
                        {submission.decisions &&
                        submission.decisions.length > 0 ? (
                          <p className="text-xs text-gray-500">
                            決議: {submission.decisions[0].note || '無額外說明'}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">
                            軌道:{' '}
                            {conference?.tracks[submission.track] ||
                              submission.track}
                          </p>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )
      case 'submission':
        const renderStepContent = () => {
          switch (currentStep) {
            case 1:
              return (
                <div className="space-y-[56px]">
                  <div>
                    <h1 className="text-3xl md:text-[64px] font-medium text-[#00182C] leading-tight">
                      <span className="text-[#3B5FB9]">步驟一：</span>
                      論文類型與會議子題
                    </h1>
                  </div>
                  {/* 論文類型 */}
                  <div className="bg-white rounded-lg ">
                    <label className="block text-40M font-medium text-[#00182C] px-[48px] py-[40px]">
                      論文類型
                    </label>
                    <hr className="border-gray-200" />
                    <div className="relative p-[48px]">
                      <select
                        value={submissionData.paperType}
                        onChange={e =>
                          setSubmissionData(prev => ({
                            ...prev,
                            paperType: e.target.value,
                          }))
                        }
                        className="w-full p-4 pr-12 border border-gray-300 rounded-lg appearance-none bg-white text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B5FB9] focus:border-[#3B5FB9] transition-colors"
                      >
                        <option value="">選擇論文類型</option>
                        {PAPER_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      {errors.paperType && (
                        <p className="mt-2 text-sm text-red-600">
                          {errors.paperType}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 會議子題 */}
                  <div className="bg-white rounded-lg">
                    <label className="block text-40M font-medium text-[#00182C] px-[48px] py-[40px]">
                      會議子題
                    </label>
                    <hr className="border-gray-200" />
                    <div className="relative p-[48px]">
                      <select
                        value={submissionData.conferenceSubject}
                        onChange={e =>
                          setSubmissionData(prev => ({
                            ...prev,
                            conferenceSubject: e.target.value,
                          }))
                        }
                        className="w-full p-4 pr-12 border border-gray-300 rounded-lg appearance-none bg-white text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B5FB9] focus:border-[#3B5FB9] transition-colors"
                      >
                        <option value="">選擇會議子題</option>
                        {CONFERENCE_SUBJECTS.map(subject => (
                          <option key={subject.value} value={subject.value}>
                            {subject.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                        <svg
                          className="w-5 h-5 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      {errors.conferenceSubject && (
                        <p className="mt-2 text-sm text-red-600">
                          {errors.conferenceSubject}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )

            case 2:
              return (
                <div className="space-y-[56px]">
                  <div>
                    <h1 className="text-3xl md:text-[64px] font-medium text-[#00182C] leading-tight">
                      <span className="text-[#3B5FB9]">步驟二：</span>
                      標題與摘要
                    </h1>
                  </div>
                  <div className="bg-white rounded-lg">
                    <label className="block text-40M font-medium text-[#00182C] px-[48px] py-[40px]">
                      論文標題
                    </label>
                    <hr className="border-gray-200" />
                    <div className="relative p-[48px]">
                      <input
                        type="text"
                        value={submissionData.title}
                        onChange={e =>
                          setSubmissionData(prev => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5FB9] focus:border-transparent"
                        placeholder="請輸入論文標題"
                      />
                      {errors.title && (
                        <p className="mt-2 text-sm text-red-600">
                          {errors.title}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg">
                    <label className="block text-40M font-medium text-[#00182C] px-[48px] py-[40px]">
                      摘要（250字以內）
                    </label>
                    <hr className="border-gray-200" />
                    <div className="relative p-[48px]">
                      <textarea
                        value={submissionData.abstract}
                        onChange={e =>
                          setSubmissionData(prev => ({
                            ...prev,
                            abstract: e.target.value,
                          }))
                        }
                        rows={8}
                        className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5FB9] focus:border-transparent resize-none"
                        placeholder="請輸入論文摘要（建議300-500字）"
                      />
                      {errors.abstract && (
                        <p className="mt-2 text-sm text-red-600">
                          {errors.abstract}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg">
                    <label className="block text-40M font-medium text-[#00182C] px-[48px] py-[40px]">
                      關鍵詞
                    </label>
                    <hr className="border-gray-200" />
                    <div className="relative p-[48px]">
                      <input
                        type="text"
                        value={submissionData.keywords}
                        onChange={e =>
                          setSubmissionData(prev => ({
                            ...prev,
                            keywords: e.target.value,
                          }))
                        }
                        className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5FB9] focus:border-transparent"
                        placeholder="請輸入 3 至 5 組核心關鍵字，使用中文撰寫並以半形逗號（,）分隔"
                      />
                      {errors.keywords && (
                        <p className="mt-2 text-sm text-red-600">
                          {errors.keywords}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )

            case 3:
              return (
                <div className="space-y-[56px]">
                  <div>
                    <h1 className="text-3xl md:text-[64px] font-medium text-[#00182C] leading-tight">
                      <span className="text-[#3B5FB9]">步驟三：</span>
                      上傳稿件
                    </h1>
                  </div>
                  <div className="space-y-[50px]">
                    <div className="bg-white rounded-lg">
                      <label className="block text-40M font-medium text-[#00182C] px-[48px] py-[40px]">
                        稿件管理
                      </label>
                      <hr className="border-gray-200" />
                      <div className="relative">
                        <table className="w-full border-collapse text-left">
                          <thead>
                            <tr className="border-b border-gray-200 text-[#00182C] ">
                              <th className="px-[30px] py-[24px] text-24M">
                                編號
                              </th>
                              <th className="px-[30px] py-[24px] text-24M">
                                檔案
                              </th>
                              <th className="px-[30px] py-[24px] text-24M">
                                類別
                              </th>
                              <th className="px-[30px] py-[24px] text-24M">
                                上傳日期
                              </th>
                              <th className="px-[30px] py-[24px] text-24M">
                                上傳者
                              </th>
                              <th className="px-[30px] py-[24px] text-24M">
                                操作
                              </th>
                            </tr>
                          </thead>
                          <tbody className="text-gray-700">
                            {Object.entries(uploadedFiles)
                              .filter(([fileType, fileInfo]) => fileInfo && fileInfo.id && fileInfo.originalName)
                              .map(([fileType, fileInfo], index) => (
                              <tr key={fileType} className="border-b border-gray-100">
                                <td className="px-[30px] py-[60px] text-sm w-24">{index + 1}</td>
                                <td className="px-[48px] py-[62px] text-blue-600 underline cursor-pointer text-sm"
                                    onClick={() => downloadFile(fileInfo.id, fileInfo.originalName)}>
                                  {fileInfo.originalName}
                                  <div className="text-sm text-gray-500">
                                    {Math.round(fileInfo.size / 1024)}KB
                                  </div>
                                </td>
                                <td className="px-[30px] py-[60px] text-sm">
                                  {fileType === 'manuscriptFile' ? '匿名稿件' : '標題頁面'}
                                </td>
                                <td className="px-[30px] py-[60px] text-sm">
                                  {new Date().toLocaleString('zh-TW')}
                                </td>
                                <td className="px-[30px] py-[60px] text-sm">
                                  {user?.email || ''}
                                </td>
                                <td className="px-[30px] py-[60px] text-sm">
                                  <button 
                                    onClick={() => {
                                      const fileName = fileInfo.originalName
                                      const fileTypeDisplay = fileType === 'manuscriptFile' ? '匿名稿件' : '標題頁面'
                                      
                                      if (confirm(`確定要刪除「${fileName}」(${fileTypeDisplay})嗎？刪除後可重新上傳新的檔案。`)) {
                                        // 調用API實際刪除檔案
                                        const deleteFile = async () => {
                                          try {
                                            const response = await fetch(`/api/submissions/files/${fileInfo.id}`, {
                                              method: 'DELETE'
                                            })
                                            
                                            if (!response.ok) {
                                              const errorData = await response.json()
                                              throw new Error(errorData.error || '檔案刪除失敗')
                                            }
                                            
                                            // 清除 uploadedFiles 狀態
                                            const newUploadedFiles = { ...uploadedFiles }
                                            delete newUploadedFiles[fileType as keyof typeof uploadedFiles]
                                            setUploadedFiles(newUploadedFiles)
                                            
                                            // 同時清除 submissionData 中對應的檔案
                                            setSubmissionData(prev => ({
                                              ...prev,
                                              [fileType === 'manuscriptFile' ? 'manuscriptFile' : 'titlePageFile']: null
                                            }))

                                            // 立即更新 localStorage，清除被刪除檔案的資訊
                                            const currentData = { ...submissionData }
                                            const updatedData = {
                                              ...currentData,
                                              [fileType === 'manuscriptFile' ? 'manuscriptFile' : 'titlePageFile']: null,
                                              // 更新檔案資訊
                                              [fileType === 'manuscriptFile' ? 'manuscriptFileInfo' : 'titlePageFileInfo']: null,
                                              draftId: currentSubmissionId || (localStorage.getItem('submissionDraft') ? JSON.parse(localStorage.getItem('submissionDraft')!).draftId : undefined)
                                            }
                                            
                                            localStorage.setItem('submissionDraft', JSON.stringify(updatedData))
                                            
                                            alert(`檔案「${fileName}」已成功刪除`)
                                            
                                            // 重新載入submissions列表以獲取最新狀態
                                            await refetch()
                                            
                                          } catch (error) {
                                            alert('檔案刪除失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
                                          }
                                        }
                                        
                                        deleteFile()
                                      }
                                    }}
                                    className="text-red-500 border border-red-300 rounded-md px-3 py-1 hover:bg-red-50"
                                  >
                                    刪除
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {Object.entries(uploadedFiles).filter(([fileType, fileInfo]) => fileInfo && fileInfo.id && fileInfo.originalName).length === 0 && (
                              <tr className="border-b border-gray-100">
                                <td colSpan={6} className="px-[30px] py-[60px] text-center text-sm text-gray-500">
                                  尚未上傳任何檔案
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg">
                      <label className="block text-40M font-medium text-[#00182C] px-[48px] py-[40px]">
                        上傳稿件
                      </label>
                      <hr className="border-gray-200" />
                      
                      {/* 檔案已存在提示 */}
                      {((uploadedFiles.manuscriptFile && uploadedFiles.manuscriptFile.originalName) || 
                        (uploadedFiles.titlePageFile && uploadedFiles.titlePageFile.originalName)) && (
                        <div className="p-6 bg-blue-50 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-blue-800 font-medium">部分稿件已上傳</p>
                              <p className="text-blue-600 text-sm">
                                已上傳：
                                {uploadedFiles.manuscriptFile && uploadedFiles.manuscriptFile.originalName && ' 匿名稿件'}
                                {uploadedFiles.manuscriptFile && uploadedFiles.manuscriptFile.originalName && 
                                 uploadedFiles.titlePageFile && uploadedFiles.titlePageFile.originalName && '、'}
                                {uploadedFiles.titlePageFile && uploadedFiles.titlePageFile.originalName && ' 標題頁面'}
                                。如需重新上傳特定檔案，請在「稿件管理」區塊刪除對應檔案。
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="">
                        {/* 表頭：選擇 / 類別 */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="grid grid-cols-12 text-[#00182C] border-b border-gray-200 bg-white">
                            <div className="col-span-6 py-4 px-6 font-medium">
                              選擇
                            </div>
                            <div className="col-span-6 py-4 px-6 font-medium">
                              類別
                            </div>
                          </div>

                          {/* 匿名稿件上傳 */}
                          <div className={`grid grid-cols-12 items-center border-b border-gray-200 ${uploadedFiles.manuscriptFile ? 'bg-green-50' : ''}`}>
                            <div className="col-span-6 py-5 px-6 flex items-center gap-3 min-w-0">
                              {uploadedFiles.manuscriptFile ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <span className="text-sm text-green-700 font-medium">已上傳</span>
                                </div>
                              ) : (
                                <>
                                  <label
                                    htmlFor="manuscript-upload"
                                    className="px-4 py-2 bg-gray-100 border border-gray-300 rounded text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                                  >
                                    選擇檔案
                                  </label>
                                  <input
                                    id="manuscript-upload"
                                    type="file"
                                    accept=".doc,.docx,.pdf"
                                    onChange={handleManuscriptFileUpload}
                                    className="hidden"
                                  />
                                  <span className="text-sm text-gray-600 truncate max-w-[460px]">
                                    {submissionData.manuscriptFile
                                      ? submissionData.manuscriptFile.name
                                      : '尚未選擇檔案'}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="col-span-6 py-5 px-6 text-[#00182C]">
                              匿名稿件
                            </div>
                            {errors.manuscriptFile && (
                              <div className="col-span-12 -mt-2 px-6 pb-4">
                                <p className="text-sm text-red-600">
                                  {errors.manuscriptFile}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* 標題頁面上傳 */}
                          <div className={`grid grid-cols-12 items-center ${uploadedFiles.titlePageFile ? 'bg-green-50' : ''}`}>
                            <div className="col-span-6 py-5 px-6 flex items-center gap-3 min-w-0">
                              {uploadedFiles.titlePageFile ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <span className="text-sm text-green-700 font-medium">已上傳</span>
                                </div>
                              ) : (
                                <>
                                  <label
                                    htmlFor="titlepage-upload"
                                    className="px-4 py-2 bg-gray-100 border border-gray-300 rounded text-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
                                  >
                                    選擇檔案
                                  </label>
                                  <input
                                    id="titlepage-upload"
                                    type="file"
                                    accept=".doc,.docx,.pdf"
                                    onChange={handleTitlePageFileUpload}
                                    className="hidden"
                                  />
                                  <span className="text-sm text-gray-600 truncate max-w-[460px]">
                                    {submissionData.titlePageFile
                                      ? submissionData.titlePageFile.name
                                      : '尚未選擇檔案'}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="col-span-6 py-5 px-6 text-[#00182C]">
                              標題頁面
                            </div>
                            {errors.titlePageFile && (
                              <div className="col-span-12 -mt-2 px-6 pb-4">
                                <p className="text-sm text-red-600">
                                  {errors.titlePageFile}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 注意事項 */}
                        <div className="p-[48px] rounded-lg">
                          <h3 className="text-base font-medium text-gray-900 mb-3">
                            注意事項：
                          </h3>
                          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                            <li>
                              接受 Word 格式檔案（.doc, .docx）或 PDF 檔案。Word
                              檔案將由系統自動轉換為 PDF 檔進行審查。
                            </li>
                            <li>
                              請確認匿名稿件中未包含作者姓名、服務單位、致謝詞，及任何顯示作者資訊的頁首或頁尾。
                            </li>
                            <li>
                              若為修訂稿再次投稿，請務必附上回覆審查意見文件（修訂說明），逐一回應各位審查委員的意見。
                            </li>
                          </ol>
                          {/* 主行動按鈕 */}
                          <div className="flex justify-center mt-[48px]">
                            <button
                              type="button"
                              onClick={uploadFiles}
                              disabled={
                                (!submissionData.manuscriptFile && !uploadedFiles.manuscriptFile) ||
                                (!submissionData.titlePageFile && !uploadedFiles.titlePageFile) ||
                                uploadingFiles
                              }
                              className="w-full sm:w-[320px] h-12 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                            >
                              {uploadingFiles ? '上傳中...' : 
                               (submissionData.manuscriptFile && !uploadedFiles.manuscriptFile) || 
                               (submissionData.titlePageFile && !uploadedFiles.titlePageFile) 
                                 ? '上傳選擇檔案' 
                                 : '請先選擇檔案'}
                            </button>
                          </div>
                          
                          {/* 顯示上傳錯誤 */}
                          {errors.upload && (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-600">{errors.upload}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )

            case 4:
              return (
                <div className="space-y-[56px]">
                  <div>
                    <h1 className="text-3xl md:text-[64px] font-medium text-[#00182C] leading-tight">
                      <span className="text-[#3B5FB9]">步驟四：</span>
                      作者
                    </h1>
                  </div>
                  <div className="bg-white rounded-lg">
                    {/* 標題列 */}
                    <div className="flex justify-between items-center px-[48px] py-[40px]">
                      <h3 className="text-40M font-medium text-[#00182C]">
                        作者列表
                      </h3>
                      <button
                        type="button"
                        onClick={addAuthor}
                        className="flex items-center px-4 py-2 bg-[#3B5FB9] text-white rounded-lg hover:bg-[#2a4a99] transition-colors"
                      >
                        <span className="mr-2 text-lg">＋</span> 新增作者
                      </button>
                    </div>
                    <hr className="border-gray-200" />

                    {/* 表格 */}
                    <div>
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-gray-200 text-[#00182C]">
                            <th className="py-3 px-4 w-20">作者序</th>
                            <th className="py-3 px-4 w-24">通訊作者</th>
                            <th className="py-3 px-4">電子郵件</th>
                            <th className="py-3 px-4">作者</th>
                            <th className="py-3 px-4">操作</th>
                            <th className="py-3 px-4 w-24">排序</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700">
                          {submissionData.authors.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-[30px] py-[60px] text-center text-sm text-gray-500">
                                沒有
                              </td>
                            </tr>
                          ) : (

                          submissionData.authors.map((author, index) => (
                            <tr
                              key={index}
                              className={
                                index !== submissionData.authors.length - 1
                                  ? 'border-b border-gray-100'
                                  : ''
                              }
                            >
                              {/* 作者序 */}
                              <td className="py-4 px-4">{index + 1}</td>

                              {/* 通訊作者 */}
                              <td className="py-4 px-4">
                                <input
                                  type="radio"
                                  name="correspondingAuthor"
                                  checked={!!author.isCorresponding}
                                  onChange={() => setCorresponding(index)}
                                  className="w-4 h-4 text-[#3B5FB9] border-gray-300 focus:ring-[#3B5FB9]"
                                />
                              </td>

                              {/* 電子郵件 */}
                              <td className="py-4 px-4">
                                {author.email || '-'}
                              </td>

                              {/* 作者（姓名 + 機構） */}
                              <td className="py-4 px-4">
                                <div>{author.name || '-'}</div>
                                <div className="text-sm text-gray-500">
                                  {author.institution || '-'}
                                </div>
                              </td>

                              {/* 操作 */}
                              <td className="py-4 px-4 space-x-2">
                                <button
                                  type="button"
                                  onClick={() => editAuthor(index)}
                                  className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                  編輯
                                </button>
                                {submissionData.authors.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeAuthor(index)}
                                    className="px-3 py-1 border border-red-300 text-red-500 rounded-md hover:bg-red-50"
                                  >
                                    刪除
                                  </button>
                                )}
                              </td>

                              {/* 排序 */}
                              <td className="py-4 px-4 space-x-2">
                                <button
                                  type="button"
                                  onClick={() => moveAuthor(index, -1)}
                                  disabled={index === 0}
                                  className="p-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
                                  aria-label="上移"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveAuthor(index, +1)}
                                  disabled={
                                    index === submissionData.authors.length - 1
                                  }
                                  className="p-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
                                  aria-label="下移"
                                >
                                  ↓
                                </button>
                              </td>
                            </tr>
                          ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )

            case 5:
              return (
                <div className="space-y-[56px]">
                  <div>
                    <h1 className="text-3xl md:text-[64px] font-medium text-[#00182C] leading-tight">
                      <span className="text-[#3B5FB9]">步驟五：</span>
                      作者聲明
                    </h1>
                  </div>

                  <div className="bg-white rounded-lg">
                    <h4 className="text-40M text-[#00182C] px-[48px] py-[40px]">
                      作者聲明
                    </h4>
                    <hr className="border-gray-200" />
                    <div className="space-y-[48px]  p-[48px]  rounded-lg">
                      <label className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={submissionData.agreements.originalWork}
                          onChange={e =>
                            setSubmissionData(prev => ({
                              ...prev,
                              agreements: {
                                ...prev.agreements,
                                originalWork: e.target.checked,
                              },
                            }))
                          }
                          className="mt-1 w-4 h-4 text-[#3B5FB9] rounded border-gray-300 focus:ring-[#3B5FB9] focus:ring-2"
                        />
                        <div>
                          <span className="text-red-500">*</span>
                          <span className="text-gray-900 ml-1">
                            本人／我們確認本稿件僅投稿於本研討會，未曾發表，亦未同時送審。
                          </span>
                        </div>
                      </label>
                      {errors.originalWork && (
                        <p className="text-sm text-red-600 ml-7">
                          {errors.originalWork}
                        </p>
                      )}

                      <label className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={
                            submissionData.agreements.noConflictOfInterest
                          }
                          onChange={e =>
                            setSubmissionData(prev => ({
                              ...prev,
                              agreements: {
                                ...prev.agreements,
                                noConflictOfInterest: e.target.checked,
                              },
                            }))
                          }
                          className="mt-1 w-4 h-4 text-[#3B5FB9] rounded border-gray-300 focus:ring-[#3B5FB9] focus:ring-2"
                        />
                        <div>
                          <span className="text-red-500">*</span>
                          <span className="text-gray-900 ml-1">
                            本人／我們確認本研究嚴格遵循研究倫理，包括必要時取得受試者知情同意，並完全遵守所在地法律與相關規定。
                          </span>
                        </div>
                      </label>
                      {errors.noConflictOfInterest && (
                        <p className="text-sm text-red-600 ml-7">
                          {errors.noConflictOfInterest}
                        </p>
                      )}

                      <label className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={submissionData.agreements.consentToPublish}
                          onChange={e =>
                            setSubmissionData(prev => ({
                              ...prev,
                              agreements: {
                                ...prev.agreements,
                                consentToPublish: e.target.checked,
                              },
                            }))
                          }
                          className="mt-1 w-4 h-4 text-[#3B5FB9] rounded border-gray-300 focus:ring-[#3B5FB9] focus:ring-2"
                        />
                        <div>
                          <span className="text-red-500">*</span>
                          <span className="text-gray-900 ml-1">
                            本人／我們確認已準備一份不含作者姓名、服務單位、致謝詞，以及任何含作者資訊之頁首頁尾的完整稿件，以供匿名審查使用。
                          </span>
                        </div>
                      </label>
                      {errors.consentToPublish && (
                        <p className="text-sm text-red-600 ml-7">
                          {errors.consentToPublish}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg">
                    <h4 className="text-40M text-[#00182C] px-[48px] py-[40px]">
                      著作權相關確認事項
                    </h4>
                    <hr className="border-gray-200" />
                    <div className="space-y-[48px] bg-white p-[48px] rounded-lg">
                      <div className="space-y-4">
                        <div>
                          <span className="text-red-500">*</span>
                          <span className="text-gray-900 ml-1">
                            您是否已取得所有稿件中使用之著作權素材的授權？
                          </span>

                          <div className="mt-3 space-x-6">
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                name="copyrightPermission"
                                value="yes"
                                checked={
                                  submissionData.copyrightPermission === 'yes'
                                }
                                onChange={e =>
                                  setSubmissionData(prev => ({
                                    ...prev,
                                    copyrightPermission: e.target.value,
                                  }))
                                }
                                className="w-4 h-4 text-[#3B5FB9] border-gray-300 focus:ring-[#3B5FB9] focus:ring-2"
                              />
                              <span className="ml-2 text-gray-900">是</span>
                            </label>
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                name="copyrightPermission"
                                value="no"
                                checked={
                                  submissionData.copyrightPermission === 'no'
                                }
                                onChange={e =>
                                  setSubmissionData(prev => ({
                                    ...prev,
                                    copyrightPermission: e.target.value,
                                  }))
                                }
                                className="w-4 h-4 text-[#3B5FB9] border-gray-300 focus:ring-[#3B5FB9] focus:ring-2"
                              />
                              <span className="ml-2 text-gray-900">否</span>
                            </label>
                          </div>
                          {errors.copyrightPermission && (
                            <p className="text-sm text-red-600 mt-2">
                              {errors.copyrightPermission}
                            </p>
                          )}
                        </div>

                        <div>
                          <span className="text-red-500">*</span>
                          <span className="text-gray-900 ml-1">
                            您是否已檢查稿件文法與拼字正確性，並確保格式完全符合
                            APA 引用格式與文獻格式？
                          </span>

                          <div className="mt-3 space-x-6">
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                name="formatCheck"
                                value="yes"
                                checked={submissionData.formatCheck === 'yes'}
                                onChange={e =>
                                  setSubmissionData(prev => ({
                                    ...prev,
                                    formatCheck: e.target.value,
                                  }))
                                }
                                className="w-4 h-4 text-[#3B5FB9] border-gray-300 focus:ring-[#3B5FB9] focus:ring-2"
                              />
                              <span className="ml-2 text-gray-900">是</span>
                            </label>
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                name="formatCheck"
                                value="no"
                                checked={submissionData.formatCheck === 'no'}
                                onChange={e =>
                                  setSubmissionData(prev => ({
                                    ...prev,
                                    formatCheck: e.target.value,
                                  }))
                                }
                                className="w-4 h-4 text-[#3B5FB9] border-gray-300 focus:ring-[#3B5FB9] focus:ring-2"
                              />
                              <span className="ml-2 text-gray-900">否</span>
                            </label>
                          </div>
                          {errors.formatCheck && (
                            <p className="text-sm text-red-600 mt-2">
                              {errors.formatCheck}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )

            case 6:
              return (
                <div className="space-y-[56px]">
                  <h1 className="text-3xl md:text-[64px] font-medium text-[#00182C] leading-tight">
                    <span className="text-[#3B5FB9]">步驟六：</span>
                    檢查並送出
                  </h1>
                  <hr className="border-gray-200" />
                  <div className="space-y-6">
                    {/* 步驟一：論文類型與會議子題 */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <h4 className="text-lg font-medium text-[#00182C]">
                            步驟一：論文類型與會議子題
                          </h4>
                        </div>
                        <button
                          onClick={() => setCurrentStep(1)}
                          className="px-4 py-2 bg-[#3B5FB9] text-white text-sm rounded-md hover:bg-[#2a4a99] transition-colors"
                        >
                          前往編輯
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div>
                              <span className="text-gray-600 block">項目</span>
                            </div>
                            <div className="py-2">
                              <span className="text-gray-900">論文類型</span>
                            </div>
                            <div className="py-2 border-t border-gray-100">
                              <span className="text-gray-900">會議子題</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-gray-600 block">內容</span>
                            </div>
                            <div className="py-2">
                              <span className="text-gray-900">
                                {PAPER_TYPES.find(
                                  t => t.value === submissionData.paperType
                                )?.label || ''}
                              </span>
                            </div>
                            <div className="py-2 border-t border-gray-100">
                              <span className="text-gray-900">
                                {CONFERENCE_SUBJECTS.find(
                                  s =>
                                    s.value === submissionData.conferenceSubject
                                )?.label || ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 步驟二：標題與摘要 */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <h4 className="text-lg font-medium text-[#00182C]">
                            步驟二：標題與摘要
                          </h4>
                        </div>
                        <button
                          onClick={() => setCurrentStep(2)}
                          className="px-4 py-2 bg-[#3B5FB9] text-white text-sm rounded-md hover:bg-[#2a4a99] transition-colors"
                        >
                          前往編輯
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div>
                              <span className="text-gray-600 block">項目</span>
                            </div>
                            <div className="py-2">
                              <span className="text-gray-900">標題</span>
                            </div>
                            <div className="py-2 border-t border-gray-100">
                              <span className="text-gray-900">摘要</span>
                            </div>
                            <div className="py-2 border-t border-gray-100">
                              <span className="text-gray-900">關鍵字</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-gray-600 block">內容</span>
                            </div>
                            <div className="py-2">
                              <span className="text-gray-900">
                                {submissionData.title || ''}
                              </span>
                            </div>
                            <div className="py-2 border-t border-gray-100">
                              <span className="text-gray-900">
                                {submissionData.abstract || ''}
                              </span>
                            </div>
                            <div className="py-2 border-t border-gray-100">
                              <span className="text-gray-900">
                                {submissionData.keywords || ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 步驟三：上傳稿件 */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <h4 className="text-lg font-medium text-[#00182C]">
                            步驟三：上傳稿件
                          </h4>
                        </div>
                        <button
                          onClick={() => setCurrentStep(3)}
                          className="px-4 py-2 bg-[#3B5FB9] text-white text-sm rounded-md hover:bg-[#2a4a99] transition-colors"
                        >
                          前往編輯
                        </button>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-2">
                            <div>
                              <span className="text-gray-600 block">項目</span>
                            </div>
                            <div className="py-2">
                              <span className="text-gray-900">匿名稿件</span>
                            </div>
                            <div className="py-2 border-t border-gray-100">
                              <span className="text-gray-900">標題頁面</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-gray-600 block">內容</span>
                            </div>
                            <div className="py-2">
                              <span className="text-gray-900">
                                {uploadedFiles.manuscriptFile?.originalName ||
                                  submissionData.manuscriptFile?.name ||
                                  '未上傳'}
                              </span>
                            </div>
                            <div className="py-2 border-t border-gray-100">
                              <span className="text-gray-900">
                                {uploadedFiles.titlePageFile?.originalName ||
                                  submissionData.titlePageFile?.name ||
                                  '未上傳'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 步驟四：作者 */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <h4 className="text-lg font-medium text-[#00182C]">
                            步驟四：作者
                          </h4>
                        </div>
                        <button
                          onClick={() => setCurrentStep(4)}
                          className="px-4 py-2 bg-[#3B5FB9] text-white text-sm rounded-md hover:bg-[#2a4a99] transition-colors"
                        >
                          前往編輯
                        </button>
                      </div>
                      <div className="p-0">
                        {submissionData.authors.length > 0 ? (
                          <div className="overflow-hidden">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b border-gray-200">
                                    項目
                                  </th>
                                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b border-gray-200">
                                    內容
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {submissionData.authors.map((author, index) => (
                                  <tr key={index} className="border-b border-gray-100 last:border-b-0">
                                    <td className="px-4 py-4 text-sm text-gray-900 font-medium bg-gray-50/50">
                                      作者{index + 1}
                                      {author.isCorresponding && (
                                        <div className="mt-1">
                                          <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                            通訊作者
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-900">
                                      <div className="space-y-1">
                                        <div className="font-medium">{author.name}</div>
                                        <div className="text-gray-600">{author.email}</div>
                                        <div className="text-gray-600">{author.institution}</div>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            尚未新增作者
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 步驟五：作者聲明 */}
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <h4 className="text-lg font-medium text-[#00182C]">
                            步驟五：作者聲明
                          </h4>
                        </div>
                        <button
                          onClick={() => setCurrentStep(5)}
                          className="px-4 py-2 bg-[#3B5FB9] text-white text-sm rounded-md hover:bg-[#2a4a99] transition-colors"
                        >
                          前往編輯
                        </button>
                      </div>
                      <div className="p-6 space-y-6">
                        {/* 作者聲明標題 */}
                        <div>
                          <h5 className="text-lg font-medium text-gray-900 mb-4">作者聲明</h5>
                          
                          {/* 聲明列表 */}
                          <div className="space-y-4">
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
                              <div
                                className={`w-5 h-5 mt-0.5 ${
                                  submissionData.agreements.originalWork
                                    ? 'bg-blue-600'
                                    : 'bg-gray-300'
                                } rounded flex items-center justify-center flex-shrink-0`}
                              >
                                {submissionData.agreements.originalWork && (
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>
                              <span className="text-gray-900 text-sm leading-relaxed">
                                本人／我們確認本稿件僅投稿於本研討會，未曾發表，亦未同時投送。
                              </span>
                            </div>
                            
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
                              <div
                                className={`w-5 h-5 mt-0.5 ${
                                  submissionData.agreements.noConflictOfInterest
                                    ? 'bg-blue-600'
                                    : 'bg-gray-300'
                                } rounded flex items-center justify-center flex-shrink-0`}
                              >
                                {submissionData.agreements.noConflictOfInterest && (
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>
                              <span className="text-gray-900 text-sm leading-relaxed">
                                本人／我們確認本研究恪遵循研究倫理，包括必要時取得受試者知情同意，並完全遵守所在地法律與相關規定。
                              </span>
                            </div>
                            
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
                              <div
                                className={`w-5 h-5 mt-0.5 ${
                                  submissionData.agreements.consentToPublish
                                    ? 'bg-blue-600'
                                    : 'bg-gray-300'
                                } rounded flex items-center justify-center flex-shrink-0`}
                              >
                                {submissionData.agreements.consentToPublish && (
                                  <svg
                                    className="w-3 h-3 text-white"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>
                              <span className="text-gray-900 text-sm leading-relaxed">
                                本人／我們確認已準備一份不含作者姓名、服務單位、致謝詞，以及任何可作者身分之資訊之完整稿件，以供各審查委員使用。
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 著作權相關確認事項 */}
                        <div className="border-t border-gray-200 pt-6">
                          <h5 className="text-lg font-medium text-gray-900 mb-4">著作權相關確認事項</h5>
                          
                          <div className="space-y-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <span className="text-red-500 text-sm">*</span>
                                <span className="text-gray-900 text-sm">
                                  本人／我們確認本稿件僅投稿於本研討會，未曾發表，亦未同時投送。
                                </span>
                              </div>
                              <div className="flex gap-4 ml-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    submissionData.copyrightPermission === 'yes' 
                                      ? 'border-blue-600 bg-blue-600' 
                                      : 'border-gray-300'
                                  }`}>
                                    {submissionData.copyrightPermission === 'yes' && (
                                      <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-900">是</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    submissionData.copyrightPermission === 'no' 
                                      ? 'border-blue-600 bg-blue-600' 
                                      : 'border-gray-300'
                                  }`}>
                                    {submissionData.copyrightPermission === 'no' && (
                                      <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-900">否</span>
                                </label>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <span className="text-red-500 text-sm">*</span>
                                <span className="text-gray-900 text-sm">
                                  您是否已檢查稿件文法與拼字正確性，並確保格式完全符合 APA 引用格式與文獻格式？
                                </span>
                              </div>
                              <div className="flex gap-4 ml-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    submissionData.formatCheck === 'yes' 
                                      ? 'border-blue-600 bg-blue-600' 
                                      : 'border-gray-300'
                                  }`}>
                                    {submissionData.formatCheck === 'yes' && (
                                      <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-900">是</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    submissionData.formatCheck === 'no' 
                                      ? 'border-blue-600 bg-blue-600' 
                                      : 'border-gray-300'
                                  }`}>
                                    {submissionData.formatCheck === 'no' && (
                                      <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-900">否</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )

            default:
              return null
          }
        }

        const steps = [
          { number: 1, title: '論文類型與會議子題' },
          { number: 2, title: '標題與摘要' },
          { number: 3, title: '上傳稿件' },
          { number: 4, title: '作者' },
          { number: 5, title: '作者聲明' },
          { number: 6, title: '檢查並送出' },
        ]

        return (
          <div className="space-y-8 lg:space-y-14">
            <div className="rounded-lg ">
              {/* Content */}
              <div className="mb-12">{renderStepContent()}</div>

              {/* Navigation */}
              <div className="flex justify-between items-center border-t border-gray-200">
                <div className="flex gap-3">
                  <button
                    onClick={saveDraft}
                    className="px-8 py-3 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    保存
                  </button>
                  
                  {currentStep > 1 && (
                    <button
                      onClick={prevStep}
                      className="px-8 py-3 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      上一步
                    </button>
                  )}
                </div>

                {currentStep < 6 ? (
                  <button
                    onClick={nextStep}
                    className="px-8 py-3 bg-[#3B5FB9] text-white rounded-lg hover:bg-[#2a4a99] transition-colors font-medium"
                  >
                    下一步
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !conference?.isActive}
                      className={`px-6 py-2 text-white rounded-lg transition-colors ${
                        isSubmitting
                          ? 'bg-gray-400 cursor-not-allowed'
                          : !conference?.isActive
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isSubmitting ? '提交中...' : !conference?.isActive ? '會議未開放' : '提交稿件'}
                    </button>
                    {!conference?.isActive && (
                      <p className="text-sm text-red-600 text-center">
                        此會議目前未開放投稿，請聯繫管理員或選擇其他開放的會議
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <ProtectedRoute requiredRoles={['AUTHOR']}>
      {/* Schema.org 結構化標記 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: '投稿作者首頁',
            description: '學術論文投稿管理系統 - 投稿作者專用首頁',
            applicationCategory: 'Academic Publishing',
            operatingSystem: 'Web Browser',
            author: {
              '@type': 'EducationalOrganization',
              name: '國立臺北教育大學課程與教學傳播科技研究所',
              url: 'https://www.ntue.edu.tw',
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'TW',
                addressLocality: '臺北市',
                addressRegion: '大安區',
                postalCode: '10671',
                streetAddress: '和平東路二段134號',
              },
            },
            mainEntity: {
              '@type': 'Person',
              name: user?.displayName || '投稿作者',
              jobTitle: '學術研究者',
            },
          }),
        }}
      />

      {/* 添加動畫樣式 */}
      <style jsx>{`
        @keyframes slideInFromTop {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="min-h-screen flex flex-col bg-white">
        {/* Header */}
        <Header currentPage="author" />

        {/* Error Display */}
        {(error || mutationError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mx-4 md:mx-[56px] mt-4">
            <div className="text-red-800">
              {error && <p>載入錯誤: {error}</p>}
              {mutationError && <p>操作錯誤: {mutationError}</p>}
            </div>
          </div>
        )}

        {/* Loading State */}
        {(loading || mutationLoading) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mx-4 md:mx-[56px] mt-4">
            <div className="text-blue-800">
              {loading && <p>載入中...</p>}
              {mutationLoading && <p>處理中...</p>}
            </div>
          </div>
        )}

        {/* 主要內容區域 */}
        <main className="flex-1 bg-gray-100 p-4 md:p-[56px]">
          {/* 身份欄位區域 */}
          <div className="mb-8 md:mb-[56px]">
            <div className="flex flex-col md:flex-row rounded-lg shadow-sm min-h-[132px]">
              {/* 左側：投稿作者身份標識 */}
              <div className="bg-[#3B5FB9] text-white px-6 md:ps-[48px] py-6 md:py-[32px] md:pe-[211px] flex items-center gap-4 md:gap-6">
                <div className="w-12 h-12 md:w-[64px] md:h-[64px]">
                  <PenTool className="w-full h-full text-white" />
                </div>
                <div>
                  <div className="text-sm md:text-28M opacity-90">
                    {user?.displayName}
                  </div>
                  <div className="text-lg md:text-28M font-medium">
                    投稿作者
                  </div>
                </div>
              </div>

              {/* 右側：研討會標題和控制項 */}
              <div className="relative z-[10] bg-white flex-1 px-6 md:px-[48px] py-6 md:py-[45px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-lg md:text-[28px] font-medium text-[#3B5FB9] leading-tight">
                    {(() => {
                      // 根據選中的會議ID找到對應的會議標題
                      const selectedConference = availableYears.find(conf => conf.id === selectedConferenceId)
                      return selectedConference?.label || conference?.title || `${year} AI時代課程教學與傳播科技研討會`
                    })()}
                  </h1>
                </div>
                <div className="relative z-[70]">
                  <YearDropdown
                    value={year}
                    selectedId={selectedConferenceId}
                    onChange={(conferenceId, selectedYear) => {
                      setSelectedConferenceId(conferenceId)
                      setYear(selectedYear)
                    }}
                    options={availableYears}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 主要內容佈局 */}
          <div className="pb-8 md:pb-[56px]">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-14">
              {/* 左側邊欄 */}
              <aside className="w-full lg:w-[466px]">
                <div className="bg-white rounded-lg p-6 md:p-[48px] min-h-[600px] lg:h-[1100px]">
                  <nav className="space-y-4 md:space-y-[32px]">
                    {/* 投稿管理 */}
                    <div>
                      <ul className="space-y-2 md:space-y-[16px]">
                        <li>
                          <button
                            onClick={() => {
                              setActiveTab('home')
                              setHomeView('overview')
                            }}
                            className={`w-full text-left px-4 py-3 md:px-[24px] md:py-[21px] text-lg md:text-28M transition-colors flex items-center gap-3 rounded-lg ${
                              activeTab === 'home'
                                ? 'bg-[#3B5FB920] text-black'
                                : 'text-[#00182C] hover:bg-[#3b5fb910]'
                            }`}
                          >
                            <Home className="w-6 h-6 md:w-[32px] md:h-[32px]" />
                            首頁
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => {
                              setActiveTab('submissions')
                              setSubmissionView('list')
                              setHomeView('overview')
                            }}
                            className={`w-full text-left px-4 py-3 md:px-[24px] md:py-[21px] text-lg md:text-28M transition-colors flex items-center gap-3 rounded-lg ${
                              activeTab === 'submissions'
                                ? 'bg-[#3B5FB920] text-black'
                                : 'text-[#00182C] hover:bg-[#3b5fb910]'
                            }`}
                          >
                            <FileText className="w-6 h-6 md:w-[32px] md:h-[32px]" />
                            投稿列表
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => {
                              setActiveTab('history')
                              setHomeView('overview')
                              setNavigationSource('history')
                            }}
                            className={`w-full text-left px-4 py-3 md:px-[24px] md:py-[21px] text-lg md:text-28M transition-colors flex items-center gap-3 rounded-lg ${
                              activeTab === 'history'
                                ? 'bg-[#3B5FB920] text-black'
                                : 'text-[#00182C] hover:bg-[#3b5fb910]'
                            }`}
                          >
                            <Clock className="w-6 h-6 md:w-[32px] md:h-[32px]" />
                            待處理中
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => {
                              setActiveTab('completed')
                              setHomeView('overview')
                            }}
                            className={`w-full text-left px-4 py-3 md:px-[24px] md:py-[21px] text-lg md:text-28M transition-colors flex items-center gap-3 rounded-lg ${
                              activeTab === 'completed'
                                ? 'bg-[#3B5FB920] text-black'
                                : 'text-[#00182C] hover:bg-[#3b5fb910]'
                            }`}
                          >
                            <CheckCircle className="w-6 h-6 md:w-[32px] md:h-[32px]" />
                            已完成
                          </button>
                        </li>
                      </ul>
                    </div>
                    <div className="border-t border-[#00182C] opacity-20"></div>
                    <button
                      onClick={startNewSubmission}
                      className="w-full py-4 px-4 md:py-[24px] md:px-[24px] text-lg md:text-28M text-primary flex items-center justify-between gap-3 rounded-lg bg-white hover:bg-[#3b5fb910] transition-colors cursor-pointer"
                    >
                      提交新稿件
                      <Plus className="w-6 h-6 md:w-[32px] md:h-[32px]" />
                    </button>
                    {/* 步驟區塊 - 在投稿表單模式時顯示 */}
                    {activeTab === 'submission' && (
                      <div
                        className="flex flex-col gap-[16px] px-[24px] transition-all duration-300 ease-in-out transform opacity-100 translate-y-0"
                        style={{ animation: 'slideInFromTop 0.3s ease-in-out' }}
                      >
                        <button
                          onClick={() => goToStep(1)}
                          className={`flex items-center gap-[16px] w-full text-left px-2 py-1 rounded transition-colors ${
                            canGoToStep(1)
                              ? 'hover:bg-gray-50 cursor-pointer'
                              : 'cursor-not-allowed opacity-60'
                          }`}
                          disabled={!canGoToStep(1)}
                          style={{
                            animation:
                              'slideInFromTop 0.3s ease-in-out 0.1s both',
                          }}
                        >
                          <div
                            className={`w-[20px] h-[20px] rounded-full flex items-center justify-center ${
                              currentStep === 1
                                ? 'bg-primary'
                                : currentStep > 1
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                          >
                            {currentStep > 1 && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                          <div
                            className={`text-28R py-[6px] ${
                              currentStep === 1 ? 'font-medium' : ''
                            }`}
                          >
                            步驟一：
                            <span
                              className={
                                currentStep === 1
                                  ? 'text-primary font-medium'
                                  : 'text-primary'
                              }
                            >
                              類型與子題
                            </span>
                          </div>
                        </button>
                        <button
                          onClick={() => goToStep(2)}
                          className={`flex items-center gap-[16px] w-full text-left px-2 py-1 rounded transition-colors ${
                            canGoToStep(2)
                              ? 'hover:bg-gray-50 cursor-pointer'
                              : 'cursor-not-allowed opacity-60'
                          }`}
                          disabled={!canGoToStep(2)}
                          style={{
                            animation:
                              'slideInFromTop 0.3s ease-in-out 0.15s both',
                          }}
                        >
                          <div
                            className={`w-[20px] h-[20px] rounded-full flex items-center justify-center ${
                              currentStep === 2
                                ? 'bg-primary'
                                : currentStep > 2
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                          >
                            {currentStep > 2 && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                          <div
                            className={`text-28R py-[6px] ${
                              currentStep === 2 ? 'font-medium' : ''
                            }`}
                          >
                            步驟二：
                            <span
                              className={
                                currentStep === 2
                                  ? 'text-primary font-medium'
                                  : 'text-primary'
                              }
                            >
                              基本資料
                            </span>
                          </div>
                        </button>
                        <button
                          onClick={() => goToStep(3)}
                          className={`flex items-center gap-[16px] w-full text-left px-2 py-1 rounded transition-colors ${
                            canGoToStep(3)
                              ? 'hover:bg-gray-50 cursor-pointer'
                              : 'cursor-not-allowed opacity-60'
                          }`}
                          disabled={!canGoToStep(3)}
                          style={{
                            animation:
                              'slideInFromTop 0.3s ease-in-out 0.2s both',
                          }}
                        >
                          <div
                            className={`w-[20px] h-[20px] rounded-full flex items-center justify-center ${
                              currentStep === 3
                                ? 'bg-primary'
                                : currentStep > 3
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                          >
                            {currentStep > 3 && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                          <div
                            className={`text-28R py-[6px] ${
                              currentStep === 3 ? 'font-medium' : ''
                            }`}
                          >
                            步驟三：
                            <span
                              className={
                                currentStep === 3
                                  ? 'text-primary font-medium'
                                  : 'text-primary'
                              }
                            >
                              上傳檔案
                            </span>
                          </div>
                        </button>
                        <button
                          onClick={() => goToStep(4)}
                          className={`flex items-center gap-[16px] w-full text-left px-2 py-1 rounded transition-colors ${
                            canGoToStep(4)
                              ? 'hover:bg-gray-50 cursor-pointer'
                              : 'cursor-not-allowed opacity-60'
                          }`}
                          disabled={!canGoToStep(4)}
                          style={{
                            animation:
                              'slideInFromTop 0.3s ease-in-out 0.25s both',
                          }}
                        >
                          <div
                            className={`w-[20px] h-[20px] rounded-full flex items-center justify-center ${
                              currentStep === 4
                                ? 'bg-primary'
                                : currentStep > 4
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                          >
                            {currentStep > 4 && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                          <div
                            className={`text-28R py-[6px] ${
                              currentStep === 4 ? 'font-medium' : ''
                            }`}
                          >
                            步驟四：
                            <span
                              className={
                                currentStep === 4
                                  ? 'text-primary font-medium'
                                  : 'text-primary'
                              }
                            >
                              作者資訊
                            </span>
                          </div>
                        </button>
                        <button
                          onClick={() => goToStep(5)}
                          className={`flex items-center gap-[16px] w-full text-left px-2 py-1 rounded transition-colors ${
                            canGoToStep(5)
                              ? 'hover:bg-gray-50 cursor-pointer'
                              : 'cursor-not-allowed opacity-60'
                          }`}
                          disabled={!canGoToStep(5)}
                          style={{
                            animation:
                              'slideInFromTop 0.3s ease-in-out 0.3s both',
                          }}
                        >
                          <div
                            className={`w-[20px] h-[20px] rounded-full flex items-center justify-center ${
                              currentStep === 5
                                ? 'bg-primary'
                                : currentStep > 5
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                          >
                            {currentStep > 5 && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                          <div
                            className={`text-28R py-[6px] ${
                              currentStep === 5 ? 'font-medium' : ''
                            }`}
                          >
                            步驟五：
                            <span
                              className={
                                currentStep === 5
                                  ? 'text-primary font-medium'
                                  : 'text-primary'
                              }
                            >
                              作者聲明
                            </span>
                          </div>
                        </button>
                        <button
                          onClick={() => goToStep(6)}
                          className={`flex items-center gap-[16px] w-full text-left px-2 py-1 rounded transition-colors ${
                            canGoToStep(6)
                              ? 'hover:bg-gray-50 cursor-pointer'
                              : 'cursor-not-allowed opacity-60'
                          }`}
                          disabled={!canGoToStep(6)}
                          style={{
                            animation:
                              'slideInFromTop 0.3s ease-in-out 0.35s both',
                          }}
                        >
                          <div
                            className={`w-[20px] h-[20px] rounded-full flex items-center justify-center ${
                              currentStep === 6
                                ? 'bg-primary'
                                : currentStep > 6
                                ? 'bg-green-500'
                                : 'bg-gray-300'
                            }`}
                          >
                            {currentStep > 6 && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                          <div
                            className={`text-28R py-[6px] ${
                              currentStep === 6 ? 'font-medium' : ''
                            }`}
                          >
                            步驟六：
                            <span
                              className={
                                currentStep === 6
                                  ? 'text-primary font-medium'
                                  : 'text-primary'
                              }
                            >
                              確認提交
                            </span>
                          </div>
                        </button>
                      </div>
                    )}
                  </nav>
                </div>
              </aside>

              <section className="flex-1 min-h-[600px] lg:min-h-[1100px]">
                {renderTabContent()}
              </section>
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* 查看草稿模態框 */}
      {viewingDraft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-medium text-[#00182C]">
                  草稿詳情
                </h2>
                <button
                  onClick={closeDraftView}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 基本資訊 */}
              <div>
                <h3 className="text-lg font-medium text-[#00182C] mb-4">
                  基本資訊
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="font-medium text-gray-700">標題：</span>
                    <span className="text-gray-900">
                      {viewingDraft.title || '未填寫'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      會議軌道：
                    </span>
                    <span className="text-gray-900">
                      {conference?.tracks?.[viewingDraft.track] ||
                        viewingDraft.track ||
                        '未填寫'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">狀態：</span>
                    <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                      草稿
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      建立時間：
                    </span>
                    <span className="text-gray-900">
                      {new Date(viewingDraft.createdAt).toLocaleString('zh-TW')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      最後更新：
                    </span>
                    <span className="text-gray-900">
                      {new Date(viewingDraft.updatedAt).toLocaleString('zh-TW')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 摘要 */}
              <div>
                <h3 className="text-lg font-medium text-[#00182C] mb-4">
                  摘要
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {viewingDraft.abstract || '未填寫'}
                  </p>
                </div>
              </div>

              {/* 作者資訊 */}
              <div>
                <h3 className="text-lg font-medium text-[#00182C] mb-4">
                  作者資訊
                </h3>
                <div className="space-y-3">
                  {viewingDraft.authors && viewingDraft.authors.length > 0 ? (
                    viewingDraft.authors.map((author: any, index: number) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">
                            {author.name}
                          </span>
                          {author.isCorresponding && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              通訊作者
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            機構：
                            {author.affiliation ||
                              author.institution ||
                              '未填寫'}
                          </p>
                          <p>電子郵件：{author.email || '未填寫'}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-gray-500">
                      未填寫作者資訊
                    </div>
                  )}
                </div>
              </div>

              {/* 檔案資訊 */}
              <div>
                <h3 className="text-lg font-medium text-[#00182C] mb-4">
                  上傳檔案
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {viewingDraft.files && viewingDraft.files.length > 0 ? (
                    <div className="space-y-2">
                      {viewingDraft.files.map((file: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <span className="text-gray-900">
                            {file.originalName}
                          </span>
                          <span className="text-sm text-gray-500">
                            版本 {file.version}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">未上傳檔案</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={closeDraftView}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                關閉
              </button>
              <button
                onClick={() => {
                  loadDraftForEdit(viewingDraft)
                  closeDraftView()
                }}
                className="px-4 py-2 bg-[#3B5FB9] text-white rounded-lg hover:bg-[#2a4a99]"
              >
                編輯此草稿
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 作者模態視窗 */}
      {showAuthorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* 標題列 */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-[#00182C]">
                {modalMode === 'add' ? '新增作者' : '編輯作者'}
              </h3>
              <button
                onClick={handleModalCancel}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* 表單內容 */}
            <div className="p-6 space-y-4">
              {/* 電子郵件 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-red-500">*</span>電子郵件
                </label>
                <input
                  type="email"
                  placeholder="e-mail"
                  value={modalAuthorData.email}
                  onChange={(e) => setModalAuthorData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5FB9] focus:border-transparent"
                />
              </div>

              {/* 作者姓名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="text-red-500">*</span>作者
                </label>
                <input
                  type="text"
                  placeholder="姓名"
                  value={modalAuthorData.name}
                  onChange={(e) => setModalAuthorData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5FB9] focus:border-transparent"
                />
              </div>

              {/* 服務單位與職稱 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  服務單位與職稱
                </label>
                <input
                  type="text"
                  placeholder="服務單位與職稱"
                  value={modalAuthorData.institution}
                  onChange={(e) => setModalAuthorData(prev => ({ ...prev, institution: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B5FB9] focus:border-transparent"
                />
              </div>
            </div>

            {/* 按鈕列 */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleModalCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleModalSave}
                className="px-6 py-2 bg-[#3B5FB9] text-white rounded-lg hover:bg-[#2a4a99] transition-colors"
              >
                {modalMode === 'add' ? '新增' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}
