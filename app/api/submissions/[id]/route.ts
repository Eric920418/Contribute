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
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { id } = await params

    const submission = await prisma.submission.findUnique({
      where: { 
        id,
        createdBy: session.userId // 確保使用者只能查看自己的投稿
      },
      include: {
        authors: true,
        files: {
          orderBy: { version: 'desc' }
        },
        conference: true,
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
            review: true
          }
        }
      }
    })

    if (!submission) {
      return NextResponse.json({ error: '找不到投稿' }, { status: 404 })
    }

    return NextResponse.json({ submission })
  } catch (error) {
    console.error('取得投稿詳情失敗:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { id } = await params

    const body = await request.json()
    console.log('收到更新資料:', JSON.stringify(body, null, 2))
    
    const { 
      title, 
      abstract, 
      track, 
      authors, 
      status,
      // 新增欄位
      paperType,
      keywords,
      agreements,
      copyrightPermission,
      formatCheck
    } = body

    // 檢查投稿是否存在且屬於當前使用者
    const existingSubmission = await prisma.submission.findUnique({
      where: { 
        id,
        createdBy: session.userId
      }
    })

    if (!existingSubmission) {
      return NextResponse.json({ error: '找不到投稿或無權限修改' }, { status: 404 })
    }

    // 只有草稿狀態才能修改
    if (existingSubmission.status !== 'DRAFT' && existingSubmission.status !== 'REVISION_REQUIRED') {
      return NextResponse.json({ error: '此投稿狀態不允許修改' }, { status: 400 })
    }

    // 使用事務更新投稿和作者資料
    const updatedSubmission = await prisma.$transaction(async (tx) => {
      // 刪除舊的作者資料
      await tx.submissionAuthor.deleteMany({
        where: { submissionId: id }
      })

      // 更新投稿
      return tx.submission.update({
        where: { id },
        data: {
          title,
          abstract,
          track,
          status: status || existingSubmission.status,
          // 新增欄位
          paperType,
          keywords,
          // 作者聲明
          agreementOriginalWork: agreements?.originalWork,
          agreementNoConflictOfInterest: agreements?.noConflictOfInterest,
          agreementConsentToPublish: agreements?.consentToPublish,
          // 著作權確認與格式檢查
          copyrightPermission: copyrightPermission || null,
          formatCheck: formatCheck || null,
          authors: {
            create: authors?.map((author: any) => ({
              name: author.name || '',
              email: author.email || '',
              affiliation: author.institution || '',
              isCorresponding: author.isCorresponding || false
            })) || []
          }
        },
        include: {
          authors: true,
          conference: true
        }
      })
    })

    return NextResponse.json({
      message: '投稿更新成功',
      submission: updatedSubmission
    })
  } catch (error: any) {
    console.error('更新投稿失敗:', error)
    const errorMessage = error.message || '伺服器錯誤'
    return NextResponse.json({ 
      error: '更新投稿失敗: ' + errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { id } = await params

    // 檢查投稿是否存在且屬於當前使用者
    const submission = await prisma.submission.findUnique({
      where: { 
        id,
        createdBy: session.userId
      }
    })

    if (!submission) {
      return NextResponse.json({ error: '找不到投稿或無權限刪除' }, { status: 404 })
    }

    // 只有草稿狀態才能刪除
    if (submission.status !== 'DRAFT') {
      return NextResponse.json({ error: '只有草稿狀態的投稿才能刪除' }, { status: 400 })
    }

    await prisma.submission.delete({
      where: { id }
    })

    return NextResponse.json({ message: '投稿刪除成功' })
  } catch (error) {
    console.error('刪除投稿失敗:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}