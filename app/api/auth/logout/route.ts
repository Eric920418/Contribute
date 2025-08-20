import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      message: '登出成功'
    })
    
    clearSessionCookie(response)
    
    return response
  } catch (error) {
    console.error('登出 API 錯誤:', error)
    
    return NextResponse.json(
      { error: '登出失敗，請稍後再試' },
      { status: 500 }
    )
  }
}