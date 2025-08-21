import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 只有編輯和主編可以修改狀態
    if (!session.roles.includes('EDITOR') && !session.roles.includes('CHIEF_EDITOR')) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const memberId = params.id
    const { action } = await request.json()

    if (!['enable', 'disable'].includes(action)) {
      return NextResponse.json({ error: '無效的操作' }, { status: 400 })
    }

    // 檢查用戶是否存在
    const user = await prisma.user.findUnique({
      where: { id: memberId }
    })

    if (!user) {
      return NextResponse.json({ error: '找不到用戶' }, { status: 404 })
    }

    // 防止操作自己
    if (user.id === session.userId) {
      return NextResponse.json({ error: '無法更改自己的狀態' }, { status: 400 })
    }

    let newStatus: 'ENABLED' | 'PENDING_ACTIVATION'
    
    if (action === 'enable') {
      // 啟用：設定為 ENABLED，同時清除強制改密碼標記
      newStatus = 'ENABLED'
      await prisma.user.update({
        where: { id: memberId },
        data: {
          status: newStatus,
          mustChangePassword: false
        }
      })
    } else {
      // 停用：設定為 PENDING_ACTIVATION
      newStatus = 'PENDING_ACTIVATION'
      await prisma.user.update({
        where: { id: memberId },
        data: {
          status: newStatus
        }
      })
    }

    return NextResponse.json({ 
      success: true,
      message: action === 'enable' ? '成員已啟用' : '成員已停用',
      status: newStatus === 'ENABLED' ? 'enabled' 
             : newStatus === 'PENDING_ACTIVATION' ? 'pending_activation'
             : 'not_sent'
    })

  } catch (error) {
    console.error('更新成員狀態失敗:', error)
    return NextResponse.json(
      { error: '更新成員狀態失敗' },
      { status: 500 }
    )
  }
}