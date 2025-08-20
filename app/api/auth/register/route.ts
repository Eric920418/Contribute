import { NextRequest, NextResponse } from 'next/server'
import { registerSchema } from '@/lib/auth/schemas'
import { createUser } from '@/lib/auth/auth'
import { createEmailVerificationToken } from '@/lib/auth/email-verification'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 驗證請求資料
    const validatedData = registerSchema.parse(body)
    
    // 建立新使用者
    const result = await createUser({
      email: validatedData.email,
      password: validatedData.password,
      displayName: validatedData.displayName,
      orcid: validatedData.orcid
    })
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
    
    // 發送郵件驗證碼
    const verificationResult = await createEmailVerificationToken(
      result.user!.id,
      result.user!.email,
      result.user!.displayName
    )

    if (!verificationResult.success) {
      return NextResponse.json(
        { error: `註冊成功，但驗證郵件發送失敗：${verificationResult.error}` },
        { status: 201 }
      )
    }
    
    return NextResponse.json({
      message: '註冊成功，請檢查您的電子郵件並輸入驗證碼',
      requiresVerification: true,
      user: {
        id: result.user!.id,
        email: result.user!.email,
        displayName: result.user!.displayName,
        emailVerified: result.user!.emailVerified,
        roles: result.user!.roles
      },
      nextResendTime: verificationResult.nextResendTime
    }, { status: 201 })
  } catch (error) {
    console.error('註冊 API 錯誤:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: '輸入資料格式不正確', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: '註冊失敗，請稍後再試' },
      { status: 500 }
    )
  }
}