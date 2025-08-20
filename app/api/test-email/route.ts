import { NextRequest, NextResponse } from 'next/server'
import { createEmailService } from '@/lib/email/mailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testEmail } = body

    if (!testEmail) {
      return NextResponse.json(
        { error: '請提供測試郵件地址' },
        { status: 400 }
      )
    }

    console.log('開始測試郵件發送...')
    console.log('SMTP 配置:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM
    })

    const emailService = createEmailService()
    
    // 先測試連接
    console.log('測試 SMTP 連接...')
    const connectionTest = await emailService.testConnection()
    
    if (!connectionTest) {
      return NextResponse.json(
        { error: 'SMTP 連接失敗，請檢查配置' },
        { status: 500 }
      )
    }

    console.log('SMTP 連接成功，發送測試郵件...')
    
    // 發送測試郵件
    const emailSent = await emailService.sendVerificationEmail({
      to: testEmail,
      name: '測試用戶',
      code: '123456',
      appName: process.env.APP_NAME || '科技學術研討會平台',
      appUrl: process.env.APP_URL || 'http://localhost:3000'
    })

    if (emailSent) {
      return NextResponse.json({
        message: '測試郵件發送成功！',
        success: true
      })
    } else {
      return NextResponse.json(
        { error: '郵件發送失敗，請檢查 SMTP 配置' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('測試郵件發送失敗:', error)
    
    // 詳細的錯誤信息
    let errorMessage = '未知錯誤'
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Gmail 特定錯誤處理
      if (errorMessage.includes('Invalid login')) {
        errorMessage = 'Gmail 認證失敗：請檢查用戶名和應用程式密碼'
      } else if (errorMessage.includes('authentication failed')) {
        errorMessage = 'Gmail 認證失敗：可能需要重新生成應用程式密碼'
      } else if (errorMessage.includes('ENOTFOUND')) {
        errorMessage = 'SMTP 服務器連接失敗：請檢查網絡連接'
      }
    }

    return NextResponse.json(
      { 
        error: `郵件發送失敗：${errorMessage}`,
        details: error instanceof Error ? error.stack : '無詳細信息'
      },
      { status: 500 }
    )
  }
}