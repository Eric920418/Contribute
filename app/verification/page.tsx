'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import EmailVerification from '@/components/pages/EmailVerification'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function VerificationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const userId = searchParams.get('userId')
  
  const [userInfo, setUserInfo] = useState<{ userId: string; email: string; displayName: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // 如果直接有 userId，直接使用
    if (userId && email) {
      setUserInfo({ 
        userId, 
        email, 
        displayName: '用戶' // 簡化處理
      })
      setLoading(false)
    } 
    // 如果只有 email，提示用戶重新註冊
    else if (email) {
      setError('缺少用戶信息，請重新註冊')
      setLoading(false)
    } else {
      setError('缺少必要參數，請重新註冊')
      setLoading(false)
    }
  }, [userId, email])

  const handleSuccess = (user: any) => {
    console.log('郵件驗證成功，用戶:', user)
    router.push('/login')
  }

  const handleError = (error: string) => {
    setError(error)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header currentPage="submit" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">載入中...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !userInfo) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header currentPage="submit" />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-16 lg:py-20 bg-gray-100 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 sm:p-8 lg:p-12 w-full max-w-2xl text-center">
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error || '驗證頁面載入失敗'}</AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <p className="text-gray-600">請重新進行註冊流程</p>
              <button
                onClick={() => router.push('/register')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                返回註冊頁面
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header currentPage="submit" />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-16 lg:py-20 bg-muted flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 sm:p-8 lg:p-12 w-full max-w-2xl">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <EmailVerification
            userId={userInfo.userId}
            email={userInfo.email}
            displayName={userInfo.displayName}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}