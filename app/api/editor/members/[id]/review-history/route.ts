import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'

// GET /api/editor/members/[id]/review-history - 獲取某個成員的審稿紀錄
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 檢查權限：只有編輯和主編可以查看審稿紀錄
    const userRoles = await prisma.userRole.findMany({
      where: { userId: session.userId },
      include: { role: true }
    })

    const hasEditorPermission = userRoles.some(ur => 
      ur.role.key === 'EDITOR' || ur.role.key === 'CHIEF_EDITOR'
    )

    if (!hasEditorPermission) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const memberId = params.id

    // 查詢該成員的所有審稿指派和相關評論
    const reviewAssignments = await prisma.reviewAssignment.findMany({
      where: {
        reviewerId: memberId,
      },
      include: {
        submission: {
          include: {
            authors: true,
            conference: true,
          }
        },
        review: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 格式化回傳數據
    const reviewHistory = reviewAssignments.map(assignment => ({
      id: assignment.id,
      submissionTitle: assignment.submission.title,
      authors: assignment.submission.authors.map(author => author.name),
      conferenceYear: assignment.submission.conference.year,
      track: assignment.submission.track,
      submittedDate: assignment.submission.submittedAt?.toISOString().split('T')[0] || '',
      reviewedDate: assignment.review?.submittedAt?.toISOString().split('T')[0] || null,
      assignedDate: assignment.createdAt.toISOString().split('T')[0],
      dueDate: assignment.dueAt?.toISOString().split('T')[0] || null,
      status: assignment.status,
      // 審稿評論資訊
      review: assignment.review ? {
        score: assignment.review.score,
        recommendation: assignment.review.recommendation,
        commentToEditor: assignment.review.commentToEditor,
        commentToAuthor: assignment.review.commentToAuthor,
        submittedAt: assignment.review.submittedAt?.toISOString().split('T')[0] || null,
      } : null,
      // 投稿最終狀態
      submissionStatus: assignment.submission.status,
    }))

    return NextResponse.json({
      success: true,
      data: reviewHistory
    })

  } catch (error) {
    console.error('獲取審稿紀錄失敗:', error)
    return NextResponse.json(
      { error: '獲取審稿紀錄失敗' },
      { status: 500 }
    )
  }
}