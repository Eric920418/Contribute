'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsSubmitting(true)
    
    try {
      console.log('發送密碼重設請求到:', email)
      
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || '發送失敗')
      }
      
      // 顯示成功訊息
      alert(data.message || '密碼重設信已寄送到您的電子郵件')
      
    } catch (error) {
      console.error('發送密碼重設郵件失敗:', error)
      alert(error instanceof Error ? error.message : '發送失敗，請稍後再試')
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
      <main className="flex-1 px-[120px] py-[80px] bg-gray-100 ">
        <div className="max-w-[800px] mx-auto">
          {/* 忘記密碼卡片 */}
          <div className="bg-white rounded-lg p-20 text-center">
            {/* 標題 */}
            <h1 className="text-foreground text-[40px] font-medium leading-[58px] mb-[56px]">
              忘記密碼
            </h1>

            <form onSubmit={handleSubmit} className="space-y-14">
              {/* 電子郵件輸入框 */}
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-[122px] px-8 text-[40px] border-2 border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                  required
                />
              </div>

              {/* 取回密碼按鈕 */}
              <div>
                <button
                  type="submit"
                  disabled={!isValidEmail || isSubmitting}
                  className="w-full h-[122px] text-[40px] font-medium leading-[58px] bg-primary text-white rounded-lg"
                >
                  {isSubmitting ? '發送中...' : '取回密碼'}
                </button>
              </div>
            </form>

            {/* 返回登入連結 */}
            <div className="mt-14 text-[28px] leading-[44px] transition-colors">
              已經有帳號了？點我
              <Link href="/login" className="text-primary ">
                登入
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}