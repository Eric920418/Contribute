'use client'

import { useState, useEffect } from 'react'
import { Loader2, Mail, RefreshCw } from 'lucide-react'

interface EmailVerificationProps {
  userId: string
  email: string
  displayName: string
  nextResendTime?: string
  onSuccess: (user: any) => void
  onError: (error: string) => void
}

export default function EmailVerification({
  userId,
  email,
  displayName,
  nextResendTime,
  onSuccess,
  onError
}: EmailVerificationProps) {
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [canResend, setCanResend] = useState(false)
  const [error, setError] = useState('')

  // 計算倒計時
  useEffect(() => {
    if (nextResendTime) {
      const targetTime = new Date(nextResendTime).getTime()
      
      const updateCountdown = () => {
        const now = Date.now()
        const diff = Math.max(0, Math.ceil((targetTime - now) / 1000))
        setCountdown(diff)
        setCanResend(diff === 0)
      }

      updateCountdown()
      const timer = setInterval(updateCountdown, 1000)
      
      return () => clearInterval(timer)
    } else {
      setCanResend(true)
    }
  }, [nextResendTime])

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (code.length !== 6) {
      setError('驗證碼必須為 6 位數字')
      return
    }

    setIsVerifying(true)

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          code
        }),
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess(data.user)
      } else {
        setError(data.error || '驗證失敗')
        setCode('')
      }
    } catch (error) {
      console.error('驗證失敗:', error)
      setError('網絡錯誤，請稍後再試')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendEmail = async () => {
    if (!canResend) return

    setError('')
    setIsResending(true)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (response.ok) {
        // 更新倒計時
        if (data.nextResendTime) {
          const targetTime = new Date(data.nextResendTime).getTime()
          const now = Date.now()
          const diff = Math.max(0, Math.ceil((targetTime - now) / 1000))
          setCountdown(diff)
          setCanResend(false)
        }
      } else {
        setError(data.error || '重新發送失敗')
      }
    } catch (error) {
      console.error('重新發送失敗:', error)
      setError('網絡錯誤，請稍後再試')
    } finally {
      setIsResending(false)
    }
  }

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* 標題 */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">驗證您的電子郵件</h1>
        <p className="text-gray-600">
          我們已發送 6 位數驗證碼到<br />
          <span className="font-medium text-blue-600">{email}</span>
        </p>
      </div>

      {/* 驗證碼輸入表單 */}
      <form onSubmit={handleVerifyCode} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">驗證碼</label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={e => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6)
              setCode(value)
              setError('')
            }}
            placeholder="輸入 6 位數驗證碼"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            maxLength={6}
            autoComplete="one-time-code"
            disabled={isVerifying}
          />
        </div>

        {error && (
          <div className="mb-8">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          disabled={isVerifying || code.length !== 6}
        >
          {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isVerifying ? '驗證中...' : '驗證郵件'}
        </button>
      </form>

      {/* 重新發送 */}
      <div className="text-center space-y-3">
        <p className="text-sm text-gray-600">
          沒有收到驗證碼？
        </p>
        
        <button
          onClick={handleResendEmail}
          disabled={!canResend || isResending}
          className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {!isResending && <RefreshCw className="mr-2 h-4 w-4" />}
          {canResend 
            ? (isResending ? '重新發送中...' : '重新發送驗證碼')
            : `重新發送 (${formatCountdown(countdown)})`
          }
        </button>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• 驗證碼將在 10 分鐘後過期</p>
          <p>• 每天最多可發送 5 次驗證碼</p>
          <p>• 如果仍未收到，請檢查垃圾郵件資料夾</p>
        </div>
      </div>
    </div>
  )
}