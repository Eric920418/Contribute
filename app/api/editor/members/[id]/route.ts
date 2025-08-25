import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 只有主編可以編輯人員
    if (!session.roles.includes('CHIEF_EDITOR')) {
      return NextResponse.json({ error: '權限不足，只有主編可以編輯人員' }, { status: 403 })
    }

    const memberId = params.id
    const { name, email, affiliation, position, orcidId, expertise, role } = await request.json()

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

    // 檢查要編輯的用戶是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id: memberId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!existingUser) {
      return NextResponse.json({ error: '找不到要編輯的成員' }, { status: 404 })
    }

    // 如果要修改信箱，檢查新信箱是否已被其他用戶使用
    if (email.trim().toLowerCase() !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: { 
          email: email.trim().toLowerCase(),
          NOT: {
            id: memberId
          }
        }
      })

      if (emailExists) {
        return NextResponse.json({ error: '此信箱已被其他用戶使用' }, { status: 400 })
      }
    }

    // 找到對應的新角色ID
    const roleRecord = await prisma.role.findUnique({
      where: { key: role }
    })

    if (!roleRecord) {
      return NextResponse.json({ error: '角色不存在' }, { status: 400 })
    }

    // 檢查如果要將主編改為其他角色，確保系統還有其他主編
    const currentUserRoles = existingUser.roles.map(ur => ur.role.key)
    const wasChiefEditor = currentUserRoles.includes('CHIEF_EDITOR')
    const willBeChiefEditor = role === 'CHIEF_EDITOR'

    if (wasChiefEditor && !willBeChiefEditor) {
      // 原本是主編，現在要改為其他角色，檢查是否還有其他主編
      const otherChiefEditorsCount = await prisma.user.count({
        where: {
          NOT: {
            id: memberId
          },
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

      if (otherChiefEditorsCount === 0) {
        return NextResponse.json({ 
          error: '無法修改最後一位主編的角色，系統必須至少保留一位主編' 
        }, { status: 400 })
      }
    }

    // 執行更新操作
    await prisma.$transaction(async (tx) => {
      // 更新用戶基本資料
      await tx.user.update({
        where: { id: memberId },
        data: {
          email: email.trim().toLowerCase(),
          displayName: name.trim(),
          affiliation: affiliation.trim(),
          position: position?.trim() || null,
          orcid: orcidId?.trim() || null,
          expertise: expertise
        }
      })

      // 如果角色有變化，更新角色關聯
      if (!currentUserRoles.includes(role) || currentUserRoles.length > 1) {
        // 先刪除所有現有角色
        await tx.userRole.deleteMany({
          where: { userId: memberId }
        })

        // 添加新角色
        await tx.userRole.create({
          data: {
            userId: memberId,
            roleId: roleRecord.id
          }
        })
      }
    })

    return NextResponse.json({ 
      success: true,
      message: '成員資料更新成功'
    })

  } catch (error) {
    console.error('更新成員失敗:', error)
    return NextResponse.json(
      { error: '更新成員失敗' },
      { status: 500 }
    )
  }
}