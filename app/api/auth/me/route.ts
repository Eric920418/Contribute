import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: '未登入' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        displayName: session.displayName,
        roles: session.roles,
        emailVerified: true, // 簡化版本，實際應該從資料庫查詢
      }
    })
  } catch (error) {
    console.error('獲取使用者資訊失敗:', error)
    
    return NextResponse.json(
      { error: '取得使用者資訊失敗' },
      { status: 500 }
    )
  }
}