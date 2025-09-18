import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/auth/session'
import { z } from 'zod'

const prisma = new PrismaClient()

// 驗證內容類型
const validContentTypes = ['journal', 'guidelines', 'proceedings', 'submit']

// 請求驗證 schema
const ContentSchema = z.object({
  title: z.string().min(1, '標題不能為空'),
  content: z.string().min(1, '內容不能為空'),
})

// GET: 獲取特定類型的頁面內容
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentType: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '需要登入' }, { status: 401 })
    }

    // 檢查用戶權限（只有編輯和主編可以存取）
    const userRoles = await prisma.userRole.findMany({
      where: { userId: session.userId },
      include: { role: true }
    })

    const hasPermission = userRoles.some(ur => 
      ['EDITOR', 'CHIEF_EDITOR'].includes(ur.role.key)
    )

    if (!hasPermission) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const { contentType } = await params

    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json({ error: '無效的內容類型' }, { status: 400 })
    }

    // 獲取當前活躍的會議
    const activeConference = await prisma.conference.findFirst({
      where: { isActive: true },
      orderBy: { year: 'desc' }
    })

    if (!activeConference) {
      return NextResponse.json({ error: '找不到活躍的會議' }, { status: 404 })
    }

    // 查找頁面內容
    const pageContent = await prisma.pageContent.findUnique({
      where: {
        conferenceId_contentType: {
          conferenceId: activeConference.id,
          contentType: contentType
        }
      }
    })

    if (!pageContent) {
      return NextResponse.json(
        { error: '內容不存在' }, 
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: pageContent.id,
      title: pageContent.title,
      content: pageContent.content,
      contentType: pageContent.contentType,
      updatedAt: pageContent.updatedAt
    })

  } catch (error) {
    console.error('獲取頁面內容錯誤:', error)
    return NextResponse.json(
      { error: '內部伺服器錯誤' },
      { status: 500 }
    )
  }
}

// POST: 創建或更新頁面內容
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contentType: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '需要登入' }, { status: 401 })
    }

    // 檢查用戶權限
    const userRoles = await prisma.userRole.findMany({
      where: { userId: session.userId },
      include: { role: true }
    })

    const hasPermission = userRoles.some(ur => 
      ['EDITOR', 'CHIEF_EDITOR'].includes(ur.role.key)
    )

    if (!hasPermission) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const { contentType } = await params

    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json({ error: '無效的內容類型' }, { status: 400 })
    }

    // 驗證請求內容
    const body = await request.json()
    const validatedData = ContentSchema.parse(body)

    // 獲取當前活躍的會議
    const activeConference = await prisma.conference.findFirst({
      where: { isActive: true },
      orderBy: { year: 'desc' }
    })

    if (!activeConference) {
      return NextResponse.json({ error: '找不到活躍的會議' }, { status: 404 })
    }

    // 使用 upsert 創建或更新內容
    const pageContent = await prisma.pageContent.upsert({
      where: {
        conferenceId_contentType: {
          conferenceId: activeConference.id,
          contentType: contentType
        }
      },
      update: {
        title: validatedData.title,
        content: validatedData.content,
        updatedBy: session.userId
      },
      create: {
        conferenceId: activeConference.id,
        contentType: contentType,
        title: validatedData.title,
        content: validatedData.content,
        createdBy: session.userId,
        updatedBy: session.userId
      }
    })

    return NextResponse.json({
      id: pageContent.id,
      title: pageContent.title,
      content: pageContent.content,
      contentType: pageContent.contentType,
      updatedAt: pageContent.updatedAt
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '資料驗證失敗', details: error.errors },
        { status: 400 }
      )
    }

    console.error('儲存頁面內容錯誤:', error)
    return NextResponse.json(
      { error: '內部伺服器錯誤' },
      { status: 500 }
    )
  }
}

// DELETE: 刪除頁面內容
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contentType: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '需要登入' }, { status: 401 })
    }

    // 只有主編可以刪除內容
    const userRoles = await prisma.userRole.findMany({
      where: { userId: session.userId },
      include: { role: true }
    })

    const isChiefEditor = userRoles.some(ur => ur.role.key === 'CHIEF_EDITOR')

    if (!isChiefEditor) {
      return NextResponse.json({ error: '只有主編可以刪除內容' }, { status: 403 })
    }

    const { contentType } = await params

    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json({ error: '無效的內容類型' }, { status: 400 })
    }

    // 獲取當前活躍的會議
    const activeConference = await prisma.conference.findFirst({
      where: { isActive: true },
      orderBy: { year: 'desc' }
    })

    if (!activeConference) {
      return NextResponse.json({ error: '找不到活躍的會議' }, { status: 404 })
    }

    // 刪除頁面內容
    await prisma.pageContent.delete({
      where: {
        conferenceId_contentType: {
          conferenceId: activeConference.id,
          contentType: contentType
        }
      }
    })

    return NextResponse.json({ message: '內容已刪除' })

  } catch (error) {
    console.error('刪除頁面內容錯誤:', error)
    return NextResponse.json(
      { error: '內部伺服器錯誤' },
      { status: 500 }
    )
  }
}