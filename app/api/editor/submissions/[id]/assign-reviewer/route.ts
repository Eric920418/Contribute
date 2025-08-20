import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/auth/session'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 檢查是否為編輯或主編
    if (!session.roles?.includes('EDITOR') && !session.roles?.includes('CHIEF_EDITOR')) {
      return NextResponse.json({ error: '權限不足，需要編輯權限' }, { status: 403 })
    }

    const body = await request.json()
    const { reviewerIds, dueDate } = body

    if (!reviewerIds || reviewerIds.length === 0) {
      return NextResponse.json({ error: '請選擇審稿人' }, { status: 400 })
    }

    const submissionId = params.id

    // 檢查投稿是否存在
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId }
    })

    if (!submission) {
      return NextResponse.json({ error: '找不到指定的投稿' }, { status: 404 })
    }

    // 檢查審稿人是否存在且有審稿權限
    const reviewers = await prisma.user.findMany({
      where: {
        id: { in: reviewerIds },
        roles: {
          some: {
            role: {
              key: 'REVIEWER'
            }
          }
        }
      }
    })

    if (reviewers.length !== reviewerIds.length) {
      return NextResponse.json({ error: '部分審稿人不存在或沒有審稿權限' }, { status: 400 })
    }

    // 建立審稿指派
    const assignments = await Promise.all(
      reviewerIds.map(async (reviewerId: string) => {
        return prisma.reviewAssignment.upsert({
          where: {
            submissionId_reviewerId: {
              submissionId,
              reviewerId
            }
          },
          update: {
            dueAt: dueDate ? new Date(dueDate) : undefined,
            status: 'PENDING'
          },
          create: {
            submissionId,
            reviewerId,
            dueAt: dueDate ? new Date(dueDate) : undefined,
            status: 'PENDING'
          },
          include: {
            reviewer: {
              select: { displayName: true, email: true }
            }
          }
        })
      })
    )

    // 更新投稿狀態為審稿中
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'UNDER_REVIEW' }
    })

    return NextResponse.json({
      message: '審稿人分配成功',
      assignments
    })
  } catch (error) {
    console.error('分配審稿人失敗:', error)
    return NextResponse.json({ 
      error: '伺服器錯誤: ' + (error instanceof Error ? error.message : '未知錯誤')
    }, { status: 500 })
  }
}