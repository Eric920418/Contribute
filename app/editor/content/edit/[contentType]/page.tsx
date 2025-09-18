'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Eye } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CustomEditor from '@/components/CustomEditor'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/hooks/useAuth'

interface PageContentData {
  id?: string
  title: string
  content: string
  contentType: string
}

export default function ContentEditPage() {
  const params = useParams()
  const router = useRouter()
  const { session } = useAuth()
  const contentType = params.contentType as string

  const [contentData, setContentData] = useState<PageContentData>({
    title: '',
    content: '',
    contentType: contentType
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 內容類型對應的中文標題
  const contentTypeMap: Record<string, string> = {
    journal: '期刊資訊',
    guidelines: '作者須知',
    proceedings: '會議論文集',
    submit: '會議論文投稿'
  }

  useEffect(() => {
    loadContent()
  }, [contentType])

  const loadContent = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/editor/content/${contentType}`)
      if (response.ok) {
        const data = await response.json()
        setContentData(data)
      } else if (response.status === 404) {
        // 內容不存在，創建新內容
        setContentData({
          title: contentTypeMap[contentType] || '新內容',
          content: getDefaultContent(contentType),
          contentType: contentType
        })
      } else {
        throw new Error('載入內容失敗')
      }
    } catch (error) {
      console.error('載入內容錯誤:', error)
      setError('載入內容時發生錯誤')
    } finally {
      setIsLoading(false)
    }
  }

  const getDefaultContent = (type: string): string => {
    switch (type) {
      case 'journal':
        return '<h2>期刊簡介</h2><p>請在此輸入期刊簡介內容...</p>'
      case 'guidelines':
        return '<h2>投稿須知</h2><p>請在此輸入投稿須知內容...</p>'
      case 'proceedings':
        return '<h2>會議論文集</h2><p>請在此輸入會議論文集內容...</p>'
      case 'submit':
        return '<h2>會議論文投稿</h2><p>請在此輸入投稿說明內容...</p>'
      default:
        return '<p>請輸入內容...</p>'
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/editor/content/${contentType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: contentData.title,
          content: contentData.content,
        }),
      })

      if (!response.ok) {
        throw new Error('儲存失敗')
      }

      const savedData = await response.json()
      setContentData(savedData)
      setSuccessMessage('內容已成功儲存！')
      
      // 3秒後清除成功訊息
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('儲存錯誤:', error)
      setError('儲存時發生錯誤')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePreview = () => {
    // 在新視窗開啟前台預覽
    window.open('/', '_blank')
  }

  const handleBackToDashboard = () => {
    router.push('/editor/dashboard')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['EDITOR', 'CHIEF_EDITOR']}>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header isEditMode={true} />
        
        {/* 編輯器標題列 */}
        <div className="bg-white border-b border-gray-200">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBackToDashboard}
                  className="flex items-center text-gray-600 hover:text-primary transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  返回儀表板
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <h1 className="text-2xl font-bold text-gray-900">
                  編輯 {contentTypeMap[contentType]}
                </h1>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePreview}
                  className="flex items-center px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  預覽
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 訊息提示 */}
        {error && (
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-4">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              {successMessage}
            </div>
          </div>
        )}

        {/* 編輯器主體 */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="bg-white rounded-lg shadow border border-gray-200">
            {/* 標題編輯 */}
            <div className="p-6 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                頁面標題
              </label>
              <input
                type="text"
                value={contentData.title}
                onChange={(e) => setContentData({ ...contentData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="輸入頁面標題"
              />
            </div>

            {/* 內容編輯器 */}
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                頁面內容
              </label>
              <div className="border border-gray-300 rounded-md overflow-hidden">
                <CustomEditor
                  height="500px"
                  placeholder="開始編輯頁面內容..."
                  initialData={contentData.content}
                  onContentChange={(content) => setContentData({ ...contentData, content })}
                />
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  )
}