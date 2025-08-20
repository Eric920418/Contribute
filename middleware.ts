import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

interface SessionData {
  userId: string
  email: string
  displayName: string
  roles: string[]
  iat?: number
  exp?: number
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret'

// 使用Web Crypto API驗證JWT（Edge Runtime兼容）
async function verifyJWTToken(token: string): Promise<SessionData | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const [headerB64, payloadB64, signatureB64] = parts
    
    // 解碼payload
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson) as SessionData & { iss?: string; aud?: string }
    
    // 檢查過期時間
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    
    // 檢查issuer和audience
    if (payload.iss !== 'conference-platform' || payload.aud !== 'conference-platform-users') {
      return null
    }
    
    // 簡化版：暫時跳過signature驗證（在生產環境中需要實現）
    return payload
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

// 需要認證的路由
const protectedRoutes = [
  '/author',
  '/reviewer',
  '/editor',
]

// 不需要認證但已登錄用戶應該重定向的路由
const authRoutes = [
  '/login',
  '/register',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 獲取session cookie
  const sessionToken = request.cookies.get('session')?.value
  console.log('Middleware: sessionToken exists:', !!sessionToken)
  
  // 驗證session
  let session = null
  if (sessionToken) {
    session = await verifyJWTToken(sessionToken)
    console.log('Middleware: session verified:', !!session)
  }

  // 檢查是否為受保護的路由
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  // 檢查是否為認證路由（登錄/註冊）
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  )

  // 如果是受保護路由但沒有有效session，重定向到登錄
  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 暫時停用認證路由的自動重定向，避免循環
  // if (isAuthRoute && session) {
  //   const redirectTo = request.nextUrl.searchParams.get('redirect')
  //   if (redirectTo) {
  //     return NextResponse.redirect(new URL(redirectTo, request.url))
  //   }
  // }

  // 角色權限檢查
  if (isProtectedRoute && session) {
    // 檢查author頁面的權限
    if (pathname.startsWith('/author') && !session.roles.includes('AUTHOR')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // 檢查reviewer頁面的權限
    if (pathname.startsWith('/reviewer') && !session.roles.includes('REVIEWER')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // 檢查editor頁面的權限
    if (pathname.startsWith('/editor') && 
        !session.roles.some(role => ['EDITOR', 'CHIEF_EDITOR'].includes(role))) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * 匹配所有請求路徑除了以下開頭的：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}