import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/auth/session'

const prisma = new PrismaClient()

// 生成流水號的函數
function generateSerialNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  
  return `SUB${year}${month}${day}${hours}${minutes}${seconds}${random}`
}

// 發送電子郵件通知的函數（模擬）
async function sendEmailNotification(authors: any[], serialNumber: string, submissionTitle: string) {
  try {
    // 這裡應該整合實際的電子郵件服務
    console.log('發送電子郵件通知給以下作者：')
    authors.forEach(author => {
      console.log(`- ${author.name} (${author.email})`)
    })
    console.log(`流水號：${serialNumber}`)
    console.log(`論文標題：${submissionTitle}`)
    console.log('通知內容：稿件已由通訊作者投稿完成')
    
    // 實際實作時可以使用如 nodemailer, SendGrid 等服務
    // 範例：
    // await emailService.send({
    //   to: authors.map(a => a.email),
    //   subject: `投稿完成通知 - ${submissionTitle} (${serialNumber})`,
    //   html: `您的稿件「${submissionTitle}」已由通訊作者完成投稿，流水號：${serialNumber}`
    // })
    
    return true
  } catch (error) {
    console.error('發送電子郵件失敗:', error)
    return false
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
    const { title, abstract, track, authors } = body

    // 檢查投稿是否存在且屬於當前使用者
    const existingSubmission = await prisma.submission.findUnique({
      where: { 
        id,
        createdBy: session.userId
      },
      include: {
        authors: true
      }
    })

    if (!existingSubmission) {
      return NextResponse.json({ error: '找不到投稿或無權限修改' }, { status: 404 })
    }

    // 只有草稿狀態才能提交
    if (existingSubmission.status !== 'DRAFT') {
      return NextResponse.json({ error: '只有草稿狀態的投稿才能提交' }, { status: 400 })
    }

    // 生成流水號
    const serialNumber = generateSerialNumber()

    // 使用事務更新投稿狀態並生成流水號
    const submittedSubmission = await prisma.$transaction(async (tx) => {
      // 刪除舊的作者資料
      await tx.submissionAuthor.deleteMany({
        where: { submissionId: id }
      })

      // 更新投稿狀態為已提交，並設置流水號
      return tx.submission.update({
        where: { id },
        data: {
          title,
          abstract,
          track,
          status: 'SUBMITTED',
          serialNumber, // 假設資料庫中有 serialNumber 欄位
          submittedAt: new Date(), // 假設資料庫中有 submittedAt 欄位
          authors: {
            create: authors.map((author: any) => ({
              name: author.name,
              email: author.email,
              affiliation: author.institution,
              isCorresponding: author.isCorresponding || false
            }))
          }
        },
        include: {
          authors: true,
          conference: true
        }
      })
    })

    // 發送電子郵件通知所有作者
    const emailSent = await sendEmailNotification(
      submittedSubmission.authors,
      serialNumber,
      submittedSubmission.title
    )

    return NextResponse.json({
      message: '稿件提交成功',
      submission: submittedSubmission,
      serialNumber,
      emailNotificationSent: emailSent
    })
  } catch (error) {
    console.error('提交投稿失敗:', error)
    return NextResponse.json({ 
      error: '提交失敗: ' + (error as Error).message 
    }, { status: 500 })
  }
}