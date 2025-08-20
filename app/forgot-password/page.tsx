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
      // TODO: 實現忘記密碼邏輯
      console.log('Reset password for:', email)
      
      // 模擬 API 請求
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 這裡可以顯示成功訊息或跳轉到成功頁面
      alert('密碼重設信已寄送到您的電子郵件')
      
    } catch (error) {
      console.error('Failed to send reset email:', error)
      alert('發送失敗，請稍後再試')
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