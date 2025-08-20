'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 預設查詢配置
            staleTime: 1000 * 60 * 5, // 5 分鐘
            retry: (failureCount, error: any) => {
              // 如果是 401 錯誤（未授權），不要重試
              if (error?.status === 401) {
                return false
              }
              // 其他錯誤最多重試 2 次
              return failureCount < 2
            },
            refetchOnWindowFocus: false, // 視窗聚焦時不自動重新載入
          },
          mutations: {
            // 預設變更配置
            retry: false, // 變更操作不重試
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}