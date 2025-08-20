'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

interface ForgotPasswordProps {
  onBack?: () => void
  onBackToLogin?: () => void
}

export default function ForgotPassword({ onBack, onBackToLogin }: ForgotPasswordProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message || '密碼重設連結已發送到您的電子郵件')
        setEmail('') // 清空表單
      } else {
        console.error('忘記密碼失敗:', data)
        alert(data.error || '發送失敗，請稍後再試')
      }
    } catch (error) {
      console.error('忘記密碼請求錯誤:', error)
      alert('網路錯誤，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isValidEmail = email.trim() && validateEmail(email)

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header currentPage="submit" />

      {/* 主要內容區域 */}
      <main className="flex-1 px-[360px] py-28 bg-muted">
        <div className="max-w-[800px] mx-auto">
          {/* 忘記密碼卡片 */}
          <div className="bg-white rounded-lg p-20 text-center">
            {/* 標題 */}
            <h1 className="text-foreground text-[40px] font-medium leading-[58px] mb-14">
              忘記密碼
            </h1>

            <form onSubmit={handleSubmit} className="space-y-14">
              {/* 電子郵件輸入框 */}
              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-[122px] px-8 text-[40px] border-2 border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                  required
                />
              </div>

              {/* 取回密碼按鈕 */}
              <div>
                <Button
                  type="submit"
                  disabled={!isValidEmail || isSubmitting}
                  size="xl"
                  className="w-full h-[122px] text-[40px] font-medium leading-[58px]"
                >
                  {isSubmitting ? '發送中...' : '取回密碼'}
                </Button>
              </div>
            </form>

            {/* 返回登入連結 */}
            <div className="mt-14">
              <button
                type="button"
                onClick={onBackToLogin}
                className="text-foreground text-[28px] leading-[44px] hover:text-primary transition-colors"
              >
                已經有帳號了？點我登入
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}