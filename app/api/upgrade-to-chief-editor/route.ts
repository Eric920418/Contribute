import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未登入' }, { status: 401 })
    }

    console.log('當前用戶:', session.email, '角色:', session.roles)

    // 確保 CHIEF_EDITOR 角色存在
    let chiefEditorRole = await prisma.role.findUnique({
      where: { key: 'CHIEF_EDITOR' }
    })

    if (!chiefEditorRole) {
      console.log('創建 CHIEF_EDITOR 角色...')
      chiefEditorRole = await prisma.role.create({
        data: { key: 'CHIEF_EDITOR' }
      })
    }

    // 檢查用戶是否已有 CHIEF_EDITOR 角色
    const existingUserRole = await prisma.userRole.findFirst({
      where: {
        userId: session.userId,
        roleId: chiefEditorRole.id
      }
    })

    if (existingUserRole) {
      return NextResponse.json({ 
        message: '用戶已經是主編',
        currentRoles: session.roles 
      })
    }

    // 為用戶添加 CHIEF_EDITOR 角色
    await prisma.userRole.create({
      data: {
        userId: session.userId,
        roleId: chiefEditorRole.id
      }
    })

    console.log(`已為用戶 ${session.email} 添加 CHIEF_EDITOR 角色`)

    return NextResponse.json({ 
      message: '成功升級為主編！請重新登入以更新權限。',
      newRole: 'CHIEF_EDITOR'
    })

  } catch (error) {
    console.error('升級用戶權限失敗:', error)
    return NextResponse.json({ error: '升級失敗' }, { status: 500 })
  }
}