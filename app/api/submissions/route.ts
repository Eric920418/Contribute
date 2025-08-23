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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const conferenceYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : 2025

    // 取得會議資料
    const conference = await prisma.conference.findFirst({
      where: { year: conferenceYear }
    })

    if (!conference) {
      return NextResponse.json({ error: '找不到指定年度的會議' }, { status: 404 })
    }

    // 構建查詢條件
    const whereCondition: any = {
      createdBy: session.userId,
      conferenceId: conference.id
    }

    if (status) {
      whereCondition.status = status as SubmissionStatus
    }

    const submissions = await prisma.submission.findMany({
      where: whereCondition,
      include: {
        authors: true,
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
            review: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // 統計資料
    const stats = await prisma.submission.groupBy({
      by: ['status'],
      where: {
        createdBy: session.userId,
        conferenceId: conference.id
      },
      _count: true
    })

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      submissions,
      stats: {
        draft: statsMap.DRAFT || 0,
        submitted: statsMap.SUBMITTED || 0,
        underReview: statsMap.UNDER_REVIEW || 0,
        revisionRequired: statsMap.REVISION_REQUIRED || 0,
        accepted: statsMap.ACCEPTED || 0,
        rejected: statsMap.REJECTED || 0,
        withdrawn: statsMap.WITHDRAWN || 0
      },
      conference
    })
  } catch (error) {
    console.error('取得投稿列表失敗:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    console.log('收到創建資料:', JSON.stringify(body, null, 2))
    
    const {
      title,
      abstract,
      track,
      authors,
      conferenceYear = 2025,
      status = 'DRAFT',
      // 新增欄位
      paperType,
      keywords,
      agreements,
      copyrightPermission,
      formatCheck
    } = body

    // 根據狀態決定驗證嚴格程度
    if (status === 'SUBMITTED') {
      // 正式提交需要檢查所有必填欄位
      if (!title || !abstract || !track) {
        return NextResponse.json({ error: '缺少必填欄位' }, { status: 400 })
      }

      if (!authors || authors.length === 0) {
        return NextResponse.json({ error: '至少需要一位作者' }, { status: 400 })
      }

      // 檢查是否有通訊作者
      const hasCorrespondingAuthor = authors.some((author: any) => author.isCorresponding)
      if (!hasCorrespondingAuthor) {
        return NextResponse.json({ error: '必須指定一位通訊作者' }, { status: 400 })
      }
    }
    // 草稿狀態允許部分填寫

    // 取得會議資料
    const conference = await prisma.conference.findFirst({
      where: { year: conferenceYear }
    })

    if (!conference) {
      return NextResponse.json({ error: '找不到指定年度的會議' }, { status: 404 })
    }

    // 建立投稿
    const submission = await prisma.submission.create({
      data: {
        title,
        abstract,
        track,
        status: status as SubmissionStatus,
        conferenceId: conference.id,
        createdBy: session.userId,
        // 新增欄位
        paperType,
        keywords,
        // 作者聲明
        agreementOriginalWork: agreements?.originalWork || false,
        agreementNoConflictOfInterest: agreements?.noConflictOfInterest || false,
        agreementConsentToPublish: agreements?.consentToPublish || false,
        // 著作權確認與格式檢查
        copyrightPermission: copyrightPermission || null,
        formatCheck: formatCheck || null,
        authors: {
          create: (authors || []).map((author: any) => ({
            name: author.name || '',
            email: author.email || '',
            affiliation: author.institution || '',
            isCorresponding: author.isCorresponding || false
          }))
        }
      },
      include: {
        authors: true,
        conference: true
      }
    })

    return NextResponse.json({
      message: status === 'DRAFT' ? '草稿保存成功' : '投稿提交成功',
      submission
    })
  } catch (error: any) {
    console.error('建立投稿失敗:', error)
    const errorMessage = error.message || '伺服器錯誤'
    return NextResponse.json({ 
      error: '建立投稿失敗: ' + errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}