'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Download, ArrowLeft, Star, Send, PenTool } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { apiClient } from '@/lib/api/client'
import { useAuth } from '@/hooks/useAuth'

interface ReviewAssignment {
  id: string
  submission: {
    id: string
    title: string
    abstract: string
    track: string
    paperType?: string
    keywords?: string
    authors: {
      id: string
      name: string
      email: string
      affiliation: string
      isCorresponding: boolean
    }[]
    files: {
      id: string
      originalName: string
      size: number
      path: string
    }[]
  }
  dueAt?: string
  createdAt: string
  review?: {
    id: string
    score: number
    commentToEditor?: string
    commentToAuthor?: string
    recommendation: 'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT'
    submittedAt?: string
  }
}

interface ReviewForm {
  originalityScore: number
  methodologyScore: number
  relevanceScore: number
  clarityScore: number
  commentToAuthor: string
  commentToEditor: string
  recommendation: 'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT' | ''
}

interface SidebarAssignment {
  id: string
  submissionId: string
  title: string
}

export default function ReviewPage() {
  const params = useParams()
  const router = useRouter()
  const assignmentId = params.id as string
  const { isAuthenticated, checkAuth, user } = useAuth()

  const [assignment, setAssignment] = useState<ReviewAssignment | null>(null)
  const [sidebarAssignments, setSidebarAssignments] = useState<SidebarAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [reviewForm, setReviewForm] = useState<ReviewForm>({
    originalityScore: 0,
    methodologyScore: 0,
    relevanceScore: 0,
    clarityScore: 0,
    commentToAuthor: '',
    commentToEditor: '',
    recommendation: ''
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        
        if (!isAuthenticated) {
          await checkAuth()
          return
        }

        // 載入側邊欄的所有審稿任務
        const assignmentsResponse = await apiClient.get('/reviewer/assignments')
        if (assignmentsResponse.data.success) {
          setSidebarAssignments(assignmentsResponse.data.data.map((item: any) => ({
            id: item.id,
            submissionId: item.id,
            title: item.title
          })))
        }

        // 載入當前審稿任務詳情
        const detailResponse = await apiClient.get(`/reviewer/assignments/${assignmentId}`)
        if (detailResponse.data.success) {
          setAssignment(detailResponse.data.data)
          
          // 如果已有審稿記錄，填入表單
          if (detailResponse.data.data.review) {
            const review = detailResponse.data.data.review
            setReviewForm({
              originalityScore: Math.floor(review.score * 0.25) || 1,
              methodologyScore: Math.floor(review.score * 0.25) || 1,
              relevanceScore: Math.floor(review.score * 0.25) || 1,
              clarityScore: Math.floor(review.score * 0.25) || 1,
              commentToAuthor: review.commentToAuthor || '',
              commentToEditor: review.commentToEditor || '',
              recommendation: review.recommendation || ''
            })
          }
        } else {
          throw new Error(detailResponse.data.error || '載入審稿任務失敗')
        }
      } catch (error: any) {
        console.error('載入審稿資料失敗:', error)
        setError(error.message || '載入審稿資料失敗')
      } finally {
        setIsLoading(false)
      }
    }

    if (assignmentId && isAuthenticated) {
      loadData()
    }
  }, [assignmentId, isAuthenticated, checkAuth])

  const handleScoreChange = (category: keyof ReviewForm, score: number) => {
    setReviewForm(prev => ({
      ...prev,
      [category]: score
    }))
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)

      // 驗證必填欄位
      if (!reviewForm.recommendation) {
        alert('請選擇建議')
        return
      }

      const totalScore = reviewForm.originalityScore + reviewForm.methodologyScore + 
                        reviewForm.relevanceScore + reviewForm.clarityScore

      const submitData = {
        score: totalScore,
        commentToAuthor: reviewForm.commentToAuthor,
        commentToEditor: reviewForm.commentToEditor,
        recommendation: reviewForm.recommendation
      }

      const response = await apiClient.post(`/reviewer/assignments/${assignmentId}/submit`, submitData)
      
      if (response.data.success) {
        alert('審稿意見提交成功！')
        router.push('/reviewer/dashboard')
      } else {
        throw new Error(response.data.error || '提交失敗')
      }
    } catch (error: any) {
      console.error('提交審稿意見失敗:', error)
      alert(error.message || '提交失敗，請重試')
    } finally {
      setIsSubmitting(false)
    }
  }

  const downloadPDF = () => {
    if (assignment?.submission.files.length > 0) {
      // TODO: 實現PDF下載邏輯
      console.log('下載PDF:', assignment.submission.files[0].path)
      alert('PDF下載功能尚未實現')
    }
  }

  const renderScoreButtons = (category: keyof ReviewForm, currentScore: number) => {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(score => (
          <button
            key={score}
            onClick={() => handleScoreChange(category, score)}
            className={`w-12 h-8 rounded text-sm font-medium transition-colors ${
              currentScore >= score
                ? 'bg-reviewer text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {score}
          </button>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header currentPage="reviewer" />
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="bg-gray-200 rounded h-96"></div>
                <div className="lg:col-span-3 bg-gray-200 rounded h-96"></div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header currentPage="reviewer" />
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto text-center">
            <div className="text-red-600 text-lg mb-4">載入失敗</div>
            <div className="text-gray-600 mb-8">{error}</div>
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-reviewer text-white rounded hover:bg-reviewer-600"
            >
              返回
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header currentPage="reviewer" />
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto text-center">
            <div className="text-gray-600">找不到審稿任務</div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const isAlreadySubmitted = assignment.review?.submittedAt

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header currentPage="reviewer" />

      <main className="flex-1 p-8">
        {/* 身份識別區域 */}
        <div className="mb-8 md:mb-[56px]">
          <div className="flex flex-col md:flex-row rounded-lg shadow-sm min-h-[132px]">
            {/* 左側：投稿作者身份標識 */}
            <div
              className={`bg-reviewer text-white px-6 md:ps-[48px] py-6 md:py-[32px] md:pe-[211px] flex items-center gap-4 md:gap-6`}
            >
              <div className="w-12 h-12 md:w-[64px] md:h-[64px]">
                <PenTool className="w-full h-full text-white" />
              </div>
              <div>
                <div className="text-sm md:text-lg opacity-90">
                  {user?.displayName || '載入中...'}
                </div>
                <div className="text-lg md:text-xl font-medium">
                  審稿人
                </div>
              </div>
            </div>

            {/* 右側：研討會標題和控制項 */}
            <div className="relative z-[60] bg-white flex-1 px-6 md:px-[48px] py-6 md:py-[45px] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1 flex items-center gap-5">
                <h1
                  className={`text-lg md:text-[28px] font-medium text-reviewer leading-tight`}
                >
                  {assignment.submission.title}
                </h1>
                <div className="w-[2px] h-[56px] bg-gray-200"></div>
              </div>
              <div className="relative z-[70] flex items-center gap-[40px]">
                {/* 返回按鈕 */}
                <button
                  onClick={() => router.back()}
                  className="flex items-center  text-gray-600 hover:text-gray-800 "
                >
                  <ArrowLeft className="w-4 h-4" />
                  返回審稿列表
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full md:mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* 左側稿件列表 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">稿件列表</h3>
                </div>
                <div className="p-2">
                  {sidebarAssignments.map(item => (
                    <button
                      key={item.id}
                      onClick={() => router.push(`/reviewer/review/${item.id}`)}
                      className={`w-full p-3 text-left rounded text-sm transition-colors ${
                        item.id === assignmentId
                          ? 'bg-reviewer-50 text-reviewer-700 border-l-4 border-reviewer'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="font-medium mb-1">
                        稿件ID：{item.id.substring(0, 8)}
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-2">
                        {item.title}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 主要內容區域 */}
            <div className="lg:col-span-3">
              {/* 稿件資訊 */}
              <div className="bg-white rounded-lg shadow-sm mb-8">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-semibold text-gray-900">
                      稿件資訊
                    </h2>
                    <button
                      onClick={downloadPDF}
                      className="flex items-center gap-2 px-4 py-2 text-reviewer border border-reviewer rounded hover:bg-reviewer-50"
                    >
                      <Download className="w-4 h-4" />
                      下載全文PDF
                    </button>
                  </div>

                  <h3 className="text-xl font-medium text-gray-800 mb-4">
                    {assignment.submission.title}
                  </h3>
                </div>

                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      摘要
                    </label>
                    <p className="text-gray-600 leading-relaxed">
                      {assignment.submission.abstract}
                    </p>
                  </div>

                  {assignment.submission.keywords && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        關鍵字
                      </label>
                      <p className="text-gray-600">
                        {assignment.submission.keywords}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        指派日期
                      </label>
                      <p className="text-gray-600">
                        {new Date(assignment.createdAt).toLocaleDateString(
                          'zh-TW'
                        )}
                      </p>
                    </div>
                    {assignment.dueAt && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          審查截止日
                        </label>
                        <p className="text-gray-600">
                          {new Date(assignment.dueAt).toLocaleDateString(
                            'zh-TW'
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 審稿意見 */}
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    審稿意見
                  </h2>
                </div>

                <div className="p-6 space-y-8">
                  {/* 評分區域 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-6">
                      評分
                    </h3>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">原創性 (1-5分)</span>
                        {renderScoreButtons(
                          'originalityScore',
                          reviewForm.originalityScore
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">技術正確性/方法</span>
                        {renderScoreButtons(
                          'methodologyScore',
                          reviewForm.methodologyScore
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">
                          與研討會主題契合度
                        </span>
                        {renderScoreButtons(
                          'relevanceScore',
                          reviewForm.relevanceScore
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">表達清晰度</span>
                        {renderScoreButtons(
                          'clarityScore',
                          reviewForm.clarityScore
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 評語區域 */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        提交給投稿人的
                        <span className="text-blue-600">匿名</span>建議
                      </label>
                      <textarea
                        value={reviewForm.commentToAuthor}
                        onChange={e =>
                          setReviewForm(prev => ({
                            ...prev,
                            commentToAuthor: e.target.value,
                          }))
                        }
                        placeholder="請輸入您對該作品的意見建議，將提供給作者參考。"
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        disabled={isAlreadySubmitted}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        提交給主編的<span className="text-blue-600">機密</span>
                        建議
                      </label>
                      <textarea
                        value={reviewForm.commentToEditor}
                        onChange={e =>
                          setReviewForm(prev => ({
                            ...prev,
                            commentToEditor: e.target.value,
                          }))
                        }
                        placeholder="可針對該論文主題的適當性、論述內容缺漏或改善建議等，僅編輯能夠看到這段意見。"
                        className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        disabled={isAlreadySubmitted}
                      />
                    </div>
                  </div>

                  {/* 建議區域 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      建議
                    </h3>
                    <div className="space-y-3">
                      {[
                        { value: 'MAJOR_REVISION', label: '以海報論文接受' },
                        { value: 'ACCEPT', label: '以口頭論文接受' },
                        { value: 'REJECT', label: '拒絕' },
                      ].map(option => (
                        <label key={option.value} className="flex items-center">
                          <input
                            type="radio"
                            name="recommendation"
                            value={option.value}
                            checked={reviewForm.recommendation === option.value}
                            onChange={e =>
                              setReviewForm(prev => ({
                                ...prev,
                                recommendation: e.target.value as any,
                              }))
                            }
                            className="mr-3 text-blue-500"
                            disabled={isAlreadySubmitted}
                          />
                          <span className="text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 提交按鈕 */}
                  {!isAlreadySubmitted && (
                    <div className="pt-6 border-t border-gray-200">
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-8 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                        {isSubmitting ? '提交中...' : '送出'}
                      </button>
                    </div>
                  )}

                  {isAlreadySubmitted && (
                    <div className="pt-6 border-t border-gray-200">
                      <div className="text-green-600 font-medium">
                        ✓ 已於{' '}
                        {new Date(
                          assignment.review!.submittedAt!
                        ).toLocaleDateString('zh-TW')}{' '}
                        提交審稿意見
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}