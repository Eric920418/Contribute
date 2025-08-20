'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
      setIsValidToken(true)
    } else {
      setIsValidToken(false)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      alert('密碼不一致')
      return
    }

    if (password.length < 8) {
      alert('密碼至少需要8個字元')
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token, 
          password,
          confirmPassword 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message || '密碼重設成功！')
        router.push('/login')
      } else {
        console.error('密碼重設失敗:', data)
        alert(data.error || '重設失敗，請稍後再試')
      }
    } catch (error) {
      console.error('密碼重設請求錯誤:', error)
      alert('網路錯誤，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  const validatePassword = (password: string) => {
    return password.length >= 8 && 
           /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
  }

  const isValidForm = password.trim() && 
                      confirmPassword.trim() && 
                      password === confirmPassword &&
                      validatePassword(password)

  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header currentPage="submit" />
        <main className="flex-1 px-[360px] py-28 bg-muted">
          <div className="max-w-[800px] mx-auto">
            <div className="bg-white rounded-lg p-20 text-center">
              <h1 className="text-foreground text-[40px] font-medium leading-[58px] mb-14">
                載入中...
              </h1>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header currentPage="submit" />
        <main className="flex-1 px-[360px] py-28 bg-gray-100">
          <div className="max-w-[800px] mx-auto">
            <div className="bg-white rounded-lg p-20 text-center">
              <h1 className="text-foreground text-[40px] font-medium leading-[58px] mb-14">
                無效的重設連結
              </h1>
              <p className="text-[28px] leading-[44px] text-foreground/60 mb-14">
                此連結可能已過期或無效，請重新申請密碼重設。
              </p>
              <button
                onClick={() => router.push('/forgot-password')}
                className="h-[122px] text-[40px] font-medium leading-[58px]"
              >
                重新申請
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

      <main className="flex-1 px-[360px] py-28 bg-muted">
        <div className="max-w-[800px] mx-auto">
          <div className="bg-white rounded-lg p-20 text-center">
            <h1 className="text-foreground text-[40px] font-medium leading-[58px] mb-14">
              重設密碼
            </h1>

            <form onSubmit={handleSubmit} className="space-y-14">
              <div>
                <input
                  type="password"
                  placeholder="新密碼"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-[122px] px-8 text-[40px] border-2 border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                  required
                />
                {password && !validatePassword(password) && (
                  <p className="mt-4 text-red-500 text-[20px]">
                    密碼必須至少8個字元，包含大小寫字母和數字
                  </p>
                )}
              </div>

              <div>
                <input
                  type="password"
                  placeholder="確認新密碼"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-[122px] px-8 text-[40px] border-2 border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                  required
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-4 text-red-500 text-[20px]">
                    密碼不一致
                  </p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={!isValidForm || isSubmitting}
                  className="w-full h-[122px] text-[40px] font-medium leading-[58px]"
                >
                  {isSubmitting ? '重設中...' : '確認重設'}
                </button>
              </div>
            </form>

            <div className="mt-14">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-foreground text-[28px] leading-[44px] hover:text-primary transition-colors"
              >
                返回登入頁面
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}