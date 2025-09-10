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
    const conferenceId = searchParams.get('conferenceId')
    const conferenceYear = searchParams.get('year') ? parseInt(searchParams.get('year')!) : 2025

    let conference
    
    if (conferenceId) {
      // 如果提供了會議ID，直接查詢該會議
      conference = await prisma.conference.findUnique({
        where: { id: conferenceId }
      })
    } else {
      // 如果沒有會議ID，使用年份查詢（為了向後兼容）
      conference = await prisma.conference.findFirst({
        where: { year: conferenceYear }
      })
    }

    if (!conference) {
      return NextResponse.json({ error: '找不到指定的會議' }, { status: 404 })
    }

    let allSubmissions = []
    let draftCount = 0
    let submissionStats = {}

    // 如果不指定狀態或指定為 'draft'，查詢草稿表
    if (!status || status === 'draft') {
      const drafts = await prisma.draft.findMany({
        where: {
          createdBy: session.userId,
          conferenceId: conference.id
        },
        include: {
          authors: true,
          files: {
            where: { 
              kind: { 
                in: ['MANUSCRIPT_ANONYMOUS', 'TITLE_PAGE'] 
              } 
            },
            orderBy: { version: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      // 轉換草稿格式以符合前端期望
      const convertedDrafts = drafts.map(draft => ({
        ...draft,
        status: 'DRAFT', // 標記為草稿狀態
        decisions: [],
        reviewAssignments: [],
        submittedAt: null
      }))

      allSubmissions.push(...convertedDrafts)
      draftCount = drafts.length
    }

    // 如果不指定狀態或指定為非 'draft'，查詢正式投稿表
    if (!status || status !== 'draft') {
      const whereCondition: any = {
        createdBy: session.userId,
        conferenceId: conference.id
      }

      if (status && status !== 'all') {
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

      allSubmissions.push(...submissions)

      // 統計正式投稿資料
      const stats = await prisma.submission.groupBy({
        by: ['status'],
        where: {
          createdBy: session.userId,
          conferenceId: conference.id
        },
        _count: true
      })

      submissionStats = stats.reduce((acc: Record<string, number>, stat) => {
        acc[stat.status] = stat._count
        return acc
      }, {} as Record<string, number>)
    }

    // 去重：根據 title, abstract, conferenceId 來判斷是否為同一個稿件
    const uniqueSubmissions: any[] = []
    const seenKeys = new Set<string>()
    
    for (const submission of allSubmissions) {
      // 創建唯一標識符：title + abstract + conferenceId 的組合
      const uniqueKey = `${submission.title?.trim()}_${submission.abstract?.trim()}_${submission.conferenceId || ''}`
      
      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey)
        uniqueSubmissions.push(submission)
      } else {
        // 如果發現重複，優先保留正式提交的稿件（非草稿）
        const existingIndex = uniqueSubmissions.findIndex(s => {
          const existingKey = `${s.title?.trim()}_${s.abstract?.trim()}_${s.conferenceId || ''}`
          return existingKey === uniqueKey
        })
        
        if (existingIndex !== -1) {
          const existing = uniqueSubmissions[existingIndex]
          // 如果當前是正式稿件，現有的是草稿，則替換
          if (submission.status !== 'DRAFT' && existing.status === 'DRAFT') {
            uniqueSubmissions[existingIndex] = submission
          }
          // 如果兩者都是正式稿件或都是草稿，保留較新的
          else if (new Date(submission.createdAt) > new Date(existing.createdAt)) {
            uniqueSubmissions[existingIndex] = submission
          }
        }
      }
    }

    // 按時間排序去重後的投稿
    uniqueSubmissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // 重新計算去重後的統計數據
    const finalStats = {
      draft: 0,
      submitted: 0,
      underReview: 0,
      revisionRequired: 0,
      accepted: 0,
      rejected: 0,
      withdrawn: 0
    }

    // 根據去重後的實際稿件重新統計
    uniqueSubmissions.forEach(submission => {
      switch (submission.status) {
        case 'DRAFT':
          finalStats.draft++
          break
        case 'SUBMITTED':
          finalStats.submitted++
          break
        case 'UNDER_REVIEW':
          finalStats.underReview++
          break
        case 'REVISION_REQUIRED':
          finalStats.revisionRequired++
          break
        case 'ACCEPTED':
          finalStats.accepted++
          break
        case 'REJECTED':
          finalStats.rejected++
          break
        case 'WITHDRAWN':
          finalStats.withdrawn++
          break
      }
    })

    return NextResponse.json({
      submissions: uniqueSubmissions,
      stats: finalStats,
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
      conferenceId,
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

    let conference
    
    if (conferenceId) {
      // 如果提供了會議ID，直接查詢該會議
      conference = await prisma.conference.findUnique({
        where: { id: conferenceId }
      })
    } else {
      // 如果沒有會議ID，使用年份查詢（為了向後兼容）
      conference = await prisma.conference.findFirst({
        where: { year: conferenceYear }
      })
    }

    if (!conference) {
      return NextResponse.json({ error: '找不到指定的會議' }, { status: 404 })
    }

    let result

    if (status === 'DRAFT') {
      // 保存草稿到 Draft 表格
      result = await prisma.draft.create({
        data: {
          title: title || '未命名草稿',
          abstract: abstract || '',
          track: track || '',
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

      // 為了保持前端兼容性，添加 status 字段
      result = {
        ...result,
        status: 'DRAFT'
      }
    } else {
      // 正式提交到 Submission 表格
      result = await prisma.submission.create({
        data: {
          title,
          abstract,
          track,
          status: status as SubmissionStatus,
          conferenceId: conference.id,
          createdBy: session.userId,
          submittedAt: new Date(), // 設置提交時間
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
    }

    return NextResponse.json({
      message: status === 'DRAFT' ? '草稿保存成功' : '投稿提交成功',
      submission: result
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