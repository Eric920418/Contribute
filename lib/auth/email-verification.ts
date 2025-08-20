import { PrismaClient } from '@prisma/client'
import { createEmailService, generateVerificationCode } from '@/lib/email/mailer'

const prisma = new PrismaClient()

export interface EmailVerificationResult {
  success: boolean
  error?: string
  canResend?: boolean
  nextResendTime?: Date
}

export async function createEmailVerificationToken(
  userId: string, 
  email: string,
  displayName: string
): Promise<EmailVerificationResult> {
  try {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000) // 10分鐘後過期

    // 檢查是否存在未過期的驗證碼
    const existingToken = await prisma.emailVerificationToken.findFirst({
      where: {
        userId,
        expiresAt: { gt: now },
        usedAt: null
      },
      orderBy: { createdAt: 'desc' }
    })

    // 檢查今日發送次數（防止濫用）
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const todayCount = await prisma.emailVerificationToken.count({
      where: {
        userId,
        createdAt: {
          gte: today,
          lte: todayEnd
        }
      }
    })

    if (todayCount >= 5) {
      return {
        success: false,
        error: '今日發送驗證碼次數已達上限（5次），請明天再試',
        canResend: false
      }
    }

    // 如果存在未過期的驗證碼，檢查是否可以重新發送（至少間隔1分鐘）
    if (existingToken) {
      const lastSentTime = existingToken.createdAt
      const nextAllowedTime = new Date(lastSentTime.getTime() + 60 * 1000) // 1分鐘後
      
      if (now < nextAllowedTime) {
        return {
          success: false,
          error: '請等待 1 分鐘後再重新發送驗證碼',
          canResend: false,
          nextResendTime: nextAllowedTime
        }
      }

      // 使舊的驗證碼失效
      await prisma.emailVerificationToken.updateMany({
        where: {
          userId,
          usedAt: null
        },
        data: {
          usedAt: now
        }
      })
    }

    // 生成新的驗證碼
    const code = generateVerificationCode()
    
    // 保存到數據庫
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        code,
        expiresAt
      }
    })

    // 發送郵件
    const emailService = createEmailService()
    const emailSent = await emailService.sendVerificationEmail({
      to: email,
      name: displayName,
      code,
      appName: process.env.APP_NAME || '科技學術研討會平台',
      appUrl: process.env.APP_URL || 'http://localhost:3000'
    })

    if (!emailSent) {
      return {
        success: false,
        error: '郵件發送失敗，請稍後再試'
      }
    }

    return {
      success: true,
      canResend: true,
      nextResendTime: new Date(now.getTime() + 60 * 1000)
    }

  } catch (error) {
    console.error('創建郵件驗證碼失敗:', error)
    return {
      success: false,
      error: '系統錯誤，請稍後再試'
    }
  }
}

export async function verifyEmailCode(
  userId: string, 
  code: string
): Promise<EmailVerificationResult> {
  try {
    const now = new Date()

    // 查找有效的驗證碼
    const token = await prisma.emailVerificationToken.findFirst({
      where: {
        userId,
        code,
        expiresAt: { gt: now },
        usedAt: null
      }
    })

    if (!token) {
      // 增加嘗試次數
      await prisma.emailVerificationToken.updateMany({
        where: {
          userId,
          code,
          usedAt: null
        },
        data: {
          attempts: { increment: 1 }
        }
      })

      return {
        success: false,
        error: '驗證碼無效或已過期'
      }
    }

    // 檢查嘗試次數（防止暴力破解）
    if (token.attempts >= 3) {
      await prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { usedAt: now }
      })

      return {
        success: false,
        error: '驗證碼嘗試次數過多，請重新發送新的驗證碼'
      }
    }

    // 標記驗證碼為已使用
    await prisma.emailVerificationToken.update({
      where: { id: token.id },
      data: { usedAt: now }
    })

    // 更新用戶的郵件驗證狀態
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: now }
    })

    return {
      success: true
    }

  } catch (error) {
    console.error('驗證郵件驗證碼失敗:', error)
    return {
      success: false,
      error: '系統錯誤，請稍後再試'
    }
  }
}

export async function resendVerificationEmail(
  userId: string
): Promise<EmailVerificationResult> {
  try {
    // 獲取用戶信息
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return {
        success: false,
        error: '用戶不存在'
      }
    }

    if (user.emailVerifiedAt) {
      return {
        success: false,
        error: '郵件已經驗證，無需重新發送'
      }
    }

    // 重新創建驗證碼
    return await createEmailVerificationToken(
      userId, 
      user.email, 
      user.displayName
    )

  } catch (error) {
    console.error('重新發送驗證郵件失敗:', error)
    return {
      success: false,
      error: '系統錯誤，請稍後再試'
    }
  }
}