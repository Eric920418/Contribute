'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import type { LoginFormData, RegisterFormData, ForgotPasswordFormData, ResetPasswordFormData } from '@/lib/auth/schemas'

// 類型定義
interface User {
  id: string
  email: string
  displayName: string
  emailVerified: boolean
  roles: string[]
}

interface AuthResponse {
  user: User
  token?: string
}

interface AuthError {
  message: string
  field?: string
}

// 登入 Hook
export function useLogin() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation<AuthResponse, AuthError, LoginFormData>({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiClient.post('/auth/login', data)
      return response.data
    },
    onSuccess: (data) => {
      // 更新用戶查詢快取
      queryClient.setQueryData(['auth', 'me'], data.user)
      
      // 根據用戶角色導向不同頁面
      const roles = data.user.roles
      if (roles.includes('AUTHOR') && !roles.includes('EDITOR') && !roles.includes('ADMIN')) {
        router.push('/author/dashboard')
      } else if (roles.includes('REVIEWER') && !roles.includes('EDITOR') && !roles.includes('ADMIN')) {
        router.push('/reviewer/dashboard')
      } else if (roles.includes('EDITOR')) {
        router.push('/editor/dashboard')
      } else if (roles.includes('ADMIN')) {
        router.push('/admin/dashboard')
      } else {
        router.push('/dashboard')
      }
    },
    onError: (error) => {
      console.error('登入失敗:', error)
    },
  })
}

// 註冊 Hook
export function useRegister() {
  const router = useRouter()

  return useMutation<AuthResponse, AuthError, RegisterFormData>({
    mutationFn: async (data: RegisterFormData) => {
      const response = await apiClient.post('/auth/register', data)
      return response.data
    },
    onSuccess: () => {
      router.push('/auth/verify?message=請檢查您的 Email 完成帳號驗證')
    },
    onError: (error) => {
      console.error('註冊失敗:', error)
    },
  })
}

// 登出 Hook
export function useLogout() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation<void, AuthError, void>({
    mutationFn: async () => {
      await apiClient.post('/auth/logout')
    },
    onSuccess: () => {
      // 清除用戶查詢快取
      queryClient.removeQueries({ queryKey: ['auth'] })
      router.push('/login')
    },
    onError: (error) => {
      console.error('登出失敗:', error)
      // 即使登出失敗也要清除本地狀態
      queryClient.removeQueries({ queryKey: ['auth'] })
      router.push('/login')
    },
  })
}

// 獲取當前用戶 Hook
export function useAuth() {
  return useQuery<User, AuthError>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/me')
      return response.data.user
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 分鐘
  })
}

// 忘記密碼 Hook
export function useForgotPassword() {
  return useMutation<{ message: string }, AuthError, ForgotPasswordFormData>({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const response = await apiClient.post('/auth/forgot-password', data)
      return response.data
    },
    onError: (error) => {
      console.error('忘記密碼請求失敗:', error)
    },
  })
}

// 重設密碼 Hook
export function useResetPassword() {
  const router = useRouter()

  return useMutation<{ message: string }, AuthError, ResetPasswordFormData & { token: string }>({
    mutationFn: async (data: ResetPasswordFormData & { token: string }) => {
      const response = await apiClient.post('/auth/reset-password', data)
      return response.data
    },
    onSuccess: () => {
      router.push('/login?message=密碼重設成功，請使用新密碼登入')
    },
    onError: (error) => {
      console.error('密碼重設失敗:', error)
    },
  })
}

// Email 驗證 Hook
export function useVerifyEmail() {
  const router = useRouter()

  return useMutation<{ message: string }, AuthError, { token: string }>({
    mutationFn: async (data: { token: string }) => {
      const response = await apiClient.post('/auth/verify-email', data)
      return response.data
    },
    onSuccess: () => {
      router.push('/login?message=Email 驗證成功，請登入您的帳號')
    },
    onError: (error) => {
      console.error('Email 驗證失敗:', error)
    },
  })
}

// 重新發送驗證郵件 Hook
export function useResendVerification() {
  return useMutation<{ message: string }, AuthError, { email: string }>({
    mutationFn: async (data: { email: string }) => {
      const response = await apiClient.post('/auth/resend-verification', data)
      return response.data
    },
    onError: (error) => {
      console.error('重新發送驗證郵件失敗:', error)
    },
  })
}

// 檢查認證狀態的輔助函數
export function useAuthStatus() {
  const { data: user, isLoading, error } = useAuth()
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    isError: !!error,
  }
}

// 角色檢查 Hook
export function useHasRole(role: string) {
  const { user } = useAuthStatus()
  return user?.roles?.includes(role) ?? false
}

// 權限檢查 Hook
export function useHasAnyRole(roles: string[]) {
  const { user } = useAuthStatus()
  return roles.some(role => user?.roles?.includes(role)) ?? false
}