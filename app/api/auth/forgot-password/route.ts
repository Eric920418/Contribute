import { NextRequest, NextResponse } from 'next/server'
import { forgotPasswordSchema } from '@/lib/auth/schemas'
import { createPasswordResetToken } from '@/lib/auth/auth'
import { createEmailService, PasswordResetEmailData } from '@/lib/email/mailer'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('忘記密碼 API 收到請求:', { email: body.email })
    
    // 驗證請求資料
    const validatedData = forgotPasswordSchema.parse(body)
    console.log('資料驗證通過:', validatedData)
    
    // 先檢查用戶是否存在
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() }
    })
    
    if (!user) {
      console.log('用戶不存在:', validatedData.email)
      // 即使用戶不存在，也返回成功訊息（安全考量）
      return NextResponse.json({
        message: '如果該 Email 存在，我們已經發送密碼重設連結到您的信箱'
      })
    }
    
    console.log('找到用戶:', { id: user.id, email: user.email, displayName: user.displayName })
    
    // 建立重設令牌
    const token = await createPasswordResetToken(validatedData.email)
    console.log('密碼重設令牌創建結果:', token ? '成功' : '失敗')
    
    if (!token) {
      console.error('創建密碼重設令牌失敗')
      return NextResponse.json({
        message: '如果該 Email 存在，我們已經發送密碼重設連結到您的信箱'
      })
    }
    
    // 發送密碼重設郵件
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`
    console.log('準備發送郵件，重設連結:', resetUrl)
    
    try {
      console.log('測試 SMTP 連接...')
      const emailService = createEmailService()
      
      // 先測試 SMTP 連接
      const connectionTest = await emailService.testConnection()
      console.log('SMTP 連接測試結果:', connectionTest)
      
      if (!connectionTest) {
        console.error('SMTP 連接失敗，無法發送郵件')
        // 即使連接失敗，也不暴露給用戶
      } else {
        console.log('SMTP 連接成功，準備發送密碼重設郵件')
        
        const emailData: PasswordResetEmailData = {
          to: user.email,
          name: user.displayName,
          resetUrl,
          appName: process.env.APP_NAME || '科技學術研討會平台',
          appUrl: process.env.APP_URL || 'http://localhost:3000'
        }
        console.log('郵件資料準備完成:', {
          to: emailData.to,
          name: emailData.name,
          appName: emailData.appName,
          resetUrl: emailData.resetUrl
        })
        
        const emailSent = await emailService.sendPasswordResetEmail(emailData)
        console.log('郵件發送結果:', emailSent ? '成功' : '失敗')
        
        if (!emailSent) {
          console.error('發送密碼重設郵件失敗:', user.email)
          // 即使郵件發送失敗，也不暴露給用戶
        } else {
          console.log('密碼重設郵件發送成功！')
        }
      }
      
    } catch (emailError) {
      console.error('郵件發送過程出錯:', emailError)
      if (emailError instanceof Error) {
        console.error('錯誤詳情:', emailError.message)
        console.error('錯誤堆疊:', emailError.stack)
      }
    }
    
    return NextResponse.json({
      message: '如果該 Email 存在，我們已經發送密碼重設連結到您的信箱'
    })
  } catch (error) {
    console.error('忘記密碼 API 錯誤:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: '輸入資料格式不正確', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: '處理失敗，請稍後再試' },
      { status: 500 }
    )
  }
}