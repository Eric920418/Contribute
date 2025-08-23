import { NextRequest, NextResponse } from 'next/server'
import { changePasswordSchema } from '@/lib/auth/schemas'
import { authenticateUser, hashPassword } from '@/lib/auth/auth'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 驗證請求資料
    const validatedData = changePasswordSchema.parse(body)
    const { email } = body // 需要額外的email字段
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email 欄位必填' },
        { status: 400 }
      )
    }
    
    // 驗證目前密碼
    const authResult = await authenticateUser({
      email,
      password: validatedData.currentPassword
    })
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: '目前密碼錯誤' },
        { status: 401 }
      )
    }
    
    // 確認用戶確實需要強制改密碼
    if (!authResult.user!.mustChangePassword) {
      return NextResponse.json(
        { error: '您不需要強制更改密碼' },
        { status: 400 }
      )
    }
    
    // 更新密碼並取消強制改密碼標記，同時啟用帳號
    const hashedPassword = await hashPassword(validatedData.newPassword)
    
    await prisma.user.update({
      where: { id: authResult.user!.id },
      data: { 
        passwordHash: hashedPassword,
        mustChangePassword: false,
        status: 'ENABLED' // 密碼更改後自動啟用帳號
      }
    })
    
    // 建立 session
    const sessionToken = createSession({
      userId: authResult.user!.id,
      email: authResult.user!.email,
      displayName: authResult.user!.displayName,
      roles: authResult.user!.roles
    })
    
    const response = NextResponse.json({
      message: '密碼更改成功',
      user: {
        id: authResult.user!.id,
        email: authResult.user!.email,
        displayName: authResult.user!.displayName,
        emailVerified: authResult.user!.emailVerified,
        mustChangePassword: false,
        roles: authResult.user!.roles
      }
    })
    
    setSessionCookie(response, sessionToken)
    
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: '輸入資料格式不正確', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: '密碼更改失敗，請稍後再試' },
      { status: 500 }
    )
  }
}