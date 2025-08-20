import { NextRequest, NextResponse } from 'next/server'
import { loginSchema } from '@/lib/auth/schemas'
import { authenticateUser } from '@/lib/auth/auth'
import { createSession, setSessionCookie } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 驗證請求資料
    const validatedData = loginSchema.parse(body)
    
    // 驗證使用者憑證
    const result = await authenticateUser({
      email: validatedData.email,
      password: validatedData.password
    })
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }
    
    // 檢查是否需要強制改密碼
    if (result.user!.mustChangePassword) {
      return NextResponse.json({
        message: '需要更改密碼',
        mustChangePassword: true,
        user: {
          id: result.user!.id,
          email: result.user!.email,
          displayName: result.user!.displayName,
          emailVerified: result.user!.emailVerified,
          mustChangePassword: result.user!.mustChangePassword,
          roles: result.user!.roles
        }
      })
    }
    
    // 建立 session
    const sessionToken = createSession({
      userId: result.user!.id,
      email: result.user!.email,
      displayName: result.user!.displayName,
      roles: result.user!.roles
    })
    
    const response = NextResponse.json({
      message: '登入成功',
      user: {
        id: result.user!.id,
        email: result.user!.email,
        displayName: result.user!.displayName,
        emailVerified: result.user!.emailVerified,
        mustChangePassword: result.user!.mustChangePassword,
        roles: result.user!.roles
      }
    })
    
    console.log('Setting session cookie with token:', sessionToken.substring(0, 50) + '...')
    setSessionCookie(response, sessionToken)
    console.log('Session cookie set successfully')
    
    return response
  } catch (error) {
    console.error('登入 API 錯誤:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: '輸入資料格式不正確', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: '登入失敗，請稍後再試' },
      { status: 500 }
    )
  }
}