'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '../../../../components/layout/Header'
import Footer from '../../../../components/layout/Footer'
import { PenTool, X } from 'lucide-react'
import { useAuth } from '../../../../hooks/useAuth'
import YearDropdown from '../../../../components/ui/YearDropdown'

// 統一稿件編號格式化函數：日期時間_亂數5碼
const formatSubmissionNumber = (submission: Submission): string => {
  const date = new Date(submission.submittedAt || Date.now())
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  // 從submission id生成5位亂數碼（確保一致性）
  const randomCode = submission.id.slice(-8).toUpperCase().slice(0, 5)
  
  return `${year}${month}${day}${hours}${minutes}_${randomCode}`
}

// 簡化版編號格式化函數（用於左側邊欄，不需要完整日期時間）
const formatSubmissionNumberSimple = (id: string, submittedAt?: string): string => {
  const date = submittedAt ? new Date(submittedAt) : new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  // 從id生成5位亂數碼（確保一致性）
  const randomCode = id.slice(-8).toUpperCase().slice(0, 5)
  
  return `${year}${month}${day}${hours}${minutes}_${randomCode}`
}

// 根據截圖重新設計的介面
interface Submission {
  id: string
  title: string
  author: string
  abstract: string
  keywords: string | null
  submittedAt: string
  files: FileInfo[]
  conference?: {
    id: string
    year: number
    title: string
    tracks: any
  }
}

interface FileInfo {
  id: string
  name: string
  url: string
  type: string
  size: number
}

interface ReviewResult {
  reviewer: string
  recommendation: string
  submittedDate: string
  rating: string
  details: string
}

interface Reviewer {
  id: string
  displayName: string
  email: string
  affiliation?: string
  expertise: string[]
  reviewCount: number
  lastReviewDate?: string
}

interface Decision {
  id: string
  result: string
  note?: string
  decidedAt: string
  decider: {
    displayName: string
  }
}


