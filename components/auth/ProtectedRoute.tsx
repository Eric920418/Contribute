'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
  redirectTo?: string
  showLoadingUI?: boolean
}

export default function ProtectedRoute({
  children,
  requiredRoles = [],
  redirectTo = '/login',
  showLoadingUI = true
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, loading, isAuthenticated, hasAnyRole, checkAuth } = useAuth()
  
  // 在ProtectedRoute中手動觸發認證檢查
  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!loading) {
      // 未登錄
      if (!isAuthenticated || !user) {
        router.push(redirectTo)
        return
      }

      // 檢查角色權限
      if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
        // 沒有所需角色，跳轉到首頁或錯誤頁面
        router.push('/')
        return
      }
    }
  }, [loading, isAuthenticated, user, requiredRoles, hasAnyRole, router, redirectTo])

  if (loading) {
    if (!showLoadingUI) {
      return null
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">驗證中...</p>
        </div>
      </div>
    )
  }

  // 未通過認證檢查，不渲染任何內容（會由 useEffect 處理重定向）
  if (!isAuthenticated || !user) {
    return null
  }

  // 檢查角色權限
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">無權訪問</h1>
          <p className="text-gray-600">您沒有訪問此頁面的權限</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}