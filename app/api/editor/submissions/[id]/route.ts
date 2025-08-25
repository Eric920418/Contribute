import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/auth/session'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      console.log('編輯稿件詳情 API: 無 session')
      return NextResponse.json({ error: '未授權：請重新登入' }, { status: 401 })
    }

    console.log('編輯稿件詳情 API: session roles:', session.roles)

    // 檢查是否為編輯或主編
    if (!session.roles?.includes('EDITOR') && !session.roles?.includes('CHIEF_EDITOR')) {
      return NextResponse.json({ error: '權限不足，需要編輯權限' }, { status: 403 })
    }

    const { id: submissionId } = await params

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        conference: {
          select: {
            id: true,
            year: true,
            title: true,
            tracks: true
          }
        },
        creator: {
          select: {
            id: true,
            displayName: true,
            email: true
          }
        },
        authors: {
          orderBy: { isCorresponding: 'desc' }
        },
        files: {
          where: { 
            kind: { 
              in: ['MANUSCRIPT_ANONYMOUS', 'TITLE_PAGE'] 
            } 
          },
          orderBy: { version: 'desc' }
        },
        reviewAssignments: {
          include: {
            reviewer: {
              select: {
                id: true,
                displayName: true,
                email: true
              }
            },
            review: {
              select: {
                id: true,
                score: true,
                recommendation: true,
                commentToEditor: true,
                commentToAuthor: true,
                submittedAt: true
              }
            }
          }
        },
        decisions: {
          include: {
            decider: {
              select: {
                displayName: true
              }
            }
          },
          orderBy: { decidedAt: 'desc' }
        }
      }
    })

    if (!submission) {
      return NextResponse.json({ error: '找不到指定的投稿' }, { status: 404 })
    }

    return NextResponse.json({
      submission
    })
  } catch (error) {
    console.error('取得投稿詳情失敗:', error)
    return NextResponse.json({ 
      error: '伺服器錯誤: ' + (error instanceof Error ? error.message : '未知錯誤')
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未授權：請重新登入' }, { status: 401 })
    }

    // 檢查是否為主編（只有主編可以刪除稿件）
    if (!session.roles?.includes('CHIEF_EDITOR')) {
      return NextResponse.json({ error: '權限不足，只有主編可以刪除稿件' }, { status: 403 })
    }

    const { id: submissionId } = await params

    // 檢查稿件是否存在
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        files: true,
        authors: true,
        reviewAssignments: {
          include: {
            review: true
          }
        },
        decisions: true
      }
    })

    if (!submission) {
      return NextResponse.json({ error: '找不到指定的稿件' }, { status: 404 })
    }

    // 在事務中刪除相關資料
    await prisma.$transaction(async (tx) => {
      // 刪除審稿評論
      await tx.review.deleteMany({
        where: {
          assignmentId: {
            in: submission.reviewAssignments.map(ra => ra.id)
          }
        }
      })

      // 刪除審稿分配
      await tx.reviewAssignment.deleteMany({
        where: { submissionId }
      })

      // 刪除決策記錄
      await tx.decision.deleteMany({
        where: { submissionId }
      })

      // 刪除作者資料
      await tx.submissionAuthor.deleteMany({
        where: { submissionId }
      })

      // 刪除檔案記錄
      await tx.fileAsset.deleteMany({
        where: { submissionId }
      })

      // 最後刪除稿件本身
      await tx.submission.delete({
        where: { id: submissionId }
      })
    })

    return NextResponse.json({ 
      message: '稿件已成功刪除',
      deletedSubmissionId: submissionId 
    })
  } catch (error) {
    console.error('刪除稿件失敗:', error)
    return NextResponse.json({ 
      error: '刪除稿件失敗: ' + (error instanceof Error ? error.message : '未知錯誤')
    }, { status: 500 })
  }
}