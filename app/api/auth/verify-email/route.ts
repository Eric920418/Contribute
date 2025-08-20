import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyEmailCode } from '@/lib/auth/email-verification'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const verifyEmailSchema = z.object({
  userId: z.string().min(1, '用戶 ID 不能為空'),
  code: z.string().length(6, '驗證碼必須為 6 位數字').regex(/^\d{6}$/, '驗證碼只能包含數字')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 驗證請求資料
    const validatedData = verifyEmailSchema.parse(body)
    
    // 驗證郵件驗證碼
    const result = await verifyEmailCode(validatedData.userId, validatedData.code)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // 獲取已驗證的用戶信息
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用戶不存在' },
        { status: 404 }
      )
    }

    // 建立 session
    const sessionToken = createSession({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles.map(ur => ur.role.key)
    })
    
    const response = NextResponse.json({
      message: '郵件驗證成功，歡迎使用！',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: !!user.emailVerifiedAt,
        roles: user.roles.map(ur => ur.role.key)
      }
    }, { status: 200 })
    
    setSessionCookie(response, sessionToken)
    
    return response
  } catch (error) {
    console.error('郵件驗證 API 錯誤:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '輸入資料格式不正確', details: error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: '驗證失敗，請稍後再試' },
      { status: 500 }
    )
  }
}