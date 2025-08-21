import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { createEmailService, InvitationEmailData } from '@/lib/email/mailer'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 只有編輯和主編可以查看人員列表
    if (!session.roles.includes('EDITOR') && !session.roles.includes('CHIEF_EDITOR')) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    // 取得查詢參數
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '10'))) // 限制每頁最多50筆
    const search = searchParams.get('search')?.trim() || ''
    const role = searchParams.get('role') || 'all'

    // 建立查詢條件
    const whereCondition: any = {
      id: {
        not: session.userId  // 排除當前登入用戶
      }
    }

    // 搜尋條件
    if (search) {
      whereCondition.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { orcid: { contains: search, mode: 'insensitive' } }
      ]
    }

    // 角色篩選條件
    if (role !== 'all') {
      whereCondition.roles = {
        some: {
          role: {
            key: role === 'editor' ? { in: ['EDITOR', 'CHIEF_EDITOR'] } : 'REVIEWER'
          }
        }
      }
    }

    // 計算總數
    const total = await prisma.user.count({ where: whereCondition })
    const totalPages = Math.ceil(total / limit)
    const skip = (page - 1) * limit

    // 查詢用戶及其角色資訊
    const users = await prisma.user.findMany({
      where: whereCondition,
      include: {
        roles: {
          include: {
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    // 轉換資料格式以符合前端需求
    const members = users.map(user => {
      const userRoles = user.roles.map(ur => ur.role.key)
      const primaryRole = userRoles.includes('CHIEF_EDITOR') ? 'CHIEF_EDITOR' 
                        : userRoles.includes('EDITOR') ? 'EDITOR'
                        : userRoles.includes('REVIEWER') ? 'REVIEWER'
                        : 'AUTHOR'

      return {
        id: user.id,
        name: user.displayName,
        email: user.email,
        affiliation: user.affiliation || '暫無資料',
        position: user.position || '暫無資料',
        orcidId: user.orcid,
        expertise: user.expertise || [],
        status: user.status === 'ENABLED' ? 'enabled' 
                : user.status === 'PENDING_ACTIVATION' ? 'pending_activation'
                : 'not_sent' as 'enabled' | 'pending_activation' | 'not_sent',
        role: primaryRole,
        joinDate: user.createdAt.toISOString().split('T')[0],
        lastActive: user.updatedAt.toISOString().split('T')[0]
      }
    })

    return NextResponse.json({ 
      members,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error('獲取人員列表失敗:', error)
    return NextResponse.json(
      { error: '獲取人員列表失敗' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 只有主編可以新增人員
    if (!session.roles.includes('CHIEF_EDITOR')) {
      return NextResponse.json({ error: '權限不足，只有主編可以新增人員' }, { status: 403 })
    }

    const { name, email, affiliation, position, orcidId, expertise, role, sendEmail = true } = await request.json()

    // 驗證必填欄位
    if (!name?.trim() || !email?.trim() || !affiliation?.trim() || !role) {
      return NextResponse.json({ error: '請填寫所有必填欄位' }, { status: 400 })
    }

    // 驗證專業領域
    if (!expertise || !Array.isArray(expertise) || expertise.length === 0) {
      return NextResponse.json({ error: '請至少選擇一個專業知識領域' }, { status: 400 })
    }

    // 驗證角色
    if (!['CHIEF_EDITOR', 'EDITOR', 'REVIEWER'].includes(role)) {
      return NextResponse.json({ error: '無效的角色' }, { status: 400 })
    }

    // 檢查信箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json({ error: '此信箱已被使用' }, { status: 400 })
    }

    // 生成隨機密碼
    const randomPassword = crypto.randomBytes(8).toString('hex')
    const hashedPassword = await bcrypt.hash(randomPassword, 12)

    // 找到對應的角色ID
    const roleRecord = await prisma.role.findUnique({
      where: { key: role }
    })

    if (!roleRecord) {
      return NextResponse.json({ error: '角色不存在' }, { status: 400 })
    }

    // 創建用戶
    const newUser = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash: hashedPassword,
        displayName: name.trim(),
        affiliation: affiliation.trim(),
        position: position?.trim() || null,
        orcid: orcidId?.trim() || null,
        expertise: expertise,
        mustChangePassword: true,
        status: sendEmail ? 'PENDING_ACTIVATION' : 'NOT_SENT', // 根據是否發送郵件設定狀態
        roles: {
          create: {
            roleId: roleRecord.id
          }
        }
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    // 郵件發送邏輯
    if (sendEmail) {
      try {
        const emailService = createEmailService()
        const invitationData: InvitationEmailData = {
          to: email.trim().toLowerCase(),
          name: name.trim(),
          role: role,
          temporaryPassword: randomPassword,
          loginUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`,
          appName: '科技學術研討會平台',
          appUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000'
        }

        console.log(`發送邀請郵件至: ${email}`)
        const emailSent = await emailService.sendInvitationEmail(invitationData)
        
        if (!emailSent) {
          console.error('邀請郵件發送失敗')
          // 注意：即使郵件發送失敗，我們也不取消用戶創建，只記錄錯誤
        } else {
          console.log(`邀請郵件發送成功: ${email}`)
        }
      } catch (emailError) {
        console.error('發送邀請郵件時發生錯誤:', emailError)
        // 不拋出錯誤，允許用戶創建成功但郵件發送失敗
      }
    } else {
      console.log(`保存用戶但不發送邀請郵件: ${email}`)
    }

    return NextResponse.json({ 
      success: true,
      message: sendEmail ? '人員新增成功並寄送邀請信' : '人員新增成功，未寄送邀請信',
      user: {
        id: newUser.id,
        name: newUser.displayName,
        email: newUser.email,
        role: role,
        status: sendEmail ? 'pending_activation' : 'not_sent'
      }
    })

  } catch (error) {
    console.error('新增人員失敗:', error)
    return NextResponse.json(
      { error: '新增人員失敗' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 只有主編可以刪除人員
    if (!session.roles.includes('CHIEF_EDITOR')) {
      return NextResponse.json({ error: '權限不足，只有主編可以刪除人員' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('id')

    if (!memberId) {
      return NextResponse.json({ error: '缺少成員ID' }, { status: 400 })
    }

    // 檢查要刪除的用戶是否存在
    const userToDelete = await prisma.user.findUnique({
      where: { id: memberId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!userToDelete) {
      return NextResponse.json({ error: '找不到要刪除的成員' }, { status: 404 })
    }

    // 防止刪除自己
    if (userToDelete.id === session.userId) {
      return NextResponse.json({ error: '無法刪除自己的帳號' }, { status: 400 })
    }

    // 檢查是否有其他主編，如果要刪除的是主編
    const isChiefEditor = userToDelete.roles.some(ur => ur.role.key === 'CHIEF_EDITOR')
    if (isChiefEditor) {
      const chiefEditorCount = await prisma.user.count({
        where: {
          roles: {
            some: {
              role: {
                key: 'CHIEF_EDITOR'
              }
            }
          },
          status: 'ENABLED'
        }
      })

      if (chiefEditorCount <= 1) {
        return NextResponse.json({ 
          error: '無法刪除最後一位主編，系統必須至少保留一位主編' 
        }, { status: 400 })
      }
    }

    // 執行刪除操作 - 由於外鍵約束，需要先刪除相關聯的記錄
    await prisma.$transaction(async (tx) => {
      // 檢查是否有正在進行的審核指派
      const activeAssignments = await tx.reviewAssignment.findMany({
        where: { 
          reviewerId: memberId,
          status: { in: ['PENDING', 'ACCEPTED'] }
        },
        include: {
          submission: true
        }
      })

      // 如果有正在進行的審核，提醒無法刪除
      if (activeAssignments.length > 0) {
        throw new Error(`該成員還有 ${activeAssignments.length} 個正在進行的審核任務，無法刪除`)
      }

      // 刪除審核指派記錄（已完成的審核）
      await tx.reviewAssignment.deleteMany({
        where: { reviewerId: memberId }
      })

      // 刪除決議記錄（如果該用戶曾經做過決議）
      await tx.decision.deleteMany({
        where: { decidedBy: memberId }
      })

      // 刪除審計記錄
      await tx.auditLog.deleteMany({
        where: { actorId: memberId }
      })

      // 刪除密碼重設令牌
      await tx.passwordResetToken.deleteMany({
        where: { userId: memberId }
      })

      // 刪除郵件驗證令牌
      await tx.emailVerificationToken.deleteMany({
        where: { userId: memberId }
      })

      // 刪除用戶角色關聯
      await tx.userRole.deleteMany({
        where: { userId: memberId }
      })

      // 最後刪除用戶
      await tx.user.delete({
        where: { id: memberId }
      })
    })

    return NextResponse.json({ 
      success: true,
      message: '成員已成功刪除'
    })

  } catch (error) {
    console.error('刪除成員失敗:', error)
    return NextResponse.json(
      { error: '刪除成員失敗' },
      { status: 500 }
    )
  }
}