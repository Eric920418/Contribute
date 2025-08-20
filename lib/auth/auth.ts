import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { generateRandomString } from '@/lib/utils'

const prisma = new PrismaClient()

export interface CreateUserData {
  email: string
  password: string
  displayName: string
  orcid?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResult {
  success: boolean
  user?: {
    id: string
    email: string
    displayName: string
    emailVerified: boolean
    mustChangePassword: boolean
    roles: string[]
  }
  error?: string
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12')
  return bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createUser(userData: CreateUserData): Promise<AuthResult> {
  try {
    // 檢查使用者是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email.toLowerCase() }
    })

    if (existingUser) {
      return {
        success: false,
        error: '此 Email 已被註冊'
      }
    }

    // 建立新使用者
    const hashedPassword = await hashPassword(userData.password)
    const user = await prisma.user.create({
      data: {
        email: userData.email.toLowerCase(),
        passwordHash: hashedPassword,
        displayName: userData.displayName,
        orcid: userData.orcid,
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    // 指派預設作者角色
    const authorRole = await prisma.role.findUnique({
      where: { key: 'AUTHOR' }
    })

    if (authorRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: authorRole.id
        }
      })
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: !!user.emailVerifiedAt,
        mustChangePassword: user.mustChangePassword,
        roles: user.roles.map(ur => ur.role.key)
      }
    }
  } catch (error) {
    console.error('創建使用者失敗:', error)
    return {
      success: false,
      error: '註冊失敗，請稍後再試'
    }
  }
}

export async function authenticateUser(credentials: LoginCredentials): Promise<AuthResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: credentials.email.toLowerCase() },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!user) {
      return {
        success: false,
        error: 'Email 或密碼錯誤'
      }
    }

    const isPasswordValid = await verifyPassword(credentials.password, user.passwordHash)
    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Email 或密碼錯誤'
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: !!user.emailVerifiedAt,
        mustChangePassword: user.mustChangePassword,
        roles: user.roles.map(ur => ur.role.key)
      }
    }
  } catch (error) {
    console.error('認證失敗:', error)
    return {
      success: false,
      error: '登入失敗，請稍後再試'
    }
  }
}

export async function createPasswordResetToken(email: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return null
    }

    // 生成重設令牌
    const token = generateRandomString(32)
    const hashedToken = await hashPassword(token)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小時後過期

    // 刪除舊的重設令牌
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    })

    // 建立新的重設令牌
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt
      }
    })

    return token
  } catch (error) {
    console.error('建立密碼重設令牌失敗:', error)
    return null
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  try {
    const resetTokens = await prisma.passwordResetToken.findMany({
      where: {
        expiresAt: { gt: new Date() },
        usedAt: null
      },
      include: {
        user: true
      }
    })

    // 找到符合的令牌
    let validToken = null
    for (const resetToken of resetTokens) {
      if (await verifyPassword(token, resetToken.token)) {
        validToken = resetToken
        break
      }
    }

    if (!validToken) {
      return false
    }

    // 更新密碼
    const hashedPassword = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: validToken.userId },
      data: { passwordHash: hashedPassword }
    })

    // 標記令牌為已使用
    await prisma.passwordResetToken.update({
      where: { id: validToken.id },
      data: { usedAt: new Date() }
    })

    return true
  } catch (error) {
    console.error('重設密碼失敗:', error)
    return false
  }
}

export async function verifyEmailToken(userId: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() }
    })
    return true
  } catch (error) {
    console.error('Email 驗證失敗:', error)
    return false
  }
}