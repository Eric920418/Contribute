'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'

export interface User {
  id: string
  email: string
  displayName: string
  emailVerified: boolean
  roles: string[]
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
}

export function useAuth() {
  const router = useRouter()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    isAuthenticated: false,
  })
  const [hasChecked, setHasChecked] = useState(false) // 防止重複檢查的標記

  const checkAuth = async () => {
    if (hasChecked) return // 如果已經檢查過，就不要重複檢查
    
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      const response = await apiClient.get('/auth/me')
      
      if (response.data.user) {
        setAuthState({
          user: response.data.user,
          loading: false,
          error: null,
          isAuthenticated: true,
        })
        setHasChecked(true)
        return response.data.user
      } else {
        // 明確處理沒有用戶的情況
        setAuthState({
          user: null,
          loading: false,
          error: null,
          isAuthenticated: false,
        })
        setHasChecked(true)
        return null
      }
    } catch (error: any) {
      console.error('認證檢查失敗:', error)
      setAuthState({
        user: null,
        loading: false,
        error: error.response?.data?.error || '認證失敗',
        isAuthenticated: false,
      })
      setHasChecked(true)
      return null
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User; mustChangePassword?: boolean }> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }))
      
      const response = await apiClient.post('/auth/login', {
        email,
        password
      })

      if (response.data.user) {
        setAuthState({
          user: response.data.user,
          loading: false,
          error: null,
          isAuthenticated: true,
        })
        setHasChecked(true) // 登入成功後標記為已檢查
        return { success: true, user: response.data.user, mustChangePassword: response.data.mustChangePassword }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || '登入失敗'
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isAuthenticated: false,
      }))
      return { success: false, error: errorMessage }
    }
    
    return { success: false, error: '未知錯誤' }
  }

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch (error) {
      console.error('登出失敗:', error)
    } finally {
      setAuthState({
        user: null,
        loading: false,
        error: null,
        isAuthenticated: false,
      })
      setHasChecked(false) // 登出後重置檢查標記
      router.push('/login')
    }
  }

  const hasRole = (role: string): boolean => {
    return authState.user?.roles.includes(role) ?? false
  }

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.some(role => hasRole(role))
  }

  useEffect(() => {
    // 完全停用自動檢查，避免循環問題
    // checkAuth()
  }, [])

  return {
    ...authState,
    login,
    logout,
    checkAuth,
    hasRole,
    hasAnyRole,
    isAuthor: hasRole('AUTHOR'),
    isReviewer: hasRole('REVIEWER'),
    isEditor: hasAnyRole(['EDITOR', 'CHIEF_EDITOR']),
    isAdmin: hasRole('ADMIN'),
  }
}