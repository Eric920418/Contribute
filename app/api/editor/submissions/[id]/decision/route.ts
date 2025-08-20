import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, DecisionResult } from '@prisma/client'
import { getSession } from '@/lib/auth/session'

const prisma = new PrismaClient()

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
    const { decision, note } = body

    if (!decision || !['ACCEPT', 'REVISE', 'REJECT'].includes(decision)) {
      return NextResponse.json({ error: '無效的決議類型' }, { status: 400 })
    }

    const submissionId = params.id

    // 檢查投稿是否存在
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        reviewAssignments: {
          include: {
            review: true
          }
        }
      }
    })

    if (!submission) {
      return NextResponse.json({ error: '找不到指定的投稿' }, { status: 404 })
    }

    // 檢查是否所有審稿都已完成（可選檢查）
    const completedReviews = submission.reviewAssignments.filter(ra => ra.review?.submittedAt)
    if (completedReviews.length === 0 && decision !== 'REJECT') {
      return NextResponse.json({ 
        error: '尚未有完成的審稿，無法做出接受或修改決議' 
      }, { status: 400 })
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

    return NextResponse.json({
      message: '編輯決議已保存',
      decision: decisionRecord
    })
  } catch (error) {
    console.error('保存編輯決議失敗:', error)
    return NextResponse.json({ 
      error: '伺服器錯誤: ' + (error instanceof Error ? error.message : '未知錯誤')
    }, { status: 500 })
  }
}