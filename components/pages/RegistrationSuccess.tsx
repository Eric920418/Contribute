'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

interface RegistrationSuccessProps {
  email: string
  onBack?: () => void
}

export default function RegistrationSuccess({ email, onBack }: RegistrationSuccessProps) {
  const [countdown, setCountdown] = useState(30)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  const handleResendEmail = () => {
    if (canResend) {
      // TODO: 實現重新發送驗證信邏輯
      console.log('Resending verification email to:', email)
      
      // 重置倒計時
      setCountdown(30)
      setCanResend(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header currentPage="submit" />

      {/* 主要內容區域 */}
      <main className="flex-1 px-[360px] py-28 bg-muted">
        <div className="max-w-[800px] mx-auto">
          {/* 驗證信卡片 */}
          <div className="bg-white rounded-lg p-20 text-center">
            {/* 標題 */}
            <h1 className="text-foreground text-[40px] font-medium leading-[58px] mb-14">
              驗證信已寄送
            </h1>

            {/* 電子郵件資訊 */}
            <div className="mb-14">
              <p className="text-foreground text-[28px] leading-[44px]">
                已寄送到{' '}
                <span className="text-[#1EBFFF] font-medium">
                  {email}
                </span>
              </p>
            </div>

            {/* 重新寄送按鈕 */}
            <div className="mb-14">
              <Button
                onClick={handleResendEmail}
                disabled={!canResend}
                size="xl"
                className="px-12 text-[40px] font-medium leading-[58px] h-[122px]"
              >
                {canResend 
                  ? '重新寄送驗證信' 
                  : `重新寄送驗證信（${countdown}秒）`
                }
              </Button>
            </div>

            {/* 提示文字 */}
            <p className="text-foreground text-[28px] leading-[44px]">
              若您未收到信，請重新寄送驗證信
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}