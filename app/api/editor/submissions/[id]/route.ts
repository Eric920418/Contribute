import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/auth/session'

const prisma = new PrismaClient()

export async function GET(
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

    const submissionId = params.id

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