import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resendVerificationEmail } from '@/lib/auth/email-verification'

const resendSchema = z.object({
  userId: z.string().min(1, '用戶 ID 不能為空')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 驗證請求資料
    const validatedData = resendSchema.parse(body)
    
    // 重新發送驗證郵件
    const result = await resendVerificationEmail(validatedData.userId)
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error,
          canResend: result.canResend,
          nextResendTime: result.nextResendTime
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json({
      message: '驗證郵件已重新發送',
      canResend: result.canResend,
      nextResendTime: result.nextResendTime
    }, { status: 200 })
    
  } catch (error) {
    console.error('重新發送驗證郵件 API 錯誤:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '輸入資料格式不正確', details: error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: '重新發送失敗，請稍後再試' },
      { status: 500 }
    )
  }
}