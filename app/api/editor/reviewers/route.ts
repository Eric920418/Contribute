import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/auth/session'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 檢查是否為編輯或主編
    if (!session.roles?.includes('EDITOR') && !session.roles?.includes('CHIEF_EDITOR')) {
      return NextResponse.json({ error: '權限不足，需要編輯權限' }, { status: 403 })
    }

    // 取得所有審稿人
    const reviewers = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              key: 'REVIEWER'
            }
          }
        },
        emailVerifiedAt: {
          not: null
        }
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        orcid: true,
        reviewAssignments: {
          where: {
            status: {
              in: ['PENDING', 'ACCEPTED']
            }
          },
          select: {
            id: true,
            status: true,
            dueAt: true
          }
        },
        _count: {
          select: {
            reviewAssignments: {
              where: {
                review: {
                  submittedAt: {
                    not: null
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        displayName: 'asc'
      }
    })

    // 計算審稿人工作負荷
    const reviewersWithWorkload = reviewers.map(reviewer => ({
      id: reviewer.id,
      displayName: reviewer.displayName,
      email: reviewer.email,
      orcid: reviewer.orcid,
      currentAssignments: reviewer.reviewAssignments.length,
      completedReviews: reviewer._count.reviewAssignments,
      isAvailable: reviewer.reviewAssignments.length < 3, // 假設最多同時處理3個審稿
      expertise: [], // 可以之後加入專業領域資料
      averageResponseTime: null // 可以之後計算平均回應時間
    }))

    return NextResponse.json({
      reviewers: reviewersWithWorkload
    })
  } catch (error) {
    console.error('取得審稿人列表失敗:', error)
    return NextResponse.json({ 
      error: '伺服器錯誤: ' + (error instanceof Error ? error.message : '未知錯誤')
    }, { status: 500 })
  }
}