'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function ForceChangePasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // 從 URL 參數獲取用戶email
  const email = searchParams.get('email') || ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      alert('新密碼不一致')
      return
    }

    if (newPassword.length < 8) {
      alert('密碼至少需要8個字元')
      return
    }

    if (!validatePassword(newPassword)) {
      alert('密碼必須包含大小寫字母和數字')
      return
    }

    if (currentPassword === newPassword) {
      alert('新密碼不能與目前密碼相同')
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/auth/force-change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          currentPassword,
          newPassword,
          confirmPassword
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message || '密碼更改成功！')
        
        // 根據用戶角色跳轉到對應頁面
        const userRoles = data.user?.roles || []
        if (userRoles.includes('EDITOR') || userRoles.includes('CHIEF_EDITOR')) {
          router.push('/editor/dashboard')
        } else if (userRoles.includes('REVIEWER')) {
          router.push('/reviewer/dashboard')
        } else if (userRoles.includes('AUTHOR')) {
          router.push('/author')
        } else {
          // 預設跳轉到作者頁面
          router.push('/author')
        }
      } else {
        console.error('密碼更改失敗:', data)
        alert(data.error || '更改失敗，請稍後再試')
      }
    } catch (error) {
      console.error('密碼更改請求錯誤:', error)
      alert('網路錯誤，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  const validatePassword = (password: string) => {
    return password.length >= 8 && 
           /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
  }

  const isValidForm = currentPassword.trim() && 
                      newPassword.trim() && 
                      confirmPassword.trim() && 
                      newPassword === confirmPassword &&
                      validatePassword(newPassword) &&
                      currentPassword !== newPassword

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header currentPage="submit" />

      <main className="flex-1 px-[360px] py-28 bg-gray-100">
        <div className="max-w-[800px] mx-auto">
          <div className="bg-white rounded-lg p-20 text-center">
            <h1 className="text-foreground text-[40px] font-medium leading-[58px] mb-14">
              必須更改密碼
            </h1>
            
            <p className="text-[28px] leading-[44px] text-foreground/60 mb-14">
              為了您的帳戶安全，請更改您的密碼後才能繼續使用系統。
            </p>

            <form onSubmit={handleSubmit} className="space-y-14">
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="目前密碼"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-[122px] px-8 pr-[120px] text-[40px] border-2 border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 text-foreground/40 hover:text-foreground/60"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-[56px] h-[56px]" />
                  ) : (
                    <Eye className="w-[56px] h-[56px]" />
                  )}
                </button>
              </div>

              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="新密碼"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-[122px] px-8 pr-[120px] text-[40px] border-2 border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-8 top-1/2 transform -translate-y-1/2 text-foreground/40 hover:text-foreground/60"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-[56px] h-[56px]" />
                  ) : (
                    <Eye className="w-[56px] h-[56px]" />
                  )}
                </button>
                {newPassword && !validatePassword(newPassword) && (
                  <p className="mt-4 text-red-500 text-[20px]">
                    密碼必須至少8個字元，包含大小寫字母和數字
                  </p>
                )}
              </div>

              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="確認新密碼"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-4 text-red-500 text-[20px]">
                    密碼不一致
                  </p>
                )}
                {currentPassword && newPassword && currentPassword === newPassword && (
                  <p className="mt-4 text-red-500 text-[20px]">
                    新密碼不能與目前密碼相同
                  </p>
                )}
              </div>

              <div>
                <Button
                  type="submit"
                  disabled={!isValidForm || isSubmitting}
                  size="xl"
                  className="w-full h-[122px] text-[40px] font-medium leading-[58px] bg-primary text-white rounded-lg"
                >
                  {isSubmitting ? '更改中...' : '確認更改'}
                </Button>
              </div>
            </form>

            <div className="mt-14">
              <p className="text-foreground text-[24px] leading-[38px] text-foreground/60">
                這是強制性的安全措施，無法跳過此步驟
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}