export default function SubmissionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const submissionId = params.id as string
  const { user, checkAuth, loading: authLoading } = useAuth()
  
  // Tab 和年份狀態
  const [activeTab, setActiveTab] = useState('manuscripts')
  const [year, setYear] = useState(2025)
  
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [editorDecision, setEditorDecision] = useState('')
  const [decisionText, setDecisionText] = useState('')
  const [publishOnlineChecked, setPublishOnlineChecked] = useState(false)
  const [publishPhysicalChecked, setPublishPhysicalChecked] = useState(false)
  const [rejectChecked, setRejectChecked] = useState(false)
  const [error, setError] = useState('')
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false)

  // 左側邊欄稿件列表
  const [submissionList, setSubmissionList] = useState<{id: string, title: string, current: boolean, submittedAt?: string}[]>([])
  
  // 審稿結果
  const [reviewResults, setReviewResults] = useState<ReviewResult[]>([])
  
  // 已指派的審稿人
  const [assignedReviewers, setAssignedReviewers] = useState<any[]>([])
  
  // 審稿人管理模態視窗
  const [showReviewerModal, setShowReviewerModal] = useState(false)
  const [availableReviewers, setAvailableReviewers] = useState<Reviewer[]>([])
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([])
  const [isLoadingReviewers, setIsLoadingReviewers] = useState(false)
  
  // 決議相關狀態
  const [editorDecisions, setEditorDecisions] = useState<Decision[]>([])
  const [latestDecision, setLatestDecision] = useState<Decision | null>(null)

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
      console.error('檔案下載失敗:', error)
      alert('檔案下載失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
    }
  }

  // 檔案預覽/在線查看函數
  const previewFile = async (fileId: string, originalName: string) => {
    try {
      const response = await fetch(`/api/submissions/download?fileId=${fileId}`)

      if (!response.ok) {
        throw new Error('檔案載入失敗')
      }

      // 創建新視窗預覽
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')

      // 延遲清理URL（給瀏覽器時間載入）
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error('檔案預覽失敗:', error)
      alert('檔案預覽失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
    }
  }
  
  // 載入稿件列表
  const loadSubmissionsList = async (conferenceId?: string) => {
    try {
      const url = conferenceId 
        ? `/api/editor/submissions?limit=50&conferenceId=${conferenceId}`
        : '/api/editor/submissions?limit=50'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const list = data.submissions.map((sub: any) => ({
          id: sub.id,
          title: sub.title,
          current: sub.id === submissionId,
          submittedAt: sub.submittedDate // 使用API回傳的submittedDate
        }))
        setSubmissionList(list)
      }
    } catch (error) {
      console.error('Failed to load submissions list:', error)
    }
  }

  const handleTabClick = (tab: string) => {
    setActiveTab(tab)
    // 根據需要進行導航或其他操作
    if (tab === 'manuscripts') {
      router.push('/editor/dashboard')
    }
  }

  useEffect(() => {
    // 檢查用戶認證狀態
    checkAuth()
  }, [])

  // 調試用戶數據載入狀態
  useEffect(() => {
    console.log('User state updated:', { user, authLoading })
  }, [user, authLoading])

  useEffect(() => {
    if (submissionId) {
      fetchSubmissionDetails()
      // 不再初始載入所有稿件，會在fetchSubmissionDetails成功後根據conference載入
    }
  }, [submissionId])

  const fetchSubmissionDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/editor/submissions/${submissionId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.submission) {
        throw new Error('無法獲取稿件資料')
      }
      
      const submissionData = data.submission
      
      // 轉換資料格式以符合 Submission 介面
      const formattedSubmission: Submission = {
        id: submissionData.id,
        title: submissionData.title,
        author: submissionData.authors.map((author: any) => author.name).join('、'),
        abstract: submissionData.abstract,
        keywords: submissionData.keywords || null, // 保持null值，讓顯示邏輯正確處理
        submittedAt: submissionData.submittedAt ? new Date(submissionData.submittedAt).toLocaleDateString('zh-TW') : '',
        files: submissionData.files ? submissionData.files.map((file: any) => ({
          id: file.id,
          name: file.originalName,
          url: `/api/submissions/download?fileId=${file.id}`,
          type: file.kind,
          size: file.size || 0
        })) : [],
        conference: submissionData.conference ? {
          id: submissionData.conference.id,
          year: submissionData.conference.year,
          title: submissionData.conference.title,
          tracks: submissionData.conference.tracks
        } : undefined
      }

      setSubmission(formattedSubmission)
      
      // 根據當前稿件的conference重新載入稿件列表
      if (submissionData.conference?.id) {
        loadSubmissionsList(submissionData.conference.id)
      }
      
      // 保存已指派的審稿人（包括未完成的）
      setAssignedReviewers(submissionData.reviewAssignments || [])
      
      // 轉換審稿結果（只顯示已完成的）
      const reviews = submissionData.reviewAssignments
        .filter((assignment: any) => assignment.review?.submittedAt)
        .map((assignment: any) => ({
          reviewer: assignment.reviewer.displayName,
          recommendation: getRecommendationText(assignment.review.recommendation),
          submittedDate: new Date(assignment.review.submittedAt).toLocaleDateString('zh-TW'),
          rating: assignment.review.score.toString(),
          details: assignment.review.commentToEditor || '無詳細評論'
        }))
      
      setReviewResults(reviews)
      
      // 處理決議資料
      const decisions = submissionData.decisions || []
      const formattedDecisions = decisions.map((decision: any) => ({
        id: decision.id,
        result: decision.result,
        note: decision.note,
        decidedAt: new Date(decision.decidedAt).toLocaleDateString('zh-TW'),
        decider: {
          displayName: decision.decider?.displayName || '未知'
        }
      }))
      
      setEditorDecisions(formattedDecisions)
      setLatestDecision(formattedDecisions.length > 0 ? formattedDecisions[0] : null)
      
    } catch (err) {
      console.error('Error fetching submission:', err)
      setError('載入稿件詳情失敗: ' + (err instanceof Error ? err.message : '未知錯誤'))
    } finally {
      setLoading(false)
    }
  }


  // 處理審稿人管理
  const handleOpenReviewerModal = async () => {
    try {
      setIsLoadingReviewers(true)
      setError('')
      
      // 載入可用的審稿人列表
      const response = await fetch('/api/editor/reviewers')
      if (!response.ok) {
        throw new Error('載入審稿人列表失敗')
      }
      
      const data = await response.json()
      setAvailableReviewers(data.reviewers || [])
      
      // 設置已選中的審稿人
      const currentReviewerIds = assignedReviewers.map(a => a.reviewer.id)
      setSelectedReviewers(currentReviewerIds)
      
      setShowReviewerModal(true)
    } catch (error) {
      console.error('載入審稿人列表失敗:', error)
      setError('載入審稿人列表失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setIsLoadingReviewers(false)
    }
  }

  const handleCloseReviewerModal = () => {
    setShowReviewerModal(false)
    setSelectedReviewers([])
    setAvailableReviewers([])
  }

  const handleReviewerSelection = (reviewerId: string) => {
    setSelectedReviewers(prev => {
      if (prev.includes(reviewerId)) {
        return prev.filter(id => id !== reviewerId)
      } else {
        return [...prev, reviewerId]
      }
    })
  }

  const handleSaveReviewerAssignments = async () => {
    try {
      setIsLoadingReviewers(true)
      setError('')

      const response = await fetch(`/api/editor/submissions/${submissionId}/assign-reviewer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewerIds: selectedReviewers
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '指派審稿人失敗')
      }

      // 重新載入稿件資訊
      await fetchSubmissionDetails()
      
      // 關閉模態視窗
      handleCloseReviewerModal()
      
      alert('審稿人指派成功！')
    } catch (error) {
      console.error('指派審稿人失敗:', error)
      setError('指派審稿人失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setIsLoadingReviewers(false)
    }
  }

  const handleDecisionSubmit = async () => {
    // 檢查是否有做出決議選擇
    if (!publishOnlineChecked && !publishPhysicalChecked && !rejectChecked) {
      setError('請選擇一個決議選項：線上發表、印刷發表或拒絕')
      return
    }

    // 確定決議結果
    let decision = ''
    if (rejectChecked) {
      decision = 'REJECT'
    } else if (publishOnlineChecked || publishPhysicalChecked) {
      decision = 'ACCEPT'
    } else {
      decision = 'REVISE'
    }

    // 建立詳細說明
    let detailedNote = decisionText
    if (publishOnlineChecked) {
      detailedNote += (detailedNote ? '\n\n' : '') + '決議：以線上論文發表'
    }
    if (publishPhysicalChecked) {
      detailedNote += (detailedNote ? '\n\n' : '') + '決議：以印刷論文發表'
    }

    setIsSubmittingDecision(true)
    setError('')

    try {
      const response = await fetch(`/api/editor/submissions/${submissionId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: decision,
          note: detailedNote.trim() || null
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '提交決議失敗')
      }

      // 成功提交後的處理
      alert('決議已成功提交並通知投稿者！')
      
      // 重新載入稿件資訊
      await fetchSubmissionDetails()
      
      // 清空表單
      setDecisionText('')
      setPublishOnlineChecked(false)
      setPublishPhysicalChecked(false)
      setRejectChecked(false)

    } catch (err) {
      console.error('Submit decision error:', err)
      setError('提交決議失敗: ' + (err instanceof Error ? err.message : '未知錯誤'))
    } finally {
      setIsSubmittingDecision(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center h-96">
          <div className="text-lg text-gray-600">載入中...</div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="text-lg text-red-600 mb-4">載入失敗</div>
            <div className="text-sm text-gray-600 mb-4">{error}</div>
            <button 
              onClick={() => {
                setError('')
                fetchSubmissionDetails()
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              重試
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main
        className="flex-1 px-4 py-8 md:px-14 md:py-14 bg-gray-100"
        style={{ overflow: 'visible' }}
      >
        <div className="flex flex-col w-full md:max-w-7xl md:mx-auto bg-gray-100">
          {/* 身份識別區域 */}
          <div className="mb-8 md:mb-[56px]">
            <div className="flex flex-col md:flex-row rounded-lg shadow-sm min-h-[132px]">
              {/* 左側：投稿作者身份標識 */}
              <div
                className={`${
                  user?.roles?.includes('CHIEF_EDITOR')
                    ? 'bg-purple-500'
                    : 'bg-blue-500'
                } text-white px-6 md:ps-[48px] py-6 md:py-[32px] md:pe-[211px] flex items-center gap-4 md:gap-6`}
              >
                <div className="w-12 h-12 md:w-[64px] md:h-[64px]">
                  <PenTool className="w-full h-full text-white" />
                </div>
                <div>
                  <div className="text-sm md:text-lg opacity-90">
                    {user?.displayName || '載入中...'}
                  </div>
                  <div className="text-lg md:text-xl font-medium">
                    {user?.roles?.includes('CHIEF_EDITOR')
                      ? '主編'
                      : user?.roles?.includes('EDITOR')
                      ? '編輯'
                      : '用戶'}
                  </div>
                </div>
              </div>

              {/* 右側：研討會標題和控制項 */}
              <div className="relative z-[60] bg-white flex-1 px-6 md:px-[48px] py-6 md:py-[45px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1 flex items-center gap-5">
                  <h1
                    className={`text-lg md:text-[28px] font-medium ${
                      user?.roles?.includes('CHIEF_EDITOR')
                        ? 'text-purple-600'
                        : 'text-blue-600'
                    } leading-tight`}
                  >
                    {submission?.conference?.title || '載入研討會資訊中...'}
                  </h1>
                  <div className="w-[2px] h-[56px] bg-gray-200"></div>
                </div>
                <div className="relative z-[70] flex items-center gap-[40px]">
                  <div
                    onClick={() => router.push('/editor/dashboard')}
                    className="text-24M font-medium text-gray-900 hover:text-gray-600 cursor-pointer"
                  >
                    返回
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-[56px]">
            {/* 左側邊欄 - 稿件列表 */}
            <div className="w-fit bg-white border-r min-h-screen">
              {/* 稿件列表 */}
              <div className="p-[48px]">
                <h3 className="text-28M font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <PenTool className="w-4 h-4" /> 審稿列表
                </h3>
                <div className="space-y-1 mt-[16px] ">
                  {submissionList.map(item => (
                    <div
                      key={item.id}
                      onClick={() =>
                        router.push(`/editor/submissions/${item.id}`)
                      }
                      className={`p-2 w-[300px] text-sm rounded cursor-pointer overflow-hidden ${
                        item.current
                          ? 'bg-purple-100 text-purple-700 border-l-3 border-purple-500'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      title={item.title}
                    >
                      <div className="font-medium">稿件編號：{formatSubmissionNumberSimple(item.id, item.submittedAt)}</div>
                      <div className="text-xs mt-1 truncate opacity-75">
                        {item.title.length > 25
                          ? item.title.substring(0, 25) + '...'
                          : item.title}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 右側主要內容 */}
            <div className="flex-1">
              {/* 稿件編號顯示 */}
              <div className="text-[32px] font-medium text-gray-500">
                稿件編號：{submission ? formatSubmissionNumber(submission) : submissionId}
              </div>
              <hr className="border-gray-300 mt-[24px]" />
              {/* 頁面標題 */}
              <h1 className="text-[64px] font-bold text-gray-900 my-[48px]">
                稿件資訊
              </h1>

              {submission && (
                <div className="space-y-8">
                  {/* 稿件資訊區塊 */}
                  <div className="bg-white">
                    <div className="space-y-[48px] p-[48px]">
                      <div>
                        <h3 className="text-40M font-medium text-gray-900 ">
                          {submission.title}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-4 text-sm space-y-[48px]">
                        <div>
                          <span className="text-28M font-medium text-gray-700">
                            摘要：
                          </span>
                          <span className="text-28M text-gray-600">
                            {submission.abstract}
                          </span>
                        </div>

                        <div>
                          <span className="text-28M font-medium text-gray-700">
                            關鍵字：
                          </span>
                          <span className="text-28M text-gray-600">
                            {submission.keywords && submission.keywords.trim() ? submission.keywords : '未提供'}
                          </span>
                        </div>

                        <div>
                          <span className="text-28M font-medium text-gray-700">
                            提交日期：
                          </span>
                          <span className="text-28M text-gray-600">
                            {submission.submittedAt || '未提交'}
                          </span>
                        </div>

                        <div>
                          <span className="text-28M font-medium text-gray-700">
                            稿件資料：
                          </span>
                          <div className="mt-4">
                            {submission.files && submission.files.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">序號</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">檔案名稱</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">類型</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">大小</th>
                                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {submission.files.map((file, index) => (
                                      <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                                        <td className="px-4 py-3">
                                          <div className="text-sm text-gray-900 font-medium">{file.name}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                          {file.type === 'MANUSCRIPT_ANONYMOUS' ? '匿名稿件' : 
                                           file.type === 'TITLE_PAGE' ? '標題頁面' : '其他'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                          {file.size ? `${Math.round(file.size / 1024)}KB` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => previewFile(file.id, file.name)}
                                              className="text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded border border-blue-300 hover:border-blue-500 transition-colors text-xs"
                                              title="在新視窗預覽檔案"
                                            >
                                              預覽
                                            </button>
                                            <button
                                              onClick={() => downloadFile(file.id, file.name)}
                                              className="text-purple-600 hover:text-purple-800 font-medium px-2 py-1 rounded border border-purple-300 hover:border-purple-500 transition-colors text-xs"
                                              title="下載原檔案到本機"
                                            >
                                              下載
                                            </button>
                                            <span className="text-xs text-gray-400">
                                              {file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc') ? 'Word檔' :
                                               file.name.toLowerCase().endsWith('.pdf') ? 'PDF檔' :
                                               file.name.toLowerCase().endsWith('.txt') ? '文字檔' : '檔案'}
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-28M text-gray-500 py-4 text-center bg-gray-50 rounded-lg">
                                尚無檔案
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 管理審稿人區塊 */}
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-40M font-bold text-gray-900">
                      管理審稿人
                    </h2>
                    <button
                      onClick={handleOpenReviewerModal}
                      disabled={isLoadingReviewers}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PenTool className="w-4 h-4" />
                      {isLoadingReviewers ? '載入中...' : (assignedReviewers.length === 0 ? '分配審稿人' : '編輯審稿人')}
                    </button>
                  </div>
                  <div className="bg-white p-4">
                    {loading ? (
                      <div className="text-center text-gray-500">
                        載入中...
                      </div>
                    ) : assignedReviewers.length === 0 ? (
                      <div className="text-center text-gray-500">
                        <div className="py-8">
                          <PenTool className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <div className="text-lg font-medium text-gray-400 mb-2">尚未指派審稿人</div>
                          <div className="text-sm text-gray-400">點擊上方「分配審稿人」按鈕開始指派</div>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                審稿人
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                指派日期
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                邀請回覆
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                審查截止日
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                審稿進度
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                操作
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {assignedReviewers.map((assignment: any) => (
                              <tr
                                key={assignment.id}
                                className="border-b border-gray-100"
                              >
                                <td className="py-4 px-4">
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {assignment.reviewer.displayName}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {assignment.reviewer.affiliation ||
                                        '單位資訊待完善'}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {assignment.reviewer.expertise &&
                                      assignment.reviewer.expertise.length > 0
                                        ? assignment.reviewer.expertise.join(
                                            '、'
                                          )
                                        : 'AR、科學教育'}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-sm text-gray-600">
                                  {new Date(
                                    assignment.createdAt
                                  ).toLocaleDateString('zh-TW')}
                                </td>
                                <td className="py-4 px-4">
                                  <span
                                    className={`inline-block px-2 py-1 text-xs rounded ${
                                      assignment.status === 'ACCEPTED'
                                        ? 'bg-green-100 text-green-700'
                                        : assignment.status === 'DECLINED'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {assignment.status === 'ACCEPTED'
                                      ? '已接受'
                                      : assignment.status === 'DECLINED'
                                      ? '已拒絕'
                                      : '待回覆'}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-sm text-gray-600">
                                  {assignment.dueAt
                                    ? new Date(
                                        assignment.dueAt
                                      ).toLocaleDateString('zh-TW')
                                    : '-'}
                                </td>
                                <td className="py-4 px-4">
                                  <span
                                    className={`inline-block px-2 py-1 text-xs rounded ${
                                      assignment.review?.submittedAt
                                        ? 'bg-green-100 text-green-700'
                                        : assignment.status === 'ACCEPTED'
                                        ? 'bg-gray-100 text-gray-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {assignment.review?.submittedAt
                                      ? '已提交'
                                      : assignment.status === 'ACCEPTED'
                                      ? '待完成'
                                      : '-'}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <div className="flex items-center justify-center space-x-2">
                                    {assignment.status === 'PENDING' && (
                                      <button
                                        onClick={() => {
                                          // 重新發送邀請
                                          console.log('重新發送邀請給', assignment.reviewer.displayName)
                                        }}
                                        className="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded border border-blue-300 hover:border-blue-500 transition-colors"
                                        title="重新發送邀請"
                                      >
                                        重新邀請
                                      </button>
                                    )}
                                    {assignment.status === 'DECLINED' && (
                                      <button
                                        onClick={() => {
                                          // 移除此審稿人
                                          console.log('移除審稿人', assignment.reviewer.displayName)
                                        }}
                                        className="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded border border-red-300 hover:border-red-500 transition-colors"
                                        title="移除審稿人"
                                      >
                                        移除
                                      </button>
                                    )}
                                    {(assignment.status === 'ACCEPTED' || assignment.review?.submittedAt) && (
                                      <button
                                        onClick={() => {
                                          // 查看詳細審稿意見
                                          console.log('查看審稿詳情', assignment.reviewer.displayName)
                                        }}
                                        className="text-purple-600 hover:text-purple-800 text-sm px-2 py-1 rounded border border-purple-300 hover:border-purple-500 transition-colors"
                                        title="查看詳細審稿意見"
                                      >
                                        查看詳情
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        // 發送提醒或更改截止日期
                                        console.log('發送提醒給', assignment.reviewer.displayName)
                                      }}
                                      className="text-orange-600 hover:text-orange-800 text-sm px-2 py-1 rounded border border-orange-300 hover:border-orange-500 transition-colors"
                                      title="發送提醒"
                                    >
                                      提醒
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 審稿結果區塊 */}
                    <h2 className="text-40M font-bold text-gray-900 mb-6">
                      審稿結果
                    </h2>
                  <div className="bg-white p-4">

                    {reviewResults.length === 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                審稿人
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                審稿建議
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                提交日期
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                評分
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                詳細
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td
                                className="py-4 px-4 text-center text-gray-500"
                                colSpan={5}
                              >
                                {loading ? '載入中...' : '尚未有審稿結果'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      // 如果有審稿結果則顯示
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                審稿人
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                審稿建議
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                提交日期
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                評分
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                詳細
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {reviewResults.map((review, index) => (
                              <tr key={index} className="border-b">
                                <td className="py-3 px-4">{review.reviewer}</td>
                                <td className="py-3 px-4">
                                  {review.recommendation}
                                </td>
                                <td className="py-3 px-4">
                                  {review.submittedDate}
                                </td>
                                <td className="py-3 px-4">{review.rating}</td>
                                <td className="py-3 px-4">
                                  <button className="text-gray-400 hover:text-gray-600">
                                    <svg
                                      className="w-4 h-4"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 最終決議區塊 */}
                    <h2 className="text-40M font-bold text-gray-900 mb-6">
                      最終決議
                    </h2>

                  {/* 主編決議區塊 */}
                  <div className="bg-white p-4">
                    <h2 className="text-28M font-bold text-gray-900 mb-4">
                      主編決議
                    </h2>
                    <hr className="border-gray-300 my-[24px]" />
                    
                    {/* 如果已有決議，顯示決議內容 */}
                    {latestDecision ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center mb-3">
                            <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-green-700 font-medium">已完成最終決議</span>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm font-medium text-gray-700">決議結果：</span>
                              <span className={`ml-2 px-2 py-1 text-xs rounded ${
                                latestDecision.result === 'ACCEPT' ? 'bg-green-100 text-green-700' :
                                latestDecision.result === 'REJECT' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {latestDecision.result === 'ACCEPT' ? '接受' :
                                 latestDecision.result === 'REJECT' ? '拒絕' : '需修改'}
                              </span>
                            </div>
                            
                            {latestDecision.note && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">決議說明：</span>
                                <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-600">
                                  {latestDecision.note}
                                </div>
                              </div>
                            )}
                            
                            <div>
                              <span className="text-sm font-medium text-gray-700">決議者：</span>
                              <span className="ml-2 text-sm text-gray-600">{latestDecision.decider.displayName}</span>
                            </div>
                            
                            <div>
                              <span className="text-sm font-medium text-gray-700">決議時間：</span>
                              <span className="ml-2 text-sm text-gray-600">{latestDecision.decidedAt}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* 如果沒有決議，顯示決議表單 */}
                    
                    {/* 根據審稿狀態顯示不同的提示訊息 */}
                    {assignedReviewers.length > 0 && reviewResults.length === 0 && (
                      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span className="text-blue-700 font-medium">已指派審稿人，主編可隨時進行最終決議</span>
                        </div>
                      </div>
                    )}
                    
                    {assignedReviewers.length > 0 && reviewResults.length > 0 && (
                      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-green-700 font-medium">已收到審稿結果，可參考審稿意見進行最終決議</span>
                        </div>
                      </div>
                    )}
                    
                    {assignedReviewers.length === 0 && (
                      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span className="text-blue-700 font-medium">尚未指派審稿人，主編可直接進行最終決議</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-6">
                      {/* 文字輸入區域 */}
                      <div>
                        <textarea
                          value={decisionText}
                          onChange={e => setDecisionText(e.target.value)}
                          placeholder="請輸入對稿件的綜合評估與具體建議..."
                          className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      {/* 主編決議選項 */}
                      <div>
                        <h3 className="text-lg font-medium mb-4 text-gray-900">
                          主編決議
                        </h3>
                        <div className="space-y-3">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={publishOnlineChecked}
                              onChange={e =>
                                setPublishOnlineChecked(e.target.checked)
                              }
                              className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <span className="ml-3 text-gray-700">
                              以線上論文發表
                            </span>
                          </label>

                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={publishPhysicalChecked}
                              onChange={e =>
                                setPublishPhysicalChecked(e.target.checked)
                              }
                              className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <span className="ml-3 text-gray-700">
                              以印刷論文發表
                            </span>
                          </label>

                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rejectChecked}
                              onChange={e => setRejectChecked(e.target.checked)}
                              className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <span className="ml-3 text-gray-700">拒絕</span>
                          </label>
                        </div>
                      </div>

                      {/* 錯誤訊息 */}
                      {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="text-red-700 text-sm">{error}</div>
                        </div>
                      )}

                      {/* 操作按鈕 */}
                      <div className="flex space-x-4 pt-4">
                        <button
                          onClick={() => {
                            /* 保存邏輯 */
                          }}
                          disabled={isSubmittingDecision}
                          className="px-6 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          保存
                        </button>

                        <button
                          onClick={handleDecisionSubmit}
                          disabled={isSubmittingDecision}
                          className="px-6 py-2 rounded-lg flex items-center gap-2 bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmittingDecision ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              提交中...
                            </>
                          ) : (
                            '發送審稿結果給投稿人'
                          )}
                        </button>
                      </div>
                    </div>
                      </>
                    )}
                  </div>
                  
                  {/* 決議歷史區塊 - 只有當有多個決議時才顯示 */}
                  {editorDecisions.length > 1 && (
                    <div className="mt-6">
                      <h2 className="text-28M font-bold text-gray-900 mb-4">
                        決議歷史
                      </h2>
                      <div className="bg-white p-4">
                        <div className="space-y-4">
                          {editorDecisions.map((decision, index) => (
                            <div key={decision.id} className={`p-4 rounded-lg border ${index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center">
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    decision.result === 'ACCEPT' ? 'bg-green-100 text-green-700' :
                                    decision.result === 'REJECT' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {decision.result === 'ACCEPT' ? '接受' :
                                     decision.result === 'REJECT' ? '拒絕' : '需修改'}
                                  </span>
                                  {index === 0 && (
                                    <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                      最新決議
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {decision.decidedAt} · {decision.decider.displayName}
                                </div>
                              </div>
                              
                              {decision.note && (
                                <div className="mt-2 p-3 bg-white rounded text-sm text-gray-600">
                                  {decision.note}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* 審稿人管理模態視窗 */}
      {showReviewerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-lg w-full max-w-[1200px] h-[80vh] overflow-hidden shadow-2xl flex flex-col">
            {/* 標題列 */}
            <div className="px-6 py-4 flex items-center justify-center relative border-b border-gray-200">
              <h3 className="text-2xl font-medium text-gray-900">
                {assignedReviewers.length === 0 ? '分配審稿人' : '編輯審稿人'}
              </h3>
              <button
                onClick={handleCloseReviewerModal}
                className="absolute right-6 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 內容區域 */}
            <div className="p-6 flex-1 overflow-hidden flex flex-col">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* 當前已指派的審稿人 */}
              {assignedReviewers.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">已指派的審稿人</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      {assignedReviewers.map((assignment: any, index: number) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-600 font-medium text-sm">
                                {assignment.reviewer.displayName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{assignment.reviewer.displayName}</div>
                              <div className="text-sm text-gray-600">{assignment.reviewer.affiliation || '單位資訊待完善'}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-block px-2 py-1 text-xs rounded ${
                              assignment.status === 'ACCEPTED'
                                ? 'bg-green-100 text-green-700'
                                : assignment.status === 'DECLINED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {assignment.status === 'ACCEPTED' ? '已接受' : assignment.status === 'DECLINED' ? '已拒絕' : '待回覆'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 可用審稿人列表 */}
              <div className="flex-1 min-h-0">
                <h4 className="text-lg font-medium text-gray-900 mb-3">可用審稿人</h4>
                {availableReviewers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {isLoadingReviewers ? '載入審稿人列表中...' : '無可用審稿人'}
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden h-full flex flex-col">
                    <div className="bg-gray-50 px-4 py-3 flex border-b">
                      <div className="w-16 text-sm font-medium text-gray-500">選擇</div>
                      <div className="w-32 text-sm font-medium text-gray-500">審稿人</div>
                      <div className="flex-1 text-sm font-medium text-gray-500">服務單位</div>
                      <div className="w-48 text-sm font-medium text-gray-500">專業領域</div>
                      <div className="w-24 text-sm font-medium text-gray-500">審稿次數</div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {availableReviewers.map((reviewer) => (
                        <div key={reviewer.id} className="px-4 py-3 border-b border-gray-100 flex items-center hover:bg-gray-50">
                          <div className="w-16 flex justify-center">
                            <input
                              type="checkbox"
                              checked={selectedReviewers.includes(reviewer.id)}
                              onChange={() => handleReviewerSelection(reviewer.id)}
                              className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                            />
                          </div>
                          <div className="w-32">
                            <div className="font-medium text-gray-900 text-sm">{reviewer.displayName}</div>
                            <div className="text-xs text-gray-600">{reviewer.email}</div>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">{reviewer.affiliation || '單位資訊待完善'}</div>
                          </div>
                          <div className="w-48">
                            <div className="text-sm text-gray-600">
                              {reviewer.expertise && reviewer.expertise.length > 0 
                                ? reviewer.expertise.slice(0, 2).join('、') + (reviewer.expertise.length > 2 ? '...' : '')
                                : '專業領域待完善'}
                            </div>
                          </div>
                          <div className="w-24 text-center">
                            <div className="text-sm text-gray-600">{reviewer.reviewCount || 0}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={handleCloseReviewerModal}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveReviewerAssignments}
                disabled={isLoadingReviewers || selectedReviewers.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoadingReviewers ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    保存中...
                  </>
                ) : (
                  `保存 (已選 ${selectedReviewers.length} 人)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 輔助函數
function getAssignmentStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': '待回應',
    'ACCEPTED': '已接受',
    'DECLINED': '已拒絕',
    'SUBMITTED': '已完成'
  }
  return statusMap[status] || status
}

function getRecommendationText(recommendation: string): string {
  const recommendationMap: Record<string, string> = {
    'ACCEPT': '建議接受',
    'MINOR_REVISION': '建議小修',
    'MAJOR_REVISION': '建議大修',
    'REJECT': '建議拒絕'
  }
  return recommendationMap[recommendation] || recommendation
}