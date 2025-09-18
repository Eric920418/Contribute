import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth/middleware'

const updateConferenceSchema = z.object({
  isActive: z.boolean().optional(),
  title: z.string().min(1).optional(),
  tracks: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional()
})

// PATCH /api/conferences/[id] - 部分更新會議（如狀態切換）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (request, session) => {
    // 只有主編可以更新會議
    if (!session.roles?.includes('CHIEF_EDITOR')) {
      return NextResponse.json(
        { error: '權限不足，只有主編可以修改會議設定' },
        { status: 403 }
      )
    }

    try {
      const { id } = await params
      const body = await request.json()

      // 驗證更新資料
      const validatedData = updateConferenceSchema.parse(body)

      // 檢查會議是否存在
      const existingConference = await prisma.conference.findUnique({
        where: { id }
      })

      if (!existingConference) {
        return NextResponse.json(
          { error: '找不到指定的會議' },
          { status: 404 }
        )
      }

      // 更新會議
      const updatedConference = await prisma.conference.update({
        where: { id },
        data: validatedData
      })

      return NextResponse.json(updatedConference)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: '資料格式錯誤', details: error.errors },
          { status: 400 }
        )
      }

      console.error('Error updating conference:', error)
      return NextResponse.json(
        { error: '更新會議失敗' },
        { status: 500 }
      )
    }
  })
}

// GET /api/conferences/[id] - 取得特定會議
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const conference = await prisma.conference.findUnique({
      where: { id },
      include: {
        submissions: {
          select: { id: true, title: true, status: true }
        },
        drafts: {
          select: { id: true, title: true }
        },
        pageContents: {
          select: { id: true, contentType: true }
        }
      }
    })

    if (!conference) {
      return NextResponse.json(
        { error: '找不到指定的會議' },
        { status: 404 }
      )
    }

    return NextResponse.json(conference)
  } catch (error) {
    console.error('Error fetching conference:', error)
    return NextResponse.json(
      { error: '取得會議資料失敗' },
      { status: 500 }
    )
  }
}

// DELETE /api/conferences/[id] - 刪除會議（含所有相關資料）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (request, session) => {
    // 只有主編可以刪除會議
    if (!session.roles?.includes('CHIEF_EDITOR')) {
      return NextResponse.json(
        { error: '權限不足，只有主編可以刪除會議' },
        { status: 403 }
      )
    }

    try {
      const { id } = await params

      // 檢查會議是否存在並獲取詳細資訊
      const existingConference = await prisma.conference.findUnique({
        where: { id },
        include: {
          submissions: {
            select: { id: true, title: true }
          },
          drafts: {
            select: { id: true, title: true }
          },
          pageContents: {
            select: { id: true, contentType: true }
          }
        }
      })

      if (!existingConference) {
        return NextResponse.json(
          { error: '找不到指定的會議' },
          { status: 404 }
        )
      }

      // 計算相關資料數量，用於確認提示
      const stats = {
        submissions: existingConference.submissions.length,
        drafts: existingConference.drafts.length,
        pageContents: existingConference.pageContents.length
      }

      console.log(`準備刪除會議 ${existingConference.title} (${existingConference.year})`)
      console.log(`將同時刪除: ${stats.submissions}個投稿、${stats.drafts}個草稿、${stats.pageContents}個頁面內容`)

      // 刪除會議（CASCADE會自動刪除所有相關資料）
      await prisma.conference.delete({
        where: { id }
      })

      console.log(`會議 ${existingConference.title} 及所有相關資料已成功刪除`)

      return NextResponse.json({
        message: '會議及所有相關資料已成功刪除',
        deletedConference: {
          id: existingConference.id,
          title: existingConference.title,
          year: existingConference.year
        },
        deletedStats: stats
      })
    } catch (error) {
      console.error('Error deleting conference:', error)
      return NextResponse.json(
        { error: '刪除會議失敗' },
        { status: 500 }
      )
    }
  })
}