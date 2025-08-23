import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withRole } from '@/lib/auth/api-auth'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRole(request, 'REVIEWER', async (req, session) => {
    try {
      const assignmentId = params.id

      // 獲取審稿任務詳情
      const assignment = await prisma.reviewAssignment.findUnique({
        where: {
          id: assignmentId,
          reviewerId: session.userId // 確保只能查看自己的審稿任務
        },
        include: {
          submission: {
            include: {
              authors: {
                orderBy: { id: 'asc' }
              },
              files: {
                where: { 
                  kind: { 
                    in: ['MANUSCRIPT_ANONYMOUS', 'TITLE_PAGE'] 
                  } 
                },
                orderBy: { version: 'desc' }
              },
              conference: {
                select: {
                  id: true,
                  title: true,
                  year: true
                }
              }
            }
          },
          review: true
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

      // 轉換資料格式
      const responseData = {
        id: assignment.id,
        submission: {
          id: assignment.submission.id,
          title: assignment.submission.title,
          abstract: assignment.submission.abstract,
          track: assignment.submission.track,
          paperType: assignment.submission.paperType,
          keywords: assignment.submission.keywords,
          authors: assignment.submission.authors.map(author => ({
            id: author.id,
            name: author.name,
            email: author.email,
            affiliation: author.affiliation,
            isCorresponding: author.isCorresponding
          })),
          files: assignment.submission.files.map(file => ({
            id: file.id,
            originalName: file.originalName,
            size: file.size,
            path: file.path
          })),
          conference: assignment.submission.conference
        },
        dueAt: assignment.dueAt,
        createdAt: assignment.createdAt,
        review: assignment.review ? {
          id: assignment.review.id,
          score: assignment.review.score,
          commentToEditor: assignment.review.commentToEditor,
          commentToAuthor: assignment.review.commentToAuthor,
          recommendation: assignment.review.recommendation,
          submittedAt: assignment.review.submittedAt
        } : null
      }

      return new Response(JSON.stringify({
        success: true,
        data: responseData
      }), {
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (error) {
      console.error('獲取審稿任務詳情失敗:', error)
      return new Response(JSON.stringify({
        error: '獲取審稿任務詳情失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  })
}