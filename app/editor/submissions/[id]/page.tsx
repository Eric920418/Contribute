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
}

interface FileInfo {
  name: string
  url: string
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
  orcid?: string
  currentAssignments: number
  completedReviews: number
  isAvailable: boolean
  expertise: string[]
  averageResponseTime?: number | null
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
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [editorDecision, setEditorDecision] = useState('')
  const [decisionText, setDecisionText] = useState('')
  const [publishOnlineChecked, setPublishOnlineChecked] = useState(false)
  const [publishPhysicalChecked, setPublishPhysicalChecked] = useState(false)
  const [rejectChecked, setRejectChecked] = useState(false)
  
  // 指派審稿人相關狀態
  const [availableReviewers, setAvailableReviewers] = useState<Reviewer[]>([])
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([])
  const [reviewDueDate, setReviewDueDate] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [invitationContent, setInvitationContent] = useState('')
  const [error, setError] = useState('')

  // 左側邊欄稿件列表
  const submissionList = [
    { id: '230', current: true },
    { id: '231', current: false },
    { id: '232', current: false },
    { id: '233', current: false },
    { id: '234', current: false },
    { id: '235', current: false },
    { id: '236', current: false },
    { id: '237', current: false },
    { id: '238', current: false },
    { id: '239', current: false },
    { id: '240', current: false },
  ]

  // 模擬審稿結果
  const reviewResults: ReviewResult[] = []

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
    }
  }, [submissionId])

  const fetchSubmissionDetails = async () => {
    try {
      setLoading(true)
      // 模擬 API 調用
      const mockSubmission: Submission = {
        id: '230',
        title: '結合生成式人工智慧與數位思考於國小創意寫作課程之教學設計與實施：對學生心理健康之影響',
        author: '本研究旨在探討數位敘事結合AI創意生成技術應用於國小社會領域課程之實踐成效與教學應用。透過引導學生運用文本創作、語音輸入以及影像生成工具，自主建構數位內容並產出創作品，促進其對歷史主題之文化認知及公民素養增能，培養創新數位敘事能力、研究採用研究數設計，於某國小輔行教學實驗，蒐集學生作品、訪談資料與連續觀察紀錄進行質性分析。',
        abstract: '本研究旨在探討數位敘事結合AI創意生成技術應用於國小社會領域課程之實踐成效與教學應用。透過引導學生運用文本創作、語音輸入以及影像生成工具，自主建構數位內容並產出創作品，促進其對歷史主題之文化認知及公民素養增能，培養創新數位敘事能力、研究採用研究數設計，於某國小輔行教學實驗，蒐集學生作品、訪談資料與連續觀察紀錄進行質性分析。',
        keywords: '建構思維、人工智慧技術優學數位數、21世紀技能/批判性思考能力',
        submittedAt: '2025/06/10',
        files: [
          { name: '231_原名稿件.docx', url: '#' },
          { name: '231_修正稿.docx', url: '#' }
        ]
      }

      setSubmission(mockSubmission)
    } catch (err) {
      console.error('Error fetching submission:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignReviewer = async () => {
    setShowAssignModal(true)
    await loadAvailableReviewers()
    
    // 設定默認的回覆截止日期（30天後）
    const defaultDueDate = new Date()
    defaultDueDate.setDate(defaultDueDate.getDate() + 30)
    setReviewDueDate(defaultDueDate.toISOString().split('T')[0])

    // 設定默認的邀請內容
    const defaultInvitation = `親愛的審稿人，您好：

我們誠摯地邀請您擔任以下論文的審稿人：

論文標題：${submission?.title || ''}

摘要：
${submission?.abstract || ''}

關鍵字：${submission?.keywords || ''}

請您在截止日期前提供您寶貴的審稿意見，包含：
1. 論文的學術價值和創新性
2. 研究方法的嚴謹性
3. 論述的邏輯性和完整性
4. 語言表達和格式規範
5. 修改建議或評審結論

感謝您對學術社群的貢獻。

此致
敬禮

國立臺北教育大學課程與教學傳播科技研究所`

    setInvitationContent(defaultInvitation)
  }
  
  const loadAvailableReviewers = async () => {
    try {
      setError('')
      // 模擬 API 調用 - 實際應該從 /api/editor/reviewers 獲取
      const mockReviewers: Reviewer[] = [
        {
          id: '1',
          displayName: '李四教授',
          email: 'li@example.edu.tw',
          currentAssignments: 2,
          completedReviews: 15,
          isAvailable: true,
          expertise: ['人工智慧', '教育科技']
        },
        {
          id: '2',
          displayName: '王五博士',
          email: 'wang@example.edu.tw',
          currentAssignments: 1,
          completedReviews: 8,
          isAvailable: true,
          expertise: ['學習分析', '數位學習']
        },
        {
          id: '3',
          displayName: '張三副教授',
          email: 'zhang@example.edu.tw',
          currentAssignments: 4,
          completedReviews: 23,
          isAvailable: false,
          expertise: ['教育心理學', '認知科學']
        }
      ]
      
      setAvailableReviewers(mockReviewers)
    } catch (error: any) {
      setError('載入審稿人列表失敗: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleReviewerToggle = (reviewerId: string) => {
    setSelectedReviewers(prev => 
      prev.includes(reviewerId)
        ? prev.filter(id => id !== reviewerId)
        : [...prev, reviewerId]
    )
  }

  const handleAssignSubmit = async () => {
    if (selectedReviewers.length === 0) {
      setError('請至少選擇一位審稿人')
      return
    }

    try {
      setIsAssigning(true)
      setError('')

      // 模擬 API 調用 - 實際應該調用 /api/editor/submissions/[id]/assign-reviewer
      console.log('Assigning reviewers:', {
        submissionId,
        reviewerIds: selectedReviewers,
        dueDate: reviewDueDate,
        invitationContent
      })
      
      // 模擬成功
      setTimeout(() => {
        setIsAssigning(false)
        setShowAssignModal(false)
        setSelectedReviewers([])
        setReviewDueDate('')
        setInvitationContent('')
        setError('')
        // 可以在這裡顯示成功消息或重新載入頁面
      }, 2000)
      
    } catch (error: any) {
      setError('指派審稿人失敗: ' + (error.response?.data?.error || error.message))
    } finally {
      setIsAssigning(false)
    }
  }

  const handleCloseAssignModal = () => {
    setShowAssignModal(false)
    setSelectedReviewers([])
    setReviewDueDate('')
    setInvitationContent('')
    setError('')
  }

  const handleDecisionSubmit = () => {
    console.log('Editor Decision:', {
      submissionId,
      decision: editorDecision,
      text: decisionText,
      publishOnline: publishOnlineChecked,
      publishPhysical: publishPhysicalChecked,
      reject: rejectChecked
    })
    // 這裡應該呼叫 API 提交決議
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

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main
        className="flex-1 px-4 py-8 md:px-14 md:py-14 bg-gray-100"
        style={{ overflow: 'visible' }}
      >
        <div className="flex flex-col max-w-7xl mx-auto bg-gray-100">
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
                    2025 AI時代課程教學與傳播科技研討會
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

          <div className="flex">
            {/* 左側邊欄 - 稿件列表 */}
            <div className="w-64 bg-white border-r min-h-screen">
              {/* 稿件ID顯示 */}
              <div className="p-4 border-b">
                <div className="text-sm text-gray-500">稿件ID：230</div>
              </div>

              {/* 稿件列表 */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  稿件列表
                </h3>
                <div className="space-y-1">
                  {submissionList.map(item => (
                    <div
                      key={item.id}
                      className={`p-2 text-sm rounded cursor-pointer ${
                        item.current
                          ? 'bg-purple-100 text-purple-700 border-l-3 border-purple-500'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      稿件ID：{item.id}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 右側主要內容 */}
            <div className="flex-1 p-8">
              {/* 頁面標題 */}
              <h1 className="text-2xl font-bold text-gray-900 mb-8">
                稿件資訊
              </h1>

              {submission && (
                <div className="space-y-8">
                  {/* 稿件資訊區塊 */}
                  <div className="bg-white">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">
                      稿件資訊
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {submission.title}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">
                            摘要：
                          </span>
                          <span className="text-gray-600">
                            {submission.abstract}
                          </span>
                        </div>

                        <div>
                          <span className="font-medium text-gray-700">
                            關鍵字：
                          </span>
                          <span className="text-gray-600">
                            {submission.keywords}
                          </span>
                        </div>

                        <div>
                          <span className="font-medium text-gray-700">
                            提交日期：
                          </span>
                          <span className="text-gray-600">
                            {submission.submittedAt}
                          </span>
                        </div>

                        <div>
                          <span className="font-medium text-gray-700">
                            稿件資料：
                          </span>
                          <div className="mt-1 space-y-1">
                            {submission.files.map((file, index) => (
                              <a
                                key={index}
                                href={file.url}
                                className="text-purple-600 hover:text-purple-800 block"
                              >
                                {file.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 管理審稿人區塊 */}
                  <div className="bg-white">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900">
                        管理審稿人
                      </h2>
                      <button
                        onClick={handleAssignReviewer}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg flex items-center"
                      >
                        <span className="mr-2">+</span>
                        指派審稿人
                      </button>
                    </div>

                    <div className="text-center py-8 text-gray-500">
                      「尚未指派審稿人」
                    </div>
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
                                -
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

                      {/* 操作按鈕 */}
                      <div className="flex space-x-4 pt-4">
                        <button
                          onClick={() => {
                            /* 保存邏輯 */
                          }}
                          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          保存
                        </button>

                        <button
                          onClick={handleDecisionSubmit}
                          className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                          發送審稿結果給投稿人
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

      {/* 指派審稿人模態視窗 */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-[1200px] max-h-[90vh] overflow-hidden shadow-2xl">
            {/* 標題列 */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
              <h3 className="text-xl font-medium text-gray-900">指派審稿人</h3>
              <button
                onClick={handleCloseAssignModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* 內容區域 */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* 審稿人列表表格 */}
              <div className="mb-6">
                {availableReviewers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    載入審稿人列表中...
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-12">
                            選擇
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-24">
                            審稿人
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-48">
                            服務單位與職稱
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-48">
                            專業領域
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-20">
                            歷史審稿次數
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-24">
                            最近審稿日期
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {availableReviewers.map(reviewer => (
                          <tr
                            key={reviewer.id}
                            className={`hover:bg-gray-50 ${
                              !reviewer.isAvailable ? 'opacity-60' : ''
                            }`}
                          >
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedReviewers.includes(
                                  reviewer.id
                                )}
                                onChange={() =>
                                  reviewer.isAvailable &&
                                  handleReviewerToggle(reviewer.id)
                                }
                                disabled={!reviewer.isAvailable}
                                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                              />
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-gray-900">
                              {reviewer.displayName}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              暫無服務單位資料
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {reviewer.expertise.length > 0
                                ? reviewer.expertise.slice(0, 2).join('、')
                                : '暫無專業領域資料'}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600 text-center">
                              {reviewer.completedReviews}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {reviewer.completedReviews > 0
                                ? '暫無日期資料'
                                : '無'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 下半部：左右兩欄佈局 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 左側：審查邀請內容設定 */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    審查邀請內容設定
                  </h4>
                  <div className="space-y-4">
                    <textarea
                      className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={invitationContent}
                      onChange={e => setInvitationContent(e.target.value)}
                      placeholder="請輸入邀請內容..."
                    />
                  </div>
                </div>

                {/* 右側：日期設定和按鈕 */}
                <div>
                  <div className="space-y-6">
                    {/* 回覆截止日 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        回覆截止日
                      </label>
                      <input
                        type="date"
                        value={reviewDueDate}
                        onChange={e => setReviewDueDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    {/* 審查截止日 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        審查截止日
                      </label>
                      <input
                        type="date"
                        value={(() => {
                          if (!reviewDueDate) return ''
                          const date = new Date(reviewDueDate)
                          date.setDate(date.getDate() + 15)
                          return date.toISOString().split('T')[0]
                        })()}
                        onChange={() => {}} // 自動計算，不需要手動修改
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        readOnly
                      />
                    </div>

                    {/* 發送按鈕 */}
                    <div className="pt-4">
                      <button
                        onClick={handleAssignSubmit}
                        disabled={
                          selectedReviewers.length === 0 ||
                          isAssigning ||
                          !reviewDueDate
                        }
                        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isAssigning ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            發送中...
                          </>
                        ) : (
                          `發送指派信 (${selectedReviewers.length}位)`
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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