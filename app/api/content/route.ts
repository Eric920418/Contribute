import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET: 獲取所有頁面內容（供前台使用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contentType = searchParams.get('type')

    // 獲取當前活躍的會議
    const activeConference = await prisma.conference.findFirst({
      where: { isActive: true },
      orderBy: { year: 'desc' }
    })

    if (!activeConference) {
      return NextResponse.json({ error: '找不到活躍的會議' }, { status: 404 })
    }

    if (contentType) {
      // 獲取特定類型的內容
      const pageContent = await prisma.pageContent.findUnique({
        where: {
          conferenceId_contentType: {
            conferenceId: activeConference.id,
            contentType: contentType
          }
        }
      })

      if (!pageContent) {
        return NextResponse.json({ error: '內容不存在' }, { status: 404 })
      }

      return NextResponse.json({
        contentType: pageContent.contentType,
        title: pageContent.title,
        content: pageContent.content,
        updatedAt: pageContent.updatedAt
      })
    } else {
      // 獲取所有內容
      const pageContents = await prisma.pageContent.findMany({
        where: {
          conferenceId: activeConference.id
        },
        select: {
          contentType: true,
          title: true,
          content: true,
          updatedAt: true
        },
        orderBy: {
          contentType: 'asc'
        }
      })

      // 轉換為物件格式，方便前台使用
      const contentsMap = pageContents.reduce((acc, content) => {
        acc[content.contentType] = {
          title: content.title,
          content: content.content,
          updatedAt: content.updatedAt
        }
        return acc
      }, {} as Record<string, any>)

      return NextResponse.json(contentsMap)
    }

  } catch (error) {
    console.error('獲取頁面內容錯誤:', error)
    return NextResponse.json(
      { error: '內部伺服器錯誤' },
      { status: 500 }
    )
  }
}