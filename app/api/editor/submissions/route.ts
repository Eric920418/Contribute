import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, SubmissionStatus } from '@prisma/client'
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const conferenceYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : 2025
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '10'))) // 限制每頁最多50筆

    // 取得會議資料
    const conference = await prisma.conference.findFirst({
      where: { year: conferenceYear }
    })

    if (!conference) {
      return NextResponse.json({ error: '找不到指定年度的會議' }, { status: 404 })
    }

    // 構建查詢條件 - 編輯可查看所有投稿
    const whereCondition: any = {
      conferenceId: conference.id,
      // 只顯示已提交的稿件，排除草稿
      status: {
        not: 'DRAFT'
      }
    }

    if (status && status !== 'all') {
      whereCondition.status = status as SubmissionStatus
    }

    // 計算總數
    const total = await prisma.submission.count({ where: whereCondition })
    const totalPages = Math.ceil(total / limit)
    const skip = (page - 1) * limit

    const submissions = await prisma.submission.findMany({
      where: whereCondition,
      include: {
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
        decisions: {
          orderBy: { decidedAt: 'desc' },
          take: 1,
          include: {
            decider: {
              select: { displayName: true }
            }
          }
        },
        reviewAssignments: {
          include: {
            reviewer: {
              select: { displayName: true }
            },
            review: {
              select: {
                score: true,
                recommendation: true,
                submittedAt: true
              }
            }
          }
        },
        creator: {
          select: { displayName: true, email: true }
        }
      },
      orderBy: { submittedAt: 'desc' },
      skip,
      take: limit
    })

    // 統計資料
    const stats = await prisma.submission.groupBy({
      by: ['status'],
      where: {
        conferenceId: conference.id,
        status: { not: 'DRAFT' }
      },
      _count: true
    })

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count
      return acc
    }, {} as Record<string, number>)


    // 轉換資料格式以符合前端期望
    const formattedSubmissions = submissions.map(submission => ({
      id: submission.id,
      title: submission.title,
      authors: submission.authors.map(author => author.name),
      status: mapStatusToFrontend(submission.status),
      submittedDate: submission.submittedAt ? new Date(submission.submittedAt).toISOString().split('T')[0] : '',
      assignedReviewer: submission.reviewAssignments.length > 0 
        ? submission.reviewAssignments.map(ra => ra.reviewer.displayName)
        : undefined,
      priority: calculatePriority(submission),
      paperType: submission.paperType || '一般研究',
      keywords: submission.keywords ? submission.keywords.split(',').map(k => k.trim()) : [],
      dueDate: submission.reviewAssignments[0]?.dueAt 
        ? new Date(submission.reviewAssignments[0].dueAt).toISOString().split('T')[0]
        : undefined,
      serialNumber: submission.serialNumber,
      creator: submission.creator,
      // 新增審稿相關欄位
      reviewStatus: getReviewStatus(submission.reviewAssignments),
      assignDate: submission.reviewAssignments[0]?.createdAt 
        ? new Date(submission.reviewAssignments[0].createdAt).toISOString().split('T')[0]
        : null,
      recommendation: getRecommendation(submission.reviewAssignments),
      finalDecision: submission.decisions[0]?.result || null
    }))

    const finalStats = {
      total: total, // 使用實際總數而非當前頁數量
      submitted: statsMap.SUBMITTED || 0,
      underReview: statsMap.UNDER_REVIEW || 0,
      revisionRequired: statsMap.REVISION_REQUIRED || 0,
      accepted: statsMap.ACCEPTED || 0,
      rejected: statsMap.REJECTED || 0
    }


    return NextResponse.json({
      submissions: formattedSubmissions,
      stats: finalStats,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      conference
    })
  } catch (error) {
    console.error('取得編輯投稿列表失敗:', error)
    return NextResponse.json({ 
      error: '伺服器錯誤: ' + (error instanceof Error ? error.message : '未知錯誤')
    }, { status: 500 })
  }
}

// 狀態映射函數
function mapStatusToFrontend(status: SubmissionStatus): string {
  const statusMap: Record<SubmissionStatus, string> = {
    'DRAFT': 'draft',
    'SUBMITTED': 'submitted',
    'UNDER_REVIEW': 'under_review',
    'REVISION_REQUIRED': 'revision_required',
    'ACCEPTED': 'accepted',
    'REJECTED': 'rejected',
    'WITHDRAWN': 'withdrawn'
  }
  return statusMap[status] || 'submitted'
}

// 優先級計算函數
function calculatePriority(submission: any): 'high' | 'medium' | 'low' {
  // 根據投稿時間和狀態計算優先級
  const submittedDaysAgo = submission.submittedAt 
    ? Math.floor((Date.now() - new Date(submission.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  if (submission.status === 'SUBMITTED' && submittedDaysAgo > 7) {
    return 'high'
  }
  if (submission.status === 'UNDER_REVIEW' && submittedDaysAgo > 30) {
    return 'high'
  }
  if (submission.status === 'REVISION_REQUIRED') {
    return 'high'
  }
  if (submittedDaysAgo > 14) {
    return 'medium'
  }
  return 'low'
}

// 審稿狀態計算函數
function getReviewStatus(reviewAssignments: any[]): string {
  if (!reviewAssignments || reviewAssignments.length === 0) {
    return '待分配'
  }
  
  const completedReviews = reviewAssignments.filter(ra => ra.review?.submittedAt)
  const totalReviews = reviewAssignments.length
  
  if (completedReviews.length === totalReviews) {
    return '已完成'
  } else if (completedReviews.length > 0) {
    return `進行中 (${completedReviews.length}/${totalReviews})`
  } else {
    return '進行中'
  }
}

// 審稿建議計算函數
function getRecommendation(reviewAssignments: any[]): string | null {
  if (!reviewAssignments || reviewAssignments.length === 0) {
    return null
  }
  
  const completedReviews = reviewAssignments.filter(ra => ra.review?.submittedAt)
  
  if (completedReviews.length === 0) {
    return null
  }
  
  // 如果有多個審稿，顯示主要建議
  const recommendations = completedReviews.map(ra => ra.review.recommendation)
  const acceptCount = recommendations.filter(r => r === 'ACCEPT').length
  const rejectCount = recommendations.filter(r => r === 'REJECT').length
  const minorRevisionCount = recommendations.filter(r => r === 'MINOR_REVISION').length
  const majorRevisionCount = recommendations.filter(r => r === 'MAJOR_REVISION').length
  
  if (acceptCount > rejectCount) {
    return '建議接受'
  } else if (rejectCount > acceptCount) {
    return '建議拒絕'
  } else if (minorRevisionCount > 0 || majorRevisionCount > 0) {
    return '建議修改'
  }
  
  return '審稿中'
}