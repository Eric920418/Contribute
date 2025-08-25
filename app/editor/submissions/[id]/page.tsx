'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '../../../../components/layout/Header'
import Footer from '../../../../components/layout/Footer'
import { PenTool } from 'lucide-react'
import { useAuth } from '../../../../hooks/useAuth'
import YearDropdown from '../../../../components/ui/YearDropdown'

// 根據截圖重新設計的介面
interface Submission {
  id: string
  title: string
  author: string
  abstract: string
  keywords: string
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
  const [submissionList, setSubmissionList] = useState<{id: string, title: string, current: boolean}[]>([])
  
  // 審稿結果
  const [reviewResults, setReviewResults] = useState<ReviewResult[]>([])
  
  // 已指派的審稿人
  const [assignedReviewers, setAssignedReviewers] = useState<any[]>([])

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
          current: sub.id === submissionId
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
        keywords: submissionData.keywords || '',
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
      
    } catch (err) {
      console.error('Error fetching submission:', err)
      setError('載入稿件詳情失敗: ' + (err instanceof Error ? err.message : '未知錯誤'))
    } finally {
      setLoading(false)
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
                      <div className="font-medium">稿件ID：{item.id}</div>
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
              {/* 稿件ID顯示 */}
              <div className="text-[32px] font-medium text-gray-500">
                稿件ID：{submissionId}
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
                            {submission.keywords || '未提供'}
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
                                          <button
                                            onClick={() => downloadFile(file.id, file.name)}
                                            className="text-purple-600 hover:text-purple-800 font-medium"
                                          >
                                            下載
                                          </button>
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
                  <div className="bg-white">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                      管理審稿人
                    </h2>

                    {loading ? (
                      <div className="text-center py-8 text-gray-500">
                        載入中...
                      </div>
                    ) : assignedReviewers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        「尚未指派審稿人」
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
                                  <span className="text-gray-400">-</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 審稿結果區塊 */}
                  <div className="bg-white">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                      審稿結果
                    </h2>

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
                  <div className="bg-white">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                      最終決議
                    </h2>
                  </div>

                  {/* 主編決議區塊 */}
                  <div className="bg-white">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                      主編決議
                    </h2>

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
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          主編決議
                        </h3>
                        <div className="space-y-3">
                          <label className="flex items-center">
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

                          <label className="flex items-center">
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

                          <label className="flex items-center">
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
                          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          保存
                        </button>

                        <button
                          onClick={handleDecisionSubmit}
                          disabled={isSubmittingDecision}
                          className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
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