'use client'

import { useState, useEffect } from 'react'
import { FileText, Clock, CheckCircle, AlertCircle, Star, Calendar, Download, PenTool, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { apiClient } from '@/lib/api/client'
import YearDropdown from '@/components/ui/YearDropdown'
import { useAuth } from '@/hooks/useAuth'

interface ReviewAssignment {
  id: string
  title: string
  authors: string[]
  status: 'pending' | 'in_progress' | 'completed'
  dueDate: string
  assignedDate: string
  submittedDate?: string
  priority: 'high' | 'medium' | 'low'
  paperType: string
  suggestion?: 'accept_poster' | 'reject' | 'accept_oral'
}

const mockAssignments: ReviewAssignment[] = [
  {
    id: '1',
    title: '基於深度學習的智慧教學系統設計與實現',
    authors: ['張教授', '李博士', '王研究員'],
    status: 'pending',
    dueDate: '2025-09-15',
    assignedDate: '2025-08-01',
    priority: 'high',
    paperType: '研究論文',
  },
  {
    id: '2', 
    title: '虛擬實境在課程設計中的應用研究',
    authors: ['陳教授', '林博士'],
    status: 'in_progress',
    dueDate: '2025-09-20',
    assignedDate: '2025-08-05',
    submittedDate: '2025-08-10',
    priority: 'medium',
    paperType: '應用研究',
  },
  {
    id: '3',
    title: '人工智慧輔助語言學習平台效果評估',
    authors: ['黃教授'],
    status: 'completed',
    dueDate: '2025-08-30',
    assignedDate: '2025-07-20',
    submittedDate: '2025-08-25',
    priority: 'low',
    paperType: '實驗研究',
    suggestion: 'accept_oral',
  }
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="w-5 h-5 text-amber-500" />
    case 'in_progress':
      return <AlertCircle className="w-5 h-5 text-blue-500" />
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-500" />
    default:
      return <FileText className="w-5 h-5 text-gray-500" />
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return '待審稿'
    case 'in_progress':
      return '審稿中'
    case 'completed':
      return '已完成'
    default:
      return '未知'
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getDaysRemaining = (dueDate: string): number => {
  const today = new Date()
  const due = new Date(dueDate)
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export default function ReviewerDashboard() {
  const [assignments, setAssignments] = useState<ReviewAssignment[]>(mockAssignments)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
  const [year, setYear] = useState(2025)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ReviewAssignment | null
    direction: 'asc' | 'desc'
  }>({ key: null, direction: 'asc' })
  const { user, isAuthenticated, checkAuth } = useAuth()

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        
        // 檢查認證狀態
        if (!isAuthenticated) {
          await checkAuth()
        }
        
        // 這裡之後可以替換為實際的 API 調用
        // const response = await apiClient.get('/reviewer/assignments')
        // setAssignments(response.data)
        
        // 暫時使用 mock 數據
        await new Promise(resolve => setTimeout(resolve, 1000))
        setAssignments(mockAssignments)
      } catch (error: any) {
        setError('載入審稿資料失敗')
        console.error('Error loading assignments:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isAuthenticated, checkAuth])

  const handleSort = (key: keyof ReviewAssignment) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key: keyof ReviewAssignment) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="w-4 h-4 text-gray-600" /> : 
      <ArrowDown className="w-4 h-4 text-gray-600" />
  }

  const filteredAndSortedAssignments = assignments
    .filter(assignment => filter === 'all' || assignment.status === filter)
    .sort((a, b) => {
      if (!sortConfig.key) return 0
      
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]
      
      if (aVal === undefined || bVal === undefined) return 0
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal)
        return sortConfig.direction === 'asc' ? comparison : -comparison
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'pending').length,
    inProgress: assignments.filter(a => a.status === 'in_progress').length,
    completed: assignments.filter(a => a.status === 'completed').length
  }

  const handleStartReview = (assignmentId: string) => {
    // 開始審稿邏輯
    console.log('開始審稿:', assignmentId)
  }

  const handleContinueReview = (assignmentId: string) => {
    // 繼續審稿邏輯
    console.log('繼續審稿:', assignmentId)
  }

  const handleViewReview = (assignmentId: string) => {
    // 查看已完成審稿邏輯
    console.log('查看審稿:', assignmentId)
  }

  const handleDownloadPaper = (assignmentId: string) => {
    // 下載論文邏輯
    console.log('下載論文:', assignmentId)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header currentPage="reviewer" />
        <main className="flex-1 p-[56px] bg-gray-100">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white rounded-lg p-6 h-32"></div>
                ))}
              </div>
              <div className="bg-white rounded-lg p-8 h-96"></div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header currentPage="reviewer" />

      {/* 主內容區域 */}
      <main className="flex-1 p-[56px] bg-gray-100">
        <div className="w-full">
          {/* 身份識別區域 */}
          <div className="mb-8 md:mb-[56px]">
            <div className="flex flex-col md:flex-row rounded-lg shadow-sm min-h-[132px]">
              {/* 左側：投稿作者身份標識 */}
              <div className="bg-reviewer text-white px-6 md:ps-[48px] py-6 md:py-[32px] md:pe-[211px] flex items-center gap-4 md:gap-6">
                <div className="w-12 h-12 md:w-[64px] md:h-[64px]">
                  <PenTool className="w-full h-full text-white" />
                </div>
                <div>
                  <div className="text-sm md:text-28M opacity-90">
                    {user?.displayName}
                  </div>
                  <div className="text-lg md:text-28M font-medium">
                    審稿者
                  </div>
                </div>
              </div>

              {/* 右側：研討會標題和控制項 */}
              <div className="relative z-[60] bg-white flex-1 px-6 md:px-[48px] py-6 md:py-[45px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-lg md:text-[28px] font-medium text-reviewer leading-tight">
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

          {/* 統計卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="bg-white rounded-lg p-4 md:p-6 border-2 border-gray-100 hover:border-[#1FB6B8]/30 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-[#1FB6B8]" />
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">
                    {stats.total}
                  </div>
                  <div className="text-sm text-foreground/60">總計任務</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 md:p-6 border-2 border-gray-100 hover:border-amber-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-amber-500" />
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">
                    {stats.pending}
                  </div>
                  <div className="text-sm text-foreground/60">待審稿</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 md:p-6 border-2 border-gray-100 hover:border-blue-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-blue-500" />
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">
                    {stats.inProgress}
                  </div>
                  <div className="text-sm text-foreground/60">審稿中</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 md:p-6 border-2 border-gray-100 hover:border-green-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">
                    {stats.completed}
                  </div>
                  <div className="text-sm text-foreground/60">已完成</div>
                </div>
              </div>
            </div>
          </div>

          {/* 審稿列表 */}
          <div className="space-y-8 lg:space-y-14">
            <section className="bg-white rounded-xl shadow-sm">
              <header className="px-[48px] py-[40px] flex justify-between items-center">
                <h3 className="text-[32px] md:text-[40px] font-medium text-[#00182C]">
                  審稿任務
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: '全部' },
                    { key: 'pending', label: '待審稿' },
                    { key: 'in_progress', label: '審稿中' },
                    { key: 'completed', label: '已完成' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setFilter(key as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === key
                          ? 'bg-[#1FB6B8] text-white'
                          : 'bg-gray-100 text-foreground hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </header>

              <div className="border-t border-gray-200 ">
                <div className="overflow-x-auto">
                  <table
                    className="w-full table-auto border-collapse"
                    aria-label="審稿任務清單"
                  >
                    <thead className="bg-white border-y border-gray-200 text-gray-700">
                      <tr>
                        <th
                          scope="col"
                          className="w-32 px-4 py-[24px] text-center text-24M font-medium"
                        >
                          編號
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-[24px] text-left text-24M font-medium"
                        >
                          <button
                            onClick={() => handleSort('title')}
                            className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                          >
                            標題
                            {getSortIcon('title')}
                          </button>
                        </th>
                        <th
                          scope="col"
                          className="w-40 px-4 py-[24px] text-left text-24M font-medium"
                        >
                          <button
                            onClick={() => handleSort('assignedDate')}
                            className="flex items-center justify-center gap-2 hover:text-gray-900 transition-colors"
                          >
                            指派日期
                            {getSortIcon('assignedDate')}
                          </button>
                        </th>
                        <th
                          scope="col"
                          className="w-40 px-4 py-[24px] text-center text-24M font-medium flex items-center justify-center" 
                        >
                          <button
                            onClick={() => handleSort('dueDate')}
                            className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                          >
                            截止日期
                            {getSortIcon('dueDate')}
                          </button>
                        </th>
                        <th
                          scope="col"
                          className="w-32 px-4 py-[24px] text-center text-24M font-medium"
                        >
                          下載全文
                        </th>
                        <th
                          scope="col"
                          className="w-40 px-4 py-[24px] text-left text-24M font-medium"
                        >
                          <button
                            onClick={() => handleSort('status')}
                            className="w-24 flex items-center justify-center gap-2 hover:text-gray-900 transition-colors"
                          >
                            狀態
                            {getSortIcon('status')}
                          </button>
                        </th>
                        <th
                          scope="col"
                          className="w-32 px-4 py-[24px] text-left text-24M font-medium"
                        >
                          建議
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {isLoading ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-[60px] text-center text-gray-500"
                          >
                            載入中...
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-[60px] text-center text-red-500"
                          >
                            載入失敗: {error}
                          </td>
                        </tr>
                      ) : filteredAndSortedAssignments.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-[60px] text-center text-gray-500"
                          >
                            目前沒有審稿任務
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedAssignments.map(
                          (assignment, index) => (
                            <tr
                              key={assignment.id}
                              className="hover:bg-gray-50"
                            >
                              {/* 編號 */}
                              <td className="px-4 py-[24px] align-middle text-gray-900 text-center text-20R">
                                {index + 1}
                              </td>

                              {/* 標題 */}
                              <td className="px-4 py-[24px] align-middle">
                                <div className="space-y-1">
                                  <p className="text-[#00182C] leading-relaxed break-words text-20R font-medium">
                                    {assignment.title}
                                  </p>
                                </div>
                              </td>

                              {/* 指派日期 */}
                              <td className="px-4 py-[24px] align-middle text-gray-500 tabular-nums text-18R">
                                {assignment.assignedDate}
                              </td>

                              {/* 截止日期 */}
                              <td className="px-4 py-[24px] align-middle w-32">
                                <div className="space-y-1">
                                  <div className="text-gray-500 tabular-nums text-18R">
                                    {assignment.dueDate}
                                  </div>
                                  <div
                                    className={`text-14R ${
                                      getDaysRemaining(assignment.dueDate) < 0
                                        ? 'text-red-600'
                                        : getDaysRemaining(
                                            assignment.dueDate
                                          ) <= 3
                                        ? 'text-amber-600'
                                        : 'text-gray-600'
                                    }`}
                                  >
                                    {getDaysRemaining(assignment.dueDate) > 0
                                      ? `還有 ${getDaysRemaining(
                                          assignment.dueDate
                                        )} 天`
                                      : getDaysRemaining(assignment.dueDate) ===
                                        0
                                      ? '今天到期'
                                      : `已逾期 ${Math.abs(
                                          getDaysRemaining(assignment.dueDate)
                                        )} 天`}
                                  </div>
                                </div>
                              </td>

                              {/* 下載全文 */}
                              <td className="px-4 py-[24px] align-middle text-center w-50">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDownloadPaper(assignment.id)
                                  }
                                  className="inline-flex items-center justify-center py-[16px] px-[32px] border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors text-24R rounded-lg"
                                  title="下載全文"
                                >
                                  下載PDF
                                </button>
                              </td>

                              {/* 狀態 */}
                              <td className="px-4 py-[24px] align-middle">
                                <div className="flex items-center justify-center">
                                  <span
                                    className={`px-2 py-1 rounded-full text-12R border ${
                                      assignment.status === 'completed'
                                        ? 'bg-green-100 text-green-800 border-green-200'
                                        : getDaysRemaining(assignment.dueDate) < 0
                                        ? 'bg-red-100 text-red-800 border-red-200'
                                        : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                    }`}
                                  >
                                    {assignment.status === 'completed'
                                      ? '已提交'
                                      : getDaysRemaining(assignment.dueDate) < 0
                                      ? '已逾期'
                                      : '待完成'}
                                  </span>
                                </div>
                              </td>

                              {/* 建議 */}
                              <td className="px-4 py-[24px] align-middle">
                                <div className="flex items-center justify-center">
                                  {assignment.suggestion ? (
                                    <span
                                      className={`text-16R ${
                                        assignment.suggestion === 'accept_oral'
                                          ? 'text-green-600'
                                          : assignment.suggestion === 'accept_poster'
                                          ? 'text-blue-600'
                                          : 'text-red-600'
                                      }`}
                                    >
                                      {assignment.suggestion === 'accept_oral'
                                        ? '接受（口頭）'
                                        : assignment.suggestion === 'accept_poster'
                                        ? '接受（海報）'
                                        : '拒絕'}
                                    </span>
                                  ) : (
                                    <span className="text-16R text-gray-500">—</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}