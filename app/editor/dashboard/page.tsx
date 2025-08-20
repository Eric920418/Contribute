'use client'

import { useState, useEffect } from 'react'
import { FileText, Clock, CheckCircle, AlertCircle, Eye, Edit3, PenTool } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { apiClient } from '@/lib/api/client'
import YearDropdown from '@/components/ui/YearDropdown'
import { SessionData } from '@/lib/auth/session'

interface EditorAssignment {
  id: string
  title: string
  authors: string[]
  status: 'submitted' | 'under_review' | 'revision_required' | 'accepted' | 'rejected'
  submittedDate: string
  assignedReviewer?: string[]
  priority: 'high' | 'medium' | 'low'
  paperType: string
  keywords: string[]
  dueDate?: string
}

interface EditorStats {
  total: number
  submitted: number
  underReview: number
  revisionRequired: number
  accepted: number
  rejected: number
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'submitted':
      return <FileText className="w-5 h-5 text-blue-500" />
    case 'under_review':
      return <Clock className="w-5 h-5 text-amber-500" />
    case 'revision_required':
      return <AlertCircle className="w-5 h-5 text-orange-500" />
    case 'accepted':
      return <CheckCircle className="w-5 h-5 text-green-500" />
    case 'rejected':
      return <AlertCircle className="w-5 h-5 text-red-500" />
    default:
      return <FileText className="w-5 h-5 text-gray-500" />
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'submitted':
      return '新投稿'
    case 'under_review':
      return '審稿中'
    case 'revision_required':
      return '需修改'
    case 'accepted':
      return '已接受'
    case 'rejected':
      return '已拒絕'
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

export default function EditorDashboard() {
  const [assignments, setAssignments] = useState<EditorAssignment[]>([])
  const [stats, setStats] = useState<EditorStats>({
    total: 0,
    submitted: 0,
    underReview: 0,
    revisionRequired: 0,
    accepted: 0,
    rejected: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | 'submitted' | 'under_review' | 'revision_required' | 'accepted' | 'rejected'>('all')
  const [year, setYear] = useState(2025)
  const [user, setUser] = useState<SessionData | null>(null)
  useEffect(() => {
    // 載入用戶資料和編輯數據
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        // 獲取當前用戶資料
        const userResponse = await apiClient.get('/auth/me')
        setUser(userResponse.data.user)
        
        // 獲取編輯投稿列表
        const params = new URLSearchParams()
        params.append('year', year.toString())
        if (filter !== 'all') {
          params.append('status', filter)
        }
        
        const editorResponse = await apiClient.get(`/editor/submissions?${params.toString()}`)
        setAssignments(editorResponse.data.submissions)
        setStats(editorResponse.data.stats)
        
      } catch (error: any) {
        const errorMsg = error.response?.data?.error || error.message || '載入編輯資料失敗'
        setError(errorMsg)
        console.error('Error loading editor data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [year, filter])

  // 不需要前端過濾，API 已經根據 filter 參數回傳篩選後的數據
  const filteredAssignments = assignments

  const handleAssignReviewer = async (assignmentId: string) => {
    try {
      // 這裡可以開啟分配審稿人的模態視窗或跳轉到分配頁面
      alert('分配審稿人功能開發中...')
    } catch (error: any) {
      setError('分配審稿人失敗: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleViewPaper = async (assignmentId: string) => {
    try {
      // 跳轉到投稿詳情頁面
      window.open(`/editor/submissions/${assignmentId}`, '_blank')
    } catch (error: any) {
      setError('查看稿件失敗: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleMakeDecision = async (assignmentId: string) => {
    try {
      // 這裡可以開啟決議模態視窗或跳轉到決議頁面
      alert('編輯決議功能開發中...')
    } catch (error: any) {
      setError('做出決定失敗: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleDownloadPaper = async (assignmentId: string) => {
    try {
      // 下載論文檔案
      const response = await apiClient.get(`/editor/submissions/${assignmentId}/download`, {
        responseType: 'blob'
      })
      
      // 創建下載連結
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `submission-${assignmentId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      setError('下載稿件失敗: ' + (error.response?.data?.error || error.message))
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute requiredRoles={['EDITOR', 'CHIEF_EDITOR']}>
        <div className="min-h-screen flex flex-col bg-white">
          <Header currentPage="editor" />
          <main className="flex-1 px-4 py-8 md:px-14 md:py-14 bg-gray-100">
            <div className="max-w-7xl mx-auto">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mb-8">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white rounded-lg p-6 h-32"></div>
                  ))}
                </div>
                <div className="bg-white rounded-lg p-8 h-96"></div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['EDITOR', 'CHIEF_EDITOR']}>
      {/* Schema.org 結構化標記 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: '主編工作台',
            description: '學術論文主編管理系統 - 主編專用工作台',
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
          }),
        }}
      />

      <div className="min-h-screen flex flex-col bg-white">
        <Header currentPage="editor" />

        {/* 主內容區域 */}
        <main className="flex-1 px-4 py-8 md:px-14 md:py-14 bg-gray-100">
          <div className="max-w-7xl mx-auto">
            {/* 身份識別區域 */}
            {/* 身份識別區域 */}
            <div className="mb-8 md:mb-[56px]">
              <div className="flex flex-col md:flex-row rounded-lg shadow-sm min-h-[132px]">
                {/* 左側：投稿作者身份標識 */}
                <div
                  className={`${
                    user?.roles?.includes('CHIEF_EDITOR')
                      ? 'bg-chief-editor'
                      : 'bg-editor'
                  } text-white px-6 md:ps-[48px] py-6 md:py-[32px] md:pe-[211px] flex items-center gap-4 md:gap-6`}
                >
                  <div className="w-12 h-12 md:w-[64px] md:h-[64px]">
                    <PenTool className="w-full h-full text-white" />
                  </div>
                  <div>
                    <div className="text-sm md:text-28M opacity-90">
                      {user?.displayName}
                    </div>
                    <div className="text-lg md:text-28M font-medium">
                      {user?.roles?.includes('CHIEF_EDITOR') ? '主編' : '編輯'}
                    </div>
                  </div>
                </div>

                {/* 右側：研討會標題和控制項 */}
                <div className="relative z-[60] bg-white flex-1 px-6 md:px-[48px] py-6 md:py-[45px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex-1 flex items-center gap-5">
                    <h1
                      className={`text-lg md:text-[28px] font-medium ${
                        user?.roles?.includes('CHIEF_EDITOR')
                          ? 'text-chief-editor'
                          : 'text-editor'
                      } leading-tight`}
                    >
                      2025 AI時代課程教學與傳播科技研討會
                    </h1>
                  <div className="w-[2px] h-[56px] bg-gray-200"></div>
                  </div>
                  <div className="relative z-[70] flex items-center gap-[40px]">
                    <div className="text-24M font-medium">稿件列表</div>
                    <div className="text-24M font-medium">人員列表</div>
                    <div className="text-24M font-medium">會議設定</div>
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

            {/* 稿件狀態統計區域 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* 稿件狀態 */}
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-lg font-medium text-foreground mb-4">
                  稿件狀態
                </h2>
                <div className="text-4xl font-bold text-foreground mb-4">
                  {stats.total}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div
                    className="bg-gradient-to-r from-green-400 to-purple-500 h-3 rounded-full"
                    style={{ width: '75%' }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>新投稿 {stats.submitted}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span>審稿中 {stats.underReview}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>需修改 {stats.revisionRequired}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>已接受 {stats.accepted}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>已拒絕 {stats.rejected}</span>
                  </div>
                  <div className="text-gray-500">總計 {stats.total} 篇</div>
                </div>
              </div>

              {/* 統計數據 */}
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-lg font-medium text-foreground mb-4">
                  統計數據
                </h2>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-32 h-32">
                    <svg
                      className="w-32 h-32 transform -rotate-90"
                      viewBox="0 0 36 36"
                    >
                      <path
                        className="text-gray-200"
                        fill="none"
                        strokeWidth="3"
                        stroke="currentColor"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-green-500"
                        fill="none"
                        strokeWidth="3"
                        stroke="currentColor"
                        strokeDasharray="55, 100"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{stats.total}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>接受率 55%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>拒絕率 45%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 篩選器 */}
            <div className="bg-white rounded-lg p-4 md:p-6 mb-8">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'submitted', label: '新投稿' },
                  { key: 'under_review', label: '審稿中' },
                  { key: 'revision_required', label: '需修改' },
                  { key: 'accepted', label: '已接受' },
                  { key: 'rejected', label: '已拒絕' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === key
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-gray-100 text-foreground hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 稿件列表 */}
            <div className="bg-white rounded-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-medium text-foreground">
                  稿件列表
                </h2>
              </div>

              {error && (
                <div className="p-6 border-b border-red-200 bg-red-50">
                  <p className="text-red-600 text-center">{error}</p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                        編號
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                        標題
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                        期刊類型
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                        審稿人
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                        投稿日期
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                        狀態編輯
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                        資料
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                        審稿決議
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                        函文支援
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAssignments.map((assignment, index) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-foreground">
                          {assignment.id}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-foreground max-w-xs">
                            {assignment.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {assignment.authors.join('、')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                              assignment.status === 'accepted'
                                ? 'bg-green-100 text-green-800'
                                : assignment.status === 'under_review'
                                ? 'bg-blue-100 text-blue-800'
                                : assignment.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {getStatusText(assignment.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {assignment.assignedReviewer ? (
                            <div>
                              <div>審稿人 1</div>
                              <div className="text-xs text-gray-500">
                                審稿人 2
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {assignment.submittedDate}
                        </td>
                        <td className="px-6 py-4">
                          {assignment.status === 'accepted' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-green-600 text-sm">
                                接受
                              </span>
                              <span className="text-xs text-gray-500">
                                (條件)
                              </span>
                            </div>
                          ) : assignment.status === 'rejected' ? (
                            <span className="text-red-600 text-sm">已拒絕</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-400">-</span>
                        </td>
                        <td className="px-6 py-4">
                          {assignment.status === 'accepted' ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                <span className="text-xs text-green-600">
                                  接受
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">
                                  (條件)
                                </span>
                              </div>
                            </div>
                          ) : assignment.status === 'rejected' ? (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-red-500" />
                              <span className="text-xs text-red-600">
                                已拒絕
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {assignment.status === 'accepted' ? (
                            <span className="text-green-600 text-sm">確認</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewPaper(assignment.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                              title="查看詳情"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMakeDecision(assignment.id)}
                              className="text-green-600 hover:text-green-800 text-sm"
                              title="編輯決議"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分頁 */}
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">共 {stats.total} 筆資料</div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      1
                    </button>
                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      2
                    </button>
                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      3
                    </button>
                    <span className="px-3 py-1 text-sm">...</span>
                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      24
                    </button>
                    <button className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800">
                      ›
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  )
}