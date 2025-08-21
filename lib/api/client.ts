import axios from 'axios'

// 建立 API 客戶端實例
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 重要：確保 Cookie 被送出
})

// 請求攔截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在這裡添加認證標頭或其他邏輯
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 回應攔截器
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // 統一處理錯誤
    if (error.response?.status === 401) {
      // 只有在非登入頁面時才重定向
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

// API 錯誤處理
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// 統一的 API 呼叫函數
export async function apiCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  data?: any,
  config?: any
): Promise<T> {
  try {
    const response = await apiClient.request({
      method,
      url,
      data,
      ...config,
    })
    
    return response.data
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new ApiError(
        error.response?.data?.error || error.message,
        error.response?.status || 500,
        error.response?.data
      )
    }
    
    throw error
  }
}