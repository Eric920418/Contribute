import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withRole } from '@/lib/auth/api-auth'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRole(request, 'REVIEWER', async (req, session) => {
    try {
      const assignmentId = params.id
      const body = await request.json()
      
      const {
        score,
        commentToAuthor,
        commentToEditor,
        recommendation
      } = body

      // 驗證必填欄位
      if (!recommendation) {
        return new Response(JSON.stringify({
          error: '建議為必填欄位'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      if (!score || score < 4 || score > 20) {
        return new Response(JSON.stringify({
          error: '總分必須在4-20分之間'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // 驗證建議類型
      const validRecommendations = ['ACCEPT', 'MINOR_REVISION', 'MAJOR_REVISION', 'REJECT']
      if (!validRecommendations.includes(recommendation)) {
        return new Response(JSON.stringify({
          error: '無效的建議類型'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // 檢查審稿任務是否存在且屬於當前用戶
      const assignment = await prisma.reviewAssignment.findUnique({
        where: {
          id: assignmentId,
          reviewerId: session.userId
        },
        include: {
          review: true,
          submission: true
        }
      })

      if (!assignment) {
        return new Response(JSON.stringify({
          error: '找不到審稿任務或無權限訪問'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // 檢查是否已經提交過審稿意見
      if (assignment.review?.submittedAt) {
        return new Response(JSON.stringify({
          error: '審稿意見已經提交過，無法重複提交'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const now = new Date()

      let review
      if (assignment.review) {
        // 更新現有的審稿記錄
        review = await prisma.review.update({
          where: { id: assignment.review.id },
          data: {
            score: parseInt(score),
            commentToAuthor: commentToAuthor || null,
            commentToEditor: commentToEditor || null,
            recommendation: recommendation,
            submittedAt: now,
            updatedAt: now
          }
        })
      } else {
        // 創建新的審稿記錄
        review = await prisma.review.create({
          data: {
            assignmentId: assignment.id,
            score: parseInt(score),
            commentToAuthor: commentToAuthor || null,
            commentToEditor: commentToEditor || null,
            recommendation: recommendation,
            submittedAt: now
          }
        })
      }

      // 更新審稿任務狀態為已提交
      await prisma.reviewAssignment.update({
        where: { id: assignment.id },
        data: {
          status: 'SUBMITTED',
          updatedAt: now
        }
      })

      // TODO: 發送通知給編輯（可選）
      // await sendNotification({
      //   type: 'REVIEW_SUBMITTED',
      //   submissionId: assignment.submission.id,
      //   reviewerId: session.userId
      // })

      return new Response(JSON.stringify({
        success: true,
        message: '審稿意見提交成功',
        data: {
          reviewId: review.id,
          submittedAt: review.submittedAt
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('提交審稿意見失敗:', error)
      return new Response(JSON.stringify({
        error: '提交審稿意見失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  })
}