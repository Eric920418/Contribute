import { NextRequest, NextResponse } from 'next/server'
import { resetPasswordSchema } from '@/lib/auth/schemas'
import { resetPassword } from '@/lib/auth/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 驗證請求資料
    const validatedData = resetPasswordSchema.parse(body)
    
    // 重設密碼
    const result = await resetPassword(validatedData.token, validatedData.password)
    
    if (!result.success) {
      return NextResponse.json(
        { error: '重設連結無效或已過期' },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      message: '密碼重設成功，正在導向...',
      user: result.user
    })
  } catch (error) {
    console.error('重設密碼 API 錯誤:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: '輸入資料格式不正確', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: '重設失敗，請稍後再試' },
      { status: 500 }
    )
  }
}