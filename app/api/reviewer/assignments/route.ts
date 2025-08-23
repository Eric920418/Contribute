import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withRole } from '@/lib/auth/api-auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  return withRole(request, 'REVIEWER', async (req, session) => {
    try {

      // 獲取審稿任務
      const assignments = await prisma.reviewAssignment.findMany({
        where: {
          reviewerId: session.userId
        },
        include: {
          submission: {
            include: {
              authors: true,
              conference: true
            }
          },
          review: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // 轉換資料格式以符合前端需求
      const formattedAssignments = assignments.map(assignment => {
        const { submission, review } = assignment
        
        // 根據狀態決定建議
        let suggestion: 'accept_oral' | 'accept_poster' | 'reject' | undefined
        if (review?.recommendation) {
          switch (review.recommendation) {
            case 'ACCEPT':
              suggestion = 'accept_oral'
              break
            case 'MINOR_REVISION':
            case 'MAJOR_REVISION':
              suggestion = 'accept_poster'
              break
            case 'REJECT':
              suggestion = 'reject'
              break
          }
        }

        // 決定狀態
        let status: 'pending' | 'in_progress' | 'completed'
        switch (assignment.status) {
          case 'PENDING':
            status = 'pending'
            break
          case 'ACCEPTED':
          case 'DECLINED':
            status = review?.submittedAt ? 'completed' : 'in_progress'
            break
          case 'SUBMITTED':
            status = 'completed'
            break
          default:
            status = 'pending'
        }

        // 根據截止日期決定優先級
        let priority: 'high' | 'medium' | 'low' = 'medium'
        if (assignment.dueAt) {
          const daysUntilDue = Math.ceil((assignment.dueAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          if (daysUntilDue < 0) {
            priority = 'high' // 已逾期
          } else if (daysUntilDue <= 3) {
            priority = 'high' // 3天內到期
          } else if (daysUntilDue <= 7) {
            priority = 'medium' // 7天內到期
          } else {
            priority = 'low' // 超過7天
          }
        }

        return {
          id: assignment.id,
          title: submission.title,
          authors: submission.authors.map(author => author.name),
          status,
          dueDate: assignment.dueAt ? assignment.dueAt.toISOString().split('T')[0] : '',
          assignedDate: assignment.createdAt.toISOString().split('T')[0],
          submittedDate: review?.submittedAt ? review.submittedAt.toISOString().split('T')[0] : undefined,
          priority,
          paperType: submission.paperType || '研究論文',
          suggestion
        }
      })

      return new Response(JSON.stringify({
        success: true,
        data: formattedAssignments
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('獲取審稿任務失敗:', error)
      return new Response(JSON.stringify({
        error: '獲取審稿任務失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  })
}