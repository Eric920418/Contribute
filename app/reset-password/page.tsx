'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
    setError('')
    setSuccess('')
    
    if (password !== confirmPassword) {
      setError('密碼不一致')
      return
    }

    if (password.length < 8) {
      setError('密碼至少需要8個字元')
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
        setSuccess(data.message || '密碼重設成功！')
        
        // 根據用戶角色導向對應頁面
        setTimeout(() => {
          const roles = data.user?.roles || []
          if (roles.includes('EDITOR') || roles.includes('CHIEF_EDITOR')) {
            router.push('/editor/dashboard')
          } else if (roles.includes('REVIEWER')) {
            router.push('/reviewer/dashboard')
          } else if (roles.includes('AUTHOR')) {
            router.push('/author')
          } else {
            router.push('/login')
          }
        }, 2000)
      } else {
        console.error('密碼重設失敗:', data)
        setError(data.error || '重設失敗，請稍後再試')
      }
    } catch (error) {
      console.error('密碼重設請求錯誤:', error)
      setError('網路錯誤，請稍後再試')
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

            {error && (
              <div className="mb-14 p-6 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-[24px] font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-14 p-6 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600 text-[24px] font-medium">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-14">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="新密碼"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-[122px] px-8 pr-[120px] text-[40px] border-2 border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 text-foreground/40 hover:text-foreground/60"
                >
                  {showPassword ? (
                    <EyeOff className="w-[56px] h-[56px]" />
                  ) : (
                    <Eye className="w-[56px] h-[56px]" />
                  )}
                </button>
                {password && !validatePassword(password) && (
                  <p className="mt-4 text-red-500 text-[20px]">
                    密碼必須至少8個字元，包含大小寫字母和數字
                  </p>
                )}
              </div>

              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="確認新密碼"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full h-[122px] px-8 pr-[120px] text-[40px] border-2 border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 text-foreground/40 hover:text-foreground/60"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-[56px] h-[56px]" />
                  ) : (
                    <Eye className="w-[56px] h-[56px]" />
                  )}
                </button>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-4 text-red-500 text-[20px]">密碼不一致</p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={!isValidForm || isSubmitting}
                  className="w-full h-[122px] text-[40px] font-medium leading-[58px] bg-primary text-white rounded-lg"
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