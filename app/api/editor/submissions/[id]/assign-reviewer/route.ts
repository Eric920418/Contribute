import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/auth/session'
import { createEmailService, ReviewerAssignmentEmailData } from '@/lib/email/mailer'

const prisma = new PrismaClient()

// 統一稿件編號格式化函數：日期時間_亂數5碼（與前台後台一致）
const formatSubmissionNumber = (submission: any): string => {
  const date = new Date(submission.submittedAt || submission.createdAt || Date.now())
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  // 從submission id生成5位亂數碼（確保一致性）
  const randomCode = submission.id.slice(-8).toUpperCase().slice(0, 5)

  return `${year}${month}${day}${hours}${minutes}_${randomCode}`
}

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

    // 檢查投稿是否存在並獲取詳細資訊
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        title: true,
        status: true,
        submittedAt: true,
        createdAt: true
      }
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
      },
      select: {
        id: true,
        displayName: true,
        email: true
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

    // 發送郵件通知給審稿人
    try {
      const emailService = createEmailService()
      const dashboardUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reviewer/dashboard`

      // 生成格式化的稿件編號
      const formattedSubmissionNumber = formatSubmissionNumber(submission)

      await Promise.all(
        reviewers.map(async (reviewer) => {
          const emailData: ReviewerAssignmentEmailData = {
            to: reviewer.email,
            reviewerName: reviewer.displayName,
            submissionTitle: submission.title,
            submissionId: formattedSubmissionNumber, // 使用格式化的編號
            dueDate: dueDate ? new Date(dueDate) : undefined,
            dashboardUrl,
            appName: process.env.APP_NAME || '科技學術研討會平台',
            appUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000'
          }

          console.log(`發送審稿通知郵件給: ${reviewer.email}`)
          const emailSent = await emailService.sendReviewerAssignmentEmail(emailData)
          
          if (!emailSent) {
            console.error(`審稿通知郵件發送失敗: ${reviewer.email}`)
          } else {
            console.log(`審稿通知郵件發送成功: ${reviewer.email}`)
          }
        })
      )
    } catch (emailError) {
      console.error('發送審稿通知郵件時發生錯誤:', emailError)
    }

    return NextResponse.json({
      message: '審稿人分配成功，已發送通知郵件',
      assignments
    })
  } catch (error) {
    console.error('分配審稿人失敗:', error)
    return NextResponse.json({ 
      error: '伺服器錯誤: ' + (error instanceof Error ? error.message : '未知錯誤')
    }, { status: 500 })
  }
}