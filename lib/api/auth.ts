import { apiCall } from './client'
import type { 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  User 
} from './types'

export const authApi = {
  // 註冊
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    return apiCall('POST', '/auth/register', data)
  },

  // 登入
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    return apiCall('POST', '/auth/login', data)
  },

  // 登出
  logout: async (): Promise<void> => {
    return apiCall('POST', '/auth/logout')
  },

  // 忘記密碼
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return apiCall('POST', '/auth/forgot-password', { email })
  },

  // 重設密碼
  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    return apiCall('POST', '/auth/reset-password', { 
      token, 
      password, 
      confirmPassword: password 
    })
  },

  // 獲取當前使用者資訊
  getCurrentUser: async (): Promise<User> => {
    return apiCall('GET', '/auth/me')
  },

  // 驗證 Email
  verifyEmail: async (token: string): Promise<{ message: string }> => {
    return apiCall('POST', '/auth/verify-email', { token })
  },

  // 重新發送驗證 Email
  resendVerification: async (): Promise<{ message: string }> => {
    return apiCall('POST', '/auth/resend-verification')
  },

  // 變更密碼
  changePassword: async (
    currentPassword: string, 
    newPassword: string
  ): Promise<{ message: string }> => {
    return apiCall('POST', '/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword: newPassword
    })
  },

  // 更新個人資料
  updateProfile: async (data: {
    displayName?: string
    orcid?: string
  }): Promise<User> => {
    return apiCall('PUT', '/auth/profile', data)
  }
}