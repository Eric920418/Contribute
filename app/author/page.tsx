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

type MenuTab = 'home' | 'submissions' | 'history' | 'completed' | 'submission'
type SubmissionView = 'list' | 'drafts' | 'revisions'
type HomeView = 'overview' | 'submitted' | 'underReview' | 'accepted' | 'rejected'
type NavigationSource = 'home' | 'history'

export default function AuthorPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [year, setYear] = useState(2025)
  const [activeTab, setActiveTab] = useState<MenuTab>('home')
  const [submissionView, setSubmissionView] = useState<SubmissionView>('list')
  const [homeView, setHomeView] = useState<HomeView>('overview')
  const [navigationSource, setNavigationSource] = useState<NavigationSource>('home')
  
  // 使用真實資料
  const { submissions, stats, conference, loading, error, refetch } = useSubmissions(year)
  const { saveDraft: saveSubmissionDraft, submitSubmission, updateSubmission, deleteSubmission, loading: mutationLoading, error: mutationError } = useSubmissionMutations()
  const [currentStep, setCurrentStep] = useState(1)
  const [submissionData, setSubmissionData] = useState({
    paperType: '',
    conferenceSubject: '',
    title: '',
    abstract: '',
    keywords: '',
    file: null as File | null,
    authors: [
      {
        name: '',
        institution: '',
        email: '',
        isCorresponding: true
      }
    ],
    agreements: {
      originalWork: false,
      noConflictOfInterest: false,
      consentToPublish: false
    }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isEditingDraft, setIsEditingDraft] = useState(false)

  // 頁面載入時自動載入草稿
  useEffect(() => {
    loadDraft()
  }, [])

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
          file: null, // File 物件無法保存到 localStorage
          authors: draftData.authors && draftData.authors.length > 0 ? draftData.authors : [
            {
              name: '',
              institution: '',
              email: '',
              isCorresponding: true
            }
          ],
          agreements: draftData.agreements || {
            originalWork: false,
            noConflictOfInterest: false,
            consentToPublish: false
          }
        })
        // 新建稿件時不載入步驟狀態，維持從步驟1開始
        // setCurrentStep(draftData.currentStep || 1)
        
        // 如果有檔案資訊，顯示提示
        if (draftData.fileInfo) {
          console.log('草稿已載入，但檔案需要重新上傳：', draftData.fileInfo.name)
        }
        
        // 如果有草稿ID，記錄下來（用於後續更新）
        if (draftData.draftId) {
          console.log('載入現有草稿ID：', draftData.draftId)
        }
        
        console.log('草稿已載入：', draftData)
      }
    } catch (error) {
      console.error('載入草稿失敗：', error)
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
        submissionData.file ||
        submissionData.authors.some(author => 
          author.name.trim() || author.email.trim() || author.institution.trim()
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
            isCorresponding: author.isCorresponding
          })),
          conferenceYear: year
        }
        
        try {
          await saveSubmissionDraft(draftData)
          console.log('當前內容已自動保存為草稿')
        } catch (err) {
          console.error('自動保存草稿失敗:', err)
        }
      }

      // 清空表單並重置狀態
      setSubmissionData({
        paperType: '',
        conferenceSubject: '',
        title: '',
        abstract: '',
        keywords: '',
        file: null,
        authors: [
          {
            name: '',
            institution: '',
            email: '',
            isCorresponding: true
          }
        ],
        agreements: {
          originalWork: false,
          noConflictOfInterest: false,
          consentToPublish: false
        }
      })
      setCurrentStep(1)
      setErrors({})
      setIsEditingDraft(true) // 進入投稿模式，顯示步驟
      
      // 清除本地草稿緩存
      localStorage.removeItem('submissionDraft')
      
      // 切換到投稿表單
      setActiveTab('submission')
      
      console.log('新投稿已開始，表單已清空')
    } catch (error) {
      console.error('開始新投稿失敗：', error)
    }
  }

  const PAPER_TYPES = [
    { value: 'research', label: '研究論文' },
    { value: 'case_study', label: '案例研究' },
    { value: 'review', label: '文獻回顧' },
    { value: 'technical', label: '技術報告' }
  ]

  const CONFERENCE_SUBJECTS = conference?.tracks ? 
    Object.entries(conference.tracks).map(([value, label]) => ({ value, label })) :
    [
      { value: 'ai_education', label: 'AI在教育中的應用' },
      { value: 'digital_learning', label: '數位學習與教學科技' },
      { value: 'curriculum_design', label: '課程設計與開發' },
      { value: 'assessment', label: '學習評量與分析' },
      { value: 'media_technology', label: '傳播科技與媒體素養' },
      { value: 'teacher_training', label: '教師專業發展' }
    ]

  // 純驗證函數，不改變狀態
  const checkStepValid = (step: number): boolean => {
    const checkErrors: Record<string, string> = {}

    switch (step) {
      case 1:
        if (!submissionData.paperType) checkErrors.paperType = '請選擇論文類型'
        if (!submissionData.conferenceSubject) checkErrors.conferenceSubject = '請選擇會議子題'
        break
      case 2:
        if (!submissionData.title.trim()) checkErrors.title = '請輸入標題'
        if (!submissionData.abstract.trim()) checkErrors.abstract = '請輸入摘要'
        if (!submissionData.keywords.trim()) checkErrors.keywords = '請輸入關鍵詞'
        break
      case 3:
        if (!submissionData.file) checkErrors.file = '請上傳稿件'
        break
      case 4:
        submissionData.authors.forEach((author, index) => {
          if (!author.name.trim()) checkErrors[`author_${index}_name`] = '請輸入作者姓名'
          if (!author.institution.trim()) checkErrors[`author_${index}_institution`] = '請輸入服務機構'
          if (!author.email.trim()) checkErrors[`author_${index}_email`] = '請輸入電子郵件'
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author.email)) {
            checkErrors[`author_${index}_email`] = '請輸入有效的電子郵件'
          }
        })
        break
      case 5:
        if (!submissionData.agreements.originalWork) checkErrors.originalWork = '必須確認此為原創作品'
        if (!submissionData.agreements.noConflictOfInterest) checkErrors.noConflictOfInterest = '必須聲明無利益衝突'
        if (!submissionData.agreements.consentToPublish) checkErrors.consentToPublish = '必須同意發表條款'
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
        if (!submissionData.conferenceSubject) newErrors.conferenceSubject = '請選擇會議子題'
        break
      case 2:
        if (!submissionData.title.trim()) newErrors.title = '請輸入標題'
        if (!submissionData.abstract.trim()) newErrors.abstract = '請輸入摘要'
        if (!submissionData.keywords.trim()) newErrors.keywords = '請輸入關鍵詞'
        break
      case 3:
        if (!submissionData.file) newErrors.file = '請上傳稿件'
        break
      case 4:
        submissionData.authors.forEach((author, index) => {
          if (!author.name.trim()) newErrors[`author_${index}_name`] = '請輸入作者姓名'
          if (!author.institution.trim()) newErrors[`author_${index}_institution`] = '請輸入服務機構'
          if (!author.email.trim()) newErrors[`author_${index}_email`] = '請輸入電子郵件'
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author.email)) {
            newErrors[`author_${index}_email`] = '請輸入有效的電子郵件'
          }
        })
        break
      case 5:
        if (!submissionData.agreements.originalWork) newErrors.originalWork = '必須確認此為原創作品'
        if (!submissionData.agreements.noConflictOfInterest) newErrors.noConflictOfInterest = '必須聲明無利益衝突'
        if (!submissionData.agreements.consentToPublish) newErrors.consentToPublish = '必須同意發表條款'
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSubmissionData(prev => ({ ...prev, file }))
    }
  }

  const addAuthor = () => {
    setSubmissionData(prev => ({
      ...prev,
      authors: [
        ...prev.authors,
        {
          name: '',
          institution: '',
          email: '',
          isCorresponding: false
        }
      ]
    }))
  }

  const removeAuthor = (index: number) => {
    if (submissionData.authors.length > 1) {
      setSubmissionData(prev => ({
        ...prev,
        authors: prev.authors.filter((_, i) => i !== index)
      }))
    }
  }

  const updateAuthor = (index: number, field: string, value: string | boolean) => {
    setSubmissionData(prev => ({
      ...prev,
      authors: prev.authors.map((author, i) =>
        i === index ? { ...author, [field]: value } : author
      )
    }))
  }

  const saveDraft = async () => {
    try {
      // 驗證當前步驟
      if (!validateStep(currentStep)) {
        alert('請完成當前步驟的必填欄位')
        return
      }

      // 檢查是否有現有草稿（基於 localStorage 保存的 draftId）
      let existingDraft = null
      try {
        const savedDraft = localStorage.getItem('submissionDraft')
        if (savedDraft) {
          const draftData = JSON.parse(savedDraft)
          if (draftData.draftId) {
            existingDraft = submissions.find(s => s.id === draftData.draftId && s.status === 'DRAFT')
          }
        }
      } catch (e) {
        // 忽略解析錯誤
      }

      // 如果沒有找到對應的草稿ID，則嘗試根據內容匹配
      if (!existingDraft) {
        existingDraft = submissions.find(s => 
          s.status === 'DRAFT' && 
          s.title === submissionData.title &&
          s.abstract === submissionData.abstract
        )
      }

      // 完整的草稿資料，包含所有欄位
      const draftData = {
        title: submissionData.title,
        abstract: submissionData.abstract,
        track: submissionData.conferenceSubject,
        authors: submissionData.authors.map(author => ({
          name: author.name,
          email: author.email,
          institution: author.institution,
          isCorresponding: author.isCorresponding
        })),
        conferenceYear: year,
        // 新增完整欄位
        paperType: submissionData.paperType,
        keywords: submissionData.keywords,
        fileInfo: submissionData.file ? {
          name: submissionData.file.name,
          size: submissionData.file.size,
          type: submissionData.file.type,
          lastModified: submissionData.file.lastModified
        } : null,
        agreements: submissionData.agreements,
        // 如果有現有草稿，傳送其ID以更新而不是創建新的
        draftId: existingDraft?.id
      }
      
      await saveSubmissionDraft(draftData)
      
      // 保存到本地存儲（備份）
      const localDraftData = {
        paperType: submissionData.paperType,
        conferenceSubject: submissionData.conferenceSubject,
        title: submissionData.title,
        abstract: submissionData.abstract,
        keywords: submissionData.keywords,
        fileInfo: submissionData.file ? {
          name: submissionData.file.name,
          size: submissionData.file.size,
          type: submissionData.file.type,
          lastModified: submissionData.file.lastModified
        } : null,
        authors: submissionData.authors,
        agreements: submissionData.agreements,
        currentStep,
        lastSaved: new Date().toISOString(),
        draftId: existingDraft?.id // 保存草稿ID
      }
      localStorage.setItem('submissionDraft', JSON.stringify(localDraftData))
      
      alert('草稿已保存成功！')
      refetch() // 重新載入資料
    } catch (err: any) {
      console.error('保存草稿失敗:', err)
      alert('保存草稿失敗: ' + err.message)
    }
  }

  const handleSubmit = async () => {
    try {
      // 驗證所有步驟
      const allStepsValid = [1, 2, 3, 4, 5].every(step => validateStep(step))
      
      if (!allStepsValid) {
        alert('請完成所有必填欄位後再提交')
        return
      }

      // 查找對應的草稿
      const existingDraft = submissions.find(s => 
        s.status === 'DRAFT' && 
        s.title === submissionData.title &&
        s.abstract === submissionData.abstract &&
        s.track === submissionData.conferenceSubject
      )

      const submissionPayload = {
        title: submissionData.title,
        abstract: submissionData.abstract,
        track: submissionData.conferenceSubject,
        authors: submissionData.authors.map(author => ({
          name: author.name,
          email: author.email,
          institution: author.institution,
          isCorresponding: author.isCorresponding
        })),
        conferenceYear: year,
        draftId: existingDraft?.id // 如果找到對應草稿，使用其ID
      }
      
      const result = await submitSubmission(submissionPayload)
      
      // 顯示提交成功信息，包含流水號
      const successMessage = result.serialNumber 
        ? `稿件提交成功！\n流水號：${result.serialNumber}\n${result.emailNotificationSent ? '已發送電子郵件通知所有作者。' : '電子郵件通知發送失敗，請聯繫管理員。'}`
        : '稿件提交成功！'
      
      alert(successMessage)
      
      // 清除草稿
      localStorage.removeItem('submissionDraft')
      
      // 重置表單
      setActiveTab('home')
      setCurrentStep(1)
      setSubmissionData({
        paperType: '',
        conferenceSubject: '',
        title: '',
        abstract: '',
        keywords: '',
        file: null,
        authors: [{
          name: '',
          institution: '',
          email: '',
          isCorresponding: true
        }],
        agreements: {
          originalWork: false,
          noConflictOfInterest: false,
          consentToPublish: false
        }
      })
      setErrors({})
      
      // 重新載入資料
      refetch()
    } catch (err: any) {
      console.error('提交稿件失敗:', err)
      alert('提交稿件失敗: ' + err.message)
    }
  }

  // 取得草稿清單
  const drafts = submissions.filter(s => s.status === 'DRAFT').map((submission, index) => ({
    id: submission.id,
    no: submissions.length - index, // 簡單編號
    title: submission.title,
    date: new Date(submission.createdAt).toLocaleDateString('zh-TW'),
    submission
  }))

  // 載入草稿到編輯表單
  const loadDraftForEdit = (submission: any) => {
    try {
      // 首先嘗試從 localStorage 載入完整資料（如果有的話）
      let fullData = null
      try {
        const savedDraft = localStorage.getItem('submissionDraft')
        if (savedDraft) {
          const draftData = JSON.parse(savedDraft)
          // 檢查是否是同一份草稿
          if (draftData.title === submission.title && draftData.abstract === submission.abstract) {
            fullData = draftData
          }
        }
      } catch (e) {
        console.warn('無法從 localStorage 載入草稿資料')
      }

      // 將草稿資料載入到表單狀態
      setSubmissionData({
        paperType: fullData?.paperType || submission.paperType || '',
        conferenceSubject: submission.track || '',
        title: submission.title || '',
        abstract: submission.abstract || '',
        keywords: fullData?.keywords || submission.keywords || '',
        file: null, // 檔案需要特別處理，無法從後端恢復
        authors: submission.authors?.length > 0 ? submission.authors.map((author: any) => ({
          name: author.name || '',
          institution: author.affiliation || author.institution || '',
          email: author.email || '',
          isCorresponding: author.isCorresponding || false
        })) : [{
          name: '',
          institution: '',
          email: '',
          isCorresponding: true
        }],
        agreements: fullData?.agreements || {
          originalWork: false,
          noConflictOfInterest: false,
          consentToPublish: false
        }
      })
      
      setCurrentStep(fullData?.currentStep || 1) // 載入之前的步驟
      setActiveTab('submission') // 切換到投稿表單
      setIsEditingDraft(true) // 設置為編輯模式
      
      // 如果有檔案資訊，顯示提示
      if (fullData?.fileInfo) {
        setTimeout(() => {
          alert(`提示：此草稿原本包含檔案「${fullData.fileInfo.name}」，請重新上傳該檔案。`)
        }, 500)
      }
      
      console.log('草稿已載入到編輯表單：', submission)
      console.log('完整資料：', fullData)
    } catch (error) {
      console.error('載入草稿失敗：', error)
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
      console.error('刪除草稿失敗:', err)
      alert('刪除失敗: ' + (err.message || '未知錯誤'))
    }
  }

  // 統計資料處理
  const processingCount = stats.submitted + stats.underReview
  const revisionCount = stats.revisionRequired
  const completedCount = stats.accepted + stats.rejected

  // 渲染正在處理的稿件列表
  const renderSubmittedView = () => {
    const submittedSubmissions = submissions.filter(s => s.status === 'SUBMITTED').map((submission, index) => ({
      id: submission.id,
      no: submission.serialNumber || `SUB${submission.id.slice(-6)}`,
      title: submission.title,
      date: new Date(submission.createdAt).toLocaleDateString('zh-TW'),
      track: submission.track,
      submission
    }))

    return (
      <div className="space-y-8 lg:space-y-[56px]">
        <div>
          <Breadcrumb items={[
            { 
              label: '待處理中', 
              onClick: () => {
                setActiveTab('history')
                setHomeView('overview')
              }, 
              active: false 
            },
            { label: '正在處理', onClick: () => {}, active: true }
          ]} />
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
                <table className="w-full table-auto border-collapse" aria-label="正在處理的稿件">
                  <thead className="bg-white border-y border-gray-200 text-gray-700">
                    <tr>
                      <th scope="col" className="w-32 px-[48px] py-[24px] text-left text-24M font-medium">
                        編號
                      </th>
                      <th scope="col" className="px-[48px] py-[24px] text-left text-24M font-medium">
                        標題
                      </th>
                      <th scope="col" className="w-40 px-4 py-[24px] text-left text-24M font-medium">
                        提交日期
                      </th>
                      <th scope="col" className="w-40 px-4 py-[24px] text-left text-24M font-medium">
                        會議軌道
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-[60px] text-center text-gray-500">
                          載入中...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-[60px] text-center text-red-500">
                          載入失敗: {error}
                        </td>
                      </tr>
                    ) : submittedSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-[60px] text-center text-gray-500">
                          目前沒有正在處理的稿件
                        </td>
                      </tr>
                    ) : (
                      submittedSubmissions.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] font-medium text-24R">{s.no}</p>
                          </td>
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] leading-relaxed break-words text-24R">{s.title}</p>
                          </td>
                          <td className="w-40 px-4 py-[60px] align-middle text-gray-500 tabular-nums text-24R">
                            {s.date}
                          </td>
                          <td className="w-40 px-4 py-[60px] align-middle text-gray-500 text-24R">
                            {conference?.tracks?.[s.track] || s.track}
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
    const underReviewSubmissions = submissions.filter(s => s.status === 'UNDER_REVIEW').map((submission, index) => ({
      id: submission.id,
      no: submission.serialNumber || `REV${submission.id.slice(-6)}`,
      title: submission.title,
      date: new Date(submission.updatedAt).toLocaleDateString('zh-TW'),
      track: submission.track,
      submission
    }))

    return (
      <div className="space-y-8 lg:space-y-[56px]">
        <div>
          <Breadcrumb items={[
            { 
              label: '待處理中', 
              onClick: () => {
                setActiveTab('history')
                setHomeView('overview')
              }, 
              active: false 
            },
            { label: '審稿中', onClick: () => {}, active: true }
          ]} />
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
                <table className="w-full table-auto border-collapse" aria-label="審稿中的稿件">
                  <thead className="bg-white border-y border-gray-200 text-gray-700">
                    <tr>
                      <th scope="col" className="w-32 px-[48px] py-[24px] text-left text-24M font-medium">
                        編號
                      </th>
                      <th scope="col" className="px-[48px] py-[24px] text-left text-24M font-medium">
                        標題
                      </th>
                      <th scope="col" className="w-40 px-4 py-[24px] text-left text-24M font-medium">
                        送審日期
                      </th>
                      <th scope="col" className="w-40 px-4 py-[24px] text-left text-24M font-medium">
                        會議軌道
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-[60px] text-center text-gray-500">
                          載入中...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-[60px] text-center text-red-500">
                          載入失敗: {error}
                        </td>
                      </tr>
                    ) : underReviewSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-[60px] text-center text-gray-500">
                          目前沒有審稿中的稿件
                        </td>
                      </tr>
                    ) : (
                      underReviewSubmissions.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] font-medium text-24R">{s.no}</p>
                          </td>
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] leading-relaxed break-words text-24R">{s.title}</p>
                          </td>
                          <td className="w-40 px-4 py-[60px] align-middle text-gray-500 tabular-nums text-24R">
                            {s.date}
                          </td>
                          <td className="w-40 px-4 py-[60px] align-middle text-gray-500 text-24R">
                            {conference?.tracks?.[s.track] || s.track}
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
    const acceptedSubmissions = submissions.filter(s => s.status === 'ACCEPTED').map((submission, index) => ({
      id: submission.id,
      no: submission.serialNumber || `ACC${submission.id.slice(-6)}`,
      title: submission.title,
      date: new Date(submission.updatedAt).toLocaleDateString('zh-TW'),
      track: submission.track,
      submission
    }))

    return (
      <div className="space-y-8 lg:space-y-[56px]">
        <div>
          <Breadcrumb items={[
            { 
              label: '已完成', 
              onClick: () => {
                setActiveTab('completed')
                setHomeView('overview')
              }, 
              active: false 
            },
            { label: '已接受', onClick: () => {}, active: true }
          ]} />
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
                <table className="w-full table-auto border-collapse" aria-label="已接受的稿件">
                  <thead className="bg-white border-y border-gray-200 text-gray-700">
                    <tr>
                      <th scope="col" className="w-32 px-[48px] py-[24px] text-left text-24M font-medium">
                        編號
                      </th>
                      <th scope="col" className="px-[48px] py-[24px] text-left text-24M font-medium">
                        標題
                      </th>
                      <th scope="col" className="w-40 px-4 py-[24px] text-left text-24M font-medium">
                        接受日期
                      </th>
                      <th scope="col" className="w-40 px-4 py-[24px] text-left text-24M font-medium">
                        會議軌道
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-[60px] text-center text-gray-500">
                          載入中...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-[60px] text-center text-red-500">
                          載入失敗: {error}
                        </td>
                      </tr>
                    ) : acceptedSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-[60px] text-center text-gray-500">
                          目前沒有已接受的稿件
                        </td>
                      </tr>
                    ) : (
                      acceptedSubmissions.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] font-medium text-24R">{s.no}</p>
                          </td>
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] leading-relaxed break-words text-24R">{s.title}</p>
                          </td>
                          <td className="w-40 px-4 py-[60px] align-middle text-gray-500 tabular-nums text-24R">
                            {s.date}
                          </td>
                          <td className="w-40 px-4 py-[60px] align-middle text-gray-500 text-24R">
                            {conference?.tracks?.[s.track] || s.track}
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
    const rejectedSubmissions = submissions.filter(s => s.status === 'REJECTED').map((submission, index) => ({
      id: submission.id,
      no: submission.serialNumber || `REJ${submission.id.slice(-6)}`,
      title: submission.title,
      date: new Date(submission.updatedAt).toLocaleDateString('zh-TW'),
      track: submission.track,
      submission
    }))

    return (
      <div className="space-y-8 lg:space-y-[56px]">
        <div>
          <Breadcrumb items={[
            { 
              label: '已完成', 
              onClick: () => {
                setActiveTab('completed')
                setHomeView('overview')
              }, 
              active: false 
            },
            { label: '已拒絕', onClick: () => {}, active: true }
          ]} />
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
                <table className="w-full table-auto border-collapse" aria-label="已拒絕的稿件">
                  <thead className="bg-white border-y border-gray-200 text-gray-700">
                    <tr>
                      <th scope="col" className="w-32 px-[48px] py-[24px] text-left text-24M font-medium">
                        編號
                      </th>
                      <th scope="col" className="px-[48px] py-[24px] text-left text-24M font-medium">
                        標題
                      </th>
                      <th scope="col" className="w-40 px-4 py-[24px] text-left text-24M font-medium">
                        拒絕日期
                      </th>
                      <th scope="col" className="w-40 px-4 py-[24px] text-left text-24M font-medium">
                        會議軌道
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-[60px] text-center text-gray-500">
                          載入中...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-[60px] text-center text-red-500">
                          載入失敗: {error}
                        </td>
                      </tr>
                    ) : rejectedSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-[60px] text-center text-gray-500">
                          目前沒有已拒絕的稿件
                        </td>
                      </tr>
                    ) : (
                      rejectedSubmissions.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] font-medium text-24R">{s.no}</p>
                          </td>
                          <td className="px-[48px] py-[40px] align-middle">
                            <p className="text-[#00182C] leading-relaxed break-words text-24R">{s.title}</p>
                          </td>
                          <td className="w-40 px-4 py-[60px] align-middle text-gray-500 tabular-nums text-24R">
                            {s.date}
                          </td>
                          <td className="w-40 px-4 py-[60px] align-middle text-gray-500 text-24R">
                            {conference?.tracks?.[s.track] || s.track}
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
                  <span className="text-gray-800 text-32R">({stats.draft})</span>
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
                    <span className="text-gray-800 text-32R">({stats.underReview})</span>
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
              const revisions = submissions.filter(s => s.status === 'REVISION_REQUIRED').map((submission, index) => ({
                id: submission.id,
                no: submission.serialNumber || `REV${submission.id.slice(-6)}`, // 使用流水號或簡化的ID
                title: submission.title,
                date: new Date(submission.updatedAt).toLocaleDateString('zh-TW'),
                submission
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
              active: submissionView === 'list'
            }
          ]

          if (submissionView === 'drafts') {
            items.push({
              label: '草稿狀態',
              onClick: () => {},
              active: true
            })
          }

          if (submissionView === 'revisions') {
            items.push({
              label: '草稿修訂',
              onClick: () => {},
              active: true
            })
          }

          return items
        }

        return (
          <div className="space-y-8 lg:space-y-[56px]">
            <div className={`${submissionView === 'list' ? '' : 'hidden'}`}>
              <h1
                className="text-3xl md:text-[64px] font-medium text-[#00182C] leading-tight"
              >
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
              <h3 className="text-xl font-semibold text-[#00182C] mb-6">已完成的投稿</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                  <div className="col-span-full text-center text-gray-500 py-8">載入中...</div>
                ) : error ? (
                  <div className="col-span-full text-center text-red-500 py-8">載入失敗: {error}</div>
                ) : submissions.filter(s => s.status === 'ACCEPTED' || s.status === 'REJECTED').length === 0 ? (
                  <div className="col-span-full text-center text-gray-500 py-8">目前沒有已完成的投稿</div>
                ) : (
                  submissions
                    .filter(s => s.status === 'ACCEPTED' || s.status === 'REJECTED')
                    .map(submission => (
                      <div key={submission.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-[#00182C]">{submission.title}</h4>
                          {submission.status === 'ACCEPTED' ? (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">已接受</span>
                          ) : (
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">已拒絕</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          完成日期: {new Date(submission.updatedAt).toLocaleDateString('zh-TW')}
                        </p>
                        {submission.decisions && submission.decisions.length > 0 ? (
                          <p className="text-xs text-gray-500">
                            決議: {submission.decisions[0].note || '無額外說明'}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">
                            軌道: {conference?.tracks[submission.track] || submission.track}
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
                <div className="space-y-6">
                  <div>
                    <label className="block text-lg font-medium text-[#00182C] mb-4">
                      論文類型
                    </label>
                    <div className="relative">
                      <select
                        value={submissionData.paperType}
                        onChange={(e) => setSubmissionData(prev => ({ ...prev, paperType: e.target.value }))}
                        className="w-full p-4 border border-gray-300 rounded-lg appearance-none bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3B5FB9] focus:border-transparent"
                      >
                        <option value="">選擇論文類型</option>
                        {PAPER_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.paperType && (
                      <p className="mt-2 text-sm text-red-600">{errors.paperType}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-lg font-medium text-[#00182C] mb-4">
                      會議子題
                    </label>
                    <div className="relative">
                      <select
                        value={submissionData.conferenceSubject}
                        onChange={(e) => setSubmissionData(prev => ({ ...prev, conferenceSubject: e.target.value }))}
                        className="w-full p-4 border border-gray-300 rounded-lg appearance-none bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3B5FB9] focus:border-transparent"
                      >
                        <option value="">選擇會議子題</option>
                        {CONFERENCE_SUBJECTS.map(subject => (
                          <option key={subject.value} value={subject.value}>
                            {subject.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.conferenceSubject && (
                      <p className="mt-2 text-sm text-red-600">{errors.conferenceSubject}</p>
                    )}
                  </div>
                </div>
              )

            case 2:
              return (
                <div className="space-y-6">
                  <div>
                    <label className="block text-lg font-medium text-[#00182C] mb-4">
                      論文標題
                    </label>
                    <input
                      type="text"
                      value={submissionData.title}
                      onChange={(e) => setSubmissionData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5FB9] focus:border-transparent"
                      placeholder="請輸入論文標題"
                    />
                    {errors.title && (
                      <p className="mt-2 text-sm text-red-600">{errors.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-lg font-medium text-[#00182C] mb-4">
                      摘要
                    </label>
                    <textarea
                      value={submissionData.abstract}
                      onChange={(e) => setSubmissionData(prev => ({ ...prev, abstract: e.target.value }))}
                      rows={8}
                      className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5FB9] focus:border-transparent resize-none"
                      placeholder="請輸入論文摘要（建議300-500字）"
                    />
                    {errors.abstract && (
                      <p className="mt-2 text-sm text-red-600">{errors.abstract}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-lg font-medium text-[#00182C] mb-4">
                      關鍵詞
                    </label>
                    <input
                      type="text"
                      value={submissionData.keywords}
                      onChange={(e) => setSubmissionData(prev => ({ ...prev, keywords: e.target.value }))}
                      className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5FB9] focus:border-transparent"
                      placeholder="請輸入3-5個關鍵詞，以逗號分隔"
                    />
                    {errors.keywords && (
                      <p className="mt-2 text-sm text-red-600">{errors.keywords}</p>
                    )}
                  </div>
                </div>
              )

            case 3:
              return (
                <div className="space-y-6">
                  <div>
                    <label className="block text-lg font-medium text-[#00182C] mb-4">
                      上傳論文檔案
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      {submissionData.file ? (
                        <div className="space-y-4">
                          <CheckCircle className="mx-auto w-12 h-12 text-green-500" />
                          <p className="text-lg font-medium text-green-600">
                            已上傳: {submissionData.file.name}
                          </p>
                          <button
                            type="button"
                            onClick={() => setSubmissionData(prev => ({ ...prev, file: null }))}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            移除檔案
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <FileText className="mx-auto w-12 h-12 text-gray-400" />
                          <div>
                            <label htmlFor="file-upload" className="cursor-pointer">
                              <span className="text-lg font-medium text-[#3B5FB9] hover:text-[#2a4a99]">
                                點擊上傳檔案
                              </span>
                              <input
                                id="file-upload"
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={handleFileUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <p className="text-sm text-gray-500">
                            支援格式：PDF, DOC, DOCX（最大 10MB）
                          </p>
                          {/* 顯示之前上傳過的檔案資訊（如果有的話） */}
                          {(() => {
                            try {
                              const savedDraft = localStorage.getItem('submissionDraft')
                              if (savedDraft) {
                                const draftData = JSON.parse(savedDraft)
                                if (draftData.fileInfo) {
                                  return (
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                      <p className="text-sm text-blue-600">
                                        💡 提示：之前保存的草稿包含檔案「{draftData.fileInfo.name}」，請重新上傳此檔案
                                      </p>
                                    </div>
                                  )
                                }
                              }
                            } catch (e) {
                              // 忽略解析錯誤
                            }
                            return null
                          })()}
                        </div>
                      )}
                    </div>
                    {errors.file && (
                      <p className="mt-2 text-sm text-red-600">{errors.file}</p>
                    )}
                  </div>
                </div>
              )

            case 4:
              return (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-[#00182C]">作者資訊</h3>
                    <button
                      type="button"
                      onClick={addAuthor}
                      className="px-4 py-2 bg-[#3B5FB9] text-white rounded-lg hover:bg-[#2a4a99] transition-colors"
                    >
                      新增作者
                    </button>
                  </div>

                  {submissionData.authors.map((author, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-[#00182C]">
                          作者 {index + 1}
                          {author.isCorresponding && (
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              通訊作者
                            </span>
                          )}
                        </h4>
                        {submissionData.authors.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAuthor(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            移除
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#00182C] mb-2">
                            姓名 *
                          </label>
                          <input
                            type="text"
                            value={author.name}
                            onChange={(e) => updateAuthor(index, 'name', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5FB9] focus:border-transparent"
                          />
                          {errors[`author_${index}_name`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`author_${index}_name`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-[#00182C] mb-2">
                            電子郵件 *
                          </label>
                          <input
                            type="email"
                            value={author.email}
                            onChange={(e) => updateAuthor(index, 'email', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5FB9] focus:border-transparent"
                          />
                          {errors[`author_${index}_email`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`author_${index}_email`]}</p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-[#00182C] mb-2">
                            服務機構 *
                          </label>
                          <input
                            type="text"
                            value={author.institution}
                            onChange={(e) => updateAuthor(index, 'institution', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B5FB9] focus:border-transparent"
                          />
                          {errors[`author_${index}_institution`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`author_${index}_institution`]}</p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={author.isCorresponding}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSubmissionData(prev => ({
                                    ...prev,
                                    authors: prev.authors.map((a, i) => ({
                                      ...a,
                                      isCorresponding: i === index
                                    }))
                                  }))
                                }
                              }}
                              className="w-4 h-4 text-[#3B5FB9] rounded border-gray-300 focus:ring-[#3B5FB9] focus:ring-2"
                            />
                            <span className="text-sm font-medium text-[#00182C]">
                              設為通訊作者
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )

            case 5:
              return (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-[#00182C] mb-6">作者聲明</h3>
                  
                  <div className="space-y-6">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={submissionData.agreements.originalWork}
                        onChange={(e) => setSubmissionData(prev => ({
                          ...prev,
                          agreements: { ...prev.agreements, originalWork: e.target.checked }
                        }))}
                        className="mt-1 w-4 h-4 text-[#3B5FB9] rounded border-gray-300 focus:ring-[#3B5FB9] focus:ring-2"
                      />
                      <div>
                        <span className="font-medium text-[#00182C]">原創作品聲明 *</span>
                        <p className="text-sm text-gray-600 mt-1">
                          我確認此論文為原創作品，未曾在其他期刊或研討會發表過，且未同時投稿至其他出版社或研討會。
                        </p>
                      </div>
                    </label>
                    {errors.originalWork && (
                      <p className="text-sm text-red-600 ml-7">{errors.originalWork}</p>
                    )}

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={submissionData.agreements.noConflictOfInterest}
                        onChange={(e) => setSubmissionData(prev => ({
                          ...prev,
                          agreements: { ...prev.agreements, noConflictOfInterest: e.target.checked }
                        }))}
                        className="mt-1 w-4 h-4 text-[#3B5FB9] rounded border-gray-300 focus:ring-[#3B5FB9] focus:ring-2"
                      />
                      <div>
                        <span className="font-medium text-[#00182C]">利益衝突聲明 *</span>
                        <p className="text-sm text-gray-600 mt-1">
                          我聲明此研究無任何可能影響研究客觀性或結果解釋的利益衝突。
                        </p>
                      </div>
                    </label>
                    {errors.noConflictOfInterest && (
                      <p className="text-sm text-red-600 ml-7">{errors.noConflictOfInterest}</p>
                    )}

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={submissionData.agreements.consentToPublish}
                        onChange={(e) => setSubmissionData(prev => ({
                          ...prev,
                          agreements: { ...prev.agreements, consentToPublish: e.target.checked }
                        }))}
                        className="mt-1 w-4 h-4 text-[#3B5FB9] rounded border-gray-300 focus:ring-[#3B5FB9] focus:ring-2"
                      />
                      <div>
                        <span className="font-medium text-[#00182C]">發表同意書 *</span>
                        <p className="text-sm text-gray-600 mt-1">
                          我同意在論文被接受後，將論文發表於研討會論文集中，並同意主辦單位使用此論文進行相關學術推廣活動。
                        </p>
                      </div>
                    </label>
                    {errors.consentToPublish && (
                      <p className="text-sm text-red-600 ml-7">{errors.consentToPublish}</p>
                    )}
                  </div>
                </div>
              )

            case 6:
              return (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-[#00182C] mb-6">確認投稿資訊</h3>
                  
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div>
                      <h4 className="font-medium text-[#00182C] mb-2">論文基本資訊</h4>
                      <p><span className="font-medium">類型：</span>{PAPER_TYPES.find(t => t.value === submissionData.paperType)?.label}</p>
                      <p><span className="font-medium">會議子題：</span>{CONFERENCE_SUBJECTS.find(s => s.value === submissionData.conferenceSubject)?.label}</p>
                      <p><span className="font-medium">標題：</span>{submissionData.title}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-[#00182C] mb-2">檔案</h4>
                      <p>{submissionData.file?.name}</p>
                    </div>

                    <div>
                      <h4 className="font-medium text-[#00182C] mb-2">作者</h4>
                      {submissionData.authors.map((author, index) => (
                        <p key={index}>
                          {author.name} ({author.institution}) 
                          {author.isCorresponding && <span className="text-blue-600 font-medium ml-1">通訊作者</span>}
                        </p>
                      ))}
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
          { number: 6, title: '檢查並送出' }
        ]

        return (
          <div className="space-y-8 lg:space-y-14">
            <div>
              <h1 className="text-3xl md:text-[64px] font-medium text-[#00182C] leading-tight">
                提交新稿件 - 步驟 {currentStep} / 6
              </h1>
            </div>

            <div className="bg-white rounded-lg p-6 md:p-[48px]">
              {/* Content */}
              <div className="mb-8">
                {renderStepContent()}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                <button
                  onClick={saveDraft}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  保存草稿
                </button>

                {currentStep < 6 ? (
                  <button
                    onClick={nextStep}
                    className="px-6 py-2 bg-[#3B5FB9] text-white rounded-lg hover:bg-[#2a4a99] transition-colors"
                  >
                    下一步
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    提交稿件
                  </button>
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
              <div className="relative z-[60] bg-white flex-1 px-6 md:px-[48px] py-6 md:py-[45px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-lg md:text-[28px] font-medium text-[#3B5FB9] leading-tight">
                    2025 AI時代課程教學與傳播科技研討會
                  </h1>
                </div>
                <div className="relative z-[70]">
                  <YearDropdown
                    value={2025}
                    onChange={setYear}
                    options={[
                      { value: 2025, label: '2025' },
                      { value: 2024, label: '2024' },
                      { value: 2023, label: '2023' },
                    ]}
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
                    <div className="flex flex-col gap-[16px] px-[24px] transition-all duration-300 ease-in-out transform opacity-100 translate-y-0"
                         style={{ animation: 'slideInFromTop 0.3s ease-in-out' }}>
                      <button
                        onClick={() => goToStep(1)}
                        className={`flex items-center gap-[16px] w-full text-left px-2 py-1 rounded transition-colors ${
                          canGoToStep(1) ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-not-allowed opacity-60'
                        }`}
                        disabled={!canGoToStep(1)}
                        style={{ animation: 'slideInFromTop 0.3s ease-in-out 0.1s both' }}
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
                          {currentStep > 1 && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className={`text-28R py-[6px] ${currentStep === 1 ? 'font-medium' : ''}`}>
                          步驟一：
                          <span className={currentStep === 1 ? 'text-primary font-medium' : 'text-primary'}>類型與子題</span>
                        </div>
                      </button>
                      <button
                        onClick={() => goToStep(2)}
                        className={`flex items-center gap-[16px] w-full text-left px-2 py-1 rounded transition-colors ${
                          canGoToStep(2) ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-not-allowed opacity-60'
                        }`}
                        disabled={!canGoToStep(2)}
                        style={{ animation: 'slideInFromTop 0.3s ease-in-out 0.15s both' }}
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
                          {currentStep > 2 && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className={`text-28R py-[6px] ${currentStep === 2 ? 'font-medium' : ''}`}>
                          步驟二：<span className={currentStep === 2 ? 'text-primary font-medium' : 'text-primary'}>基本資料</span>
                        </div>
                      </button>
                      <button
                        onClick={() => goToStep(3)}
                        className={`flex items-center gap-[16px] w-full text-left px-2 py-1 rounded transition-colors ${
                          canGoToStep(3) ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-not-allowed opacity-60'
                        }`}
                        disabled={!canGoToStep(3)}
                        style={{ animation: 'slideInFromTop 0.3s ease-in-out 0.2s both' }}
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
                          {currentStep > 3 && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className={`text-28R py-[6px] ${currentStep === 3 ? 'font-medium' : ''}`}>
                          步驟三：<span className={currentStep === 3 ? 'text-primary font-medium' : 'text-primary'}>上傳檔案</span>
                        </div>
                      </button>
                      <button
                        onClick={() => goToStep(4)}
                        className={`flex items-center gap-[16px] w-full text-left px-2 py-1 rounded transition-colors ${
                          canGoToStep(4) ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-not-allowed opacity-60'
                        }`}
                        disabled={!canGoToStep(4)}
                        style={{ animation: 'slideInFromTop 0.3s ease-in-out 0.25s both' }}
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
                          {currentStep > 4 && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className={`text-28R py-[6px] ${currentStep === 4 ? 'font-medium' : ''}`}>
                          步驟四：<span className={currentStep === 4 ? 'text-primary font-medium' : 'text-primary'}>作者資訊</span>
                        </div>
                      </button>
                      <button
                        onClick={() => goToStep(5)}
                        className={`flex items-center gap-[16px] w-full text-left px-2 py-1 rounded transition-colors ${
                          canGoToStep(5) ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-not-allowed opacity-60'
                        }`}
                        disabled={!canGoToStep(5)}
                        style={{ animation: 'slideInFromTop 0.3s ease-in-out 0.3s both' }}
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
                          {currentStep > 5 && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className={`text-28R py-[6px] ${currentStep === 5 ? 'font-medium' : ''}`}>
                          步驟五：<span className={currentStep === 5 ? 'text-primary font-medium' : 'text-primary'}>作者聲明</span>
                        </div>
                      </button>
                      <button
                        onClick={() => goToStep(6)}
                        className={`flex items-center gap-[16px] w-full text-left px-2 py-1 rounded transition-colors ${
                          canGoToStep(6) ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-not-allowed opacity-60'
                        }`}
                        disabled={!canGoToStep(6)}
                        style={{ animation: 'slideInFromTop 0.3s ease-in-out 0.35s both' }}
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
                          {currentStep > 6 && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div className={`text-28R py-[6px] ${currentStep === 6 ? 'font-medium' : ''}`}>
                          步驟六：<span className={currentStep === 6 ? 'text-primary font-medium' : 'text-primary'}>確認提交</span>
                        </div>
                      </button>
                    </div>
                    )}
                  </nav>
                </div>
              </aside>

              <section className="flex-1 min-h-[600px] lg:min-h-[1100px]">{renderTabContent()}</section>
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
                <h2 className="text-2xl font-medium text-[#00182C]">草稿詳情</h2>
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
                <h3 className="text-lg font-medium text-[#00182C] mb-4">基本資訊</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="font-medium text-gray-700">標題：</span>
                    <span className="text-gray-900">{viewingDraft.title || '未填寫'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">會議軌道：</span>
                    <span className="text-gray-900">
                      {conference?.tracks?.[viewingDraft.track] || viewingDraft.track || '未填寫'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">狀態：</span>
                    <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                      草稿
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">建立時間：</span>
                    <span className="text-gray-900">
                      {new Date(viewingDraft.createdAt).toLocaleString('zh-TW')}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">最後更新：</span>
                    <span className="text-gray-900">
                      {new Date(viewingDraft.updatedAt).toLocaleString('zh-TW')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 摘要 */}
              <div>
                <h3 className="text-lg font-medium text-[#00182C] mb-4">摘要</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {viewingDraft.abstract || '未填寫'}
                  </p>
                </div>
              </div>

              {/* 作者資訊 */}
              <div>
                <h3 className="text-lg font-medium text-[#00182C] mb-4">作者資訊</h3>
                <div className="space-y-3">
                  {viewingDraft.authors && viewingDraft.authors.length > 0 ? (
                    viewingDraft.authors.map((author: any, index: number) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">{author.name}</span>
                          {author.isCorresponding && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              通訊作者
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>機構：{author.affiliation || author.institution || '未填寫'}</p>
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
                <h3 className="text-lg font-medium text-[#00182C] mb-4">上傳檔案</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {viewingDraft.files && viewingDraft.files.length > 0 ? (
                    <div className="space-y-2">
                      {viewingDraft.files.map((file: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-gray-900">{file.originalName}</span>
                          <span className="text-sm text-gray-500">版本 {file.version}</span>
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
    </ProtectedRoute>
  )
}