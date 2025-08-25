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
    const draftId = id

    const body = await request.json()
    console.log('提交草稿，ID:', draftId)
    
    // 首先檢查是否是草稿 (Draft 表格)
    const draft = await prisma.draft.findFirst({
      where: {
        id: draftId,
        createdBy: session.userId
      },
      include: {
        authors: true,
        files: true,
        conference: true
      }
    })

    if (draft) {
      // 處理從 Draft 到 Submission 的轉換
      const {
        title = draft.title,
        abstract = draft.abstract,
        track = draft.track,
        authors = draft.authors,
        paperType = draft.paperType,
        keywords = draft.keywords,
        agreements,
        copyrightPermission = draft.copyrightPermission,
        formatCheck = draft.formatCheck
      } = body

      // 驗證必填欄位
      if (!title || !abstract || !track) {
        return NextResponse.json({ error: '缺少必填欄位：標題、摘要和主題軌道' }, { status: 400 })
      }

      if (!authors || authors.length === 0) {
        return NextResponse.json({ error: '至少需要一位作者' }, { status: 400 })
      }

      // 檢查是否有通訊作者
      const hasCorrespondingAuthor = authors.some((author: any) => author.isCorresponding)
      if (!hasCorrespondingAuthor) {
        return NextResponse.json({ error: '必須指定一位通訊作者' }, { status: 400 })
      }

      // 生成流水號
      const serialNumber = generateSerialNumber()

      // 開始資料庫交易：從 Draft 轉移到 Submission
      const result = await prisma.$transaction(async (tx) => {
        // 1. 創建正式投稿
        const submission = await tx.submission.create({
          data: {
            title,
            abstract,
            track,
            status: 'SUBMITTED',
            conferenceId: draft.conferenceId,
            createdBy: session.userId,
            submittedAt: new Date(),
            serialNumber,
            paperType,
            keywords,
            // 作者聲明
            agreementOriginalWork: agreements?.originalWork || draft.agreementOriginalWork || false,
            agreementNoConflictOfInterest: agreements?.noConflictOfInterest || draft.agreementNoConflictOfInterest || false,
            agreementConsentToPublish: agreements?.consentToPublish || draft.agreementConsentToPublish || false,
            copyrightPermission,
            formatCheck,
            authors: {
              create: authors.map((author: any) => ({
                name: author.name,
                email: author.email,
                affiliation: author.affiliation || author.institution,
                isCorresponding: author.isCorresponding
              }))
            }
          },
          include: {
            authors: true,
            conference: true
          }
        })

        // 2. 移動檔案從 DraftFileAsset 到 FileAsset
        if (draft.files && draft.files.length > 0) {
          const filePromises = draft.files.map(async (draftFile) => {
            return tx.fileAsset.create({
              data: {
                submissionId: submission.id,
                kind: draftFile.kind,
                version: draftFile.version,
                path: draftFile.path,
                originalName: draftFile.originalName,
                size: draftFile.size,
                mimeType: draftFile.mimeType,
                checksum: draftFile.checksum
              }
            })
          })
          
          await Promise.all(filePromises)
        }

        // 3. 刪除草稿資料（Prisma 會自動處理 cascade 刪除）
        await tx.draft.delete({
          where: { id: draftId }
        })

        return submission
      })

      console.log('草稿提交成功，新投稿ID:', result.id)

      // 發送電子郵件通知所有作者
      const emailSent = await sendEmailNotification(
        result.authors,
        serialNumber,
        result.title
      )

      return NextResponse.json({
        message: '投稿提交成功',
        submission: result,
        serialNumber,
        emailNotificationSent: emailSent
      })

    } else {
      // 處理舊的 Submission 內部狀態變更邏輯（向後兼容）
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
        return NextResponse.json({ error: '找不到草稿或無權限修改' }, { status: 404 })
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
            serialNumber,
            submittedAt: new Date(),
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
    }

  } catch (error: any) {
    console.error('提交投稿失敗:', error)
    const errorMessage = error.message || '伺服器錯誤'
    return NextResponse.json({ 
      error: '提交失敗: ' + errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}