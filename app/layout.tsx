import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { QueryProvider } from '@/providers/query-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '科技學術研討會平台',
  description: '支援投稿、審稿、編輯流程的完整學術研討會管理平台',
  keywords: '學術研討會,投稿系統,審稿系統,期刊管理,學術出版',
  authors: [{ name: '科技學術研討會平台' }],
  openGraph: {
    title: '科技學術研討會平台',
    description: '支援投稿、審稿、編輯流程的完整學術研討會管理平台',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className={cn(inter.className, 'antialiased')}>
        <QueryProvider>
          <main className="min-h-screen bg-background">
            {children}
          </main>
        </QueryProvider>
      </body>
    </html>
  )
}