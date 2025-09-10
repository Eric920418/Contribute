import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, DecisionResult } from '@prisma/client'
import { getSession } from '@/lib/auth/session'
import { createEmailService } from '@/lib/email/mailer'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params
    
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 檢查是否為編輯或主編
    if (!session.roles?.includes('EDITOR') && !session.roles?.includes('CHIEF_EDITOR')) {
      return NextResponse.json({ error: '權限不足，需要編輯權限' }, { status: 403 })
    }

    const body = await request.json()
    const { decision, note } = body

    if (!decision || !['ACCEPT', 'REVISE', 'REJECT'].includes(decision)) {
      return NextResponse.json({ error: '無效的決議類型' }, { status: 400 })
    }

    // 檢查投稿是否存在
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        reviewAssignments: {
          include: {
            review: true
          }
        },
        authors: true,
        conference: true
      }
    })

    if (!submission) {
      return NextResponse.json({ error: '找不到指定的投稿' }, { status: 404 })
    }

    // 檢查是否有審稿結果（對於接受決議的輕度檢查）
    const completedReviews = submission.reviewAssignments.filter(ra => ra.review?.submittedAt)
    if (completedReviews.length === 0 && decision === 'ACCEPT') {
      console.warn(`Warning: Accepting submission ${submissionId} without completed reviews`)
      // 警告但不阻止，因為編輯可能有特殊理由
    }

    // 建立決議記錄
    const decisionRecord = await prisma.decision.create({
      data: {
        submissionId,
        decidedBy: session.userId,
        result: decision as DecisionResult,
        note: note || null
      },
      include: {
        decider: {
          select: { displayName: true }
        }
      }
    })

    // 更新投稿狀態
    let newStatus = submission.status
    switch (decision) {
      case 'ACCEPT':
        newStatus = 'ACCEPTED'
        break
      case 'REVISE':
        newStatus = 'REVISION_REQUIRED'
        break
      case 'REJECT':
        newStatus = 'REJECTED'
        break
    }

    await prisma.submission.update({
      where: { id: submissionId },
      data: { 
        status: newStatus,
        decisionNote: note || null
      }
    })

    // 發送決議結果郵件給通訊作者
    try {
      const correspondingAuthor = submission.authors.find(author => author.isCorresponding)
      
      if (correspondingAuthor) {
        const emailService = createEmailService()
        
        const emailData = {
          to: correspondingAuthor.email,
          authorName: correspondingAuthor.name,
          submissionTitle: submission.title,
          submissionId: submission.id,
          decision: decision as 'ACCEPT' | 'REJECT' | 'REVISE',
          note: note || undefined,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/author`,
          appName: submission.conference?.title || '研討會管理系統',
          appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        }

        const emailSent = await emailService.sendDecisionResultEmail(emailData)
        
        if (!emailSent) {
          console.warn(`Warning: Failed to send decision email to ${correspondingAuthor.email}`)
        }
      } else {
        console.warn(`Warning: No corresponding author found for submission ${submissionId}`)
      }
    } catch (emailError) {
      console.error('Error sending decision email:', emailError)
      // 不影響決議儲存，繼續執行
    }

    return NextResponse.json({
      message: '編輯決議已保存並通知投稿者',
      decision: decisionRecord
    })
  } catch (error) {
    console.error('保存編輯決議失敗:', error)
    return NextResponse.json({ 
      error: '伺服器錯誤: ' + (error instanceof Error ? error.message : '未知錯誤')
    }, { status: 500 })
  }
}