'use client'

import { useRouter } from 'next/navigation'
import Register from '@/components/pages/Register'

export default function RegisterPage() {
  const router = useRouter()

  const handleSuccess = (user: any) => {
    // 註冊並郵件驗證成功，跳轉到首頁或儀表板
    console.log('註冊成功，用戶:', user)
    router.push('/dashboard')
  }

  return (
    <Register onSuccess={handleSuccess} />
  )
}