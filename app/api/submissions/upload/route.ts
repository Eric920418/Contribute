import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/auth/session'
import { writeFile, mkdir, unlink, readFile } from 'fs/promises'
import { join } from 'path'
import crypto from 'crypto'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const formData = await request.formData()
    const submissionId = formData.get('submissionId') as string
    const fileType = formData.get('fileType') as string // MANUSCRIPT_ANONYMOUS 或 TITLE_PAGE
    const file = formData.get('file') as File

    console.log('檔案上傳API - 接收到的參數:')
    console.log('submissionId:', submissionId)
    console.log('fileType:', fileType)
    console.log('file:', file?.name, 'size:', file?.size, 'type:', file?.type)
    console.log('session.userId:', session.userId)
    
    // 檢查 FormData 的所有內容
    console.log('FormData 完整內容:')
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File(${value.name})` : value)
    }

    if (!submissionId || !fileType || !file) {
      console.log('缺少必要參數:', { submissionId, fileType, fileName: file?.name })
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    // 驗證投稿或草稿是否存在且屬於當前用戶
    console.log('查找投稿/草稿，條件:', { id: submissionId, createdBy: session.userId })
    
    // 首先檢查是否是草稿
    let draft = await prisma.draft.findFirst({
      where: {
        id: submissionId,
        createdBy: session.userId
      }
    })
    
    let submission = null
    if (!draft) {
      // 如果不是草稿，檢查是否是正式投稿
      submission = await prisma.submission.findFirst({
        where: {
          id: submissionId,
          createdBy: session.userId
        }
      })
    }
    
    console.log('查找到的草稿:', draft ? { id: draft.id } : null)
    console.log('查找到的投稿:', submission ? { id: submission.id, status: submission.status } : null)

    if (!draft && !submission) {
      // 詳細診斷：檢查是否存在這個ID的投稿或草稿（不限創建者）
      const anySubmission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { id: true, createdBy: true, status: true }
      })
      
      const anyDraft = await prisma.draft.findUnique({
        where: { id: submissionId },
        select: { id: true, createdBy: true }
      })
      
      console.log('診斷 - 是否存在此ID的投稿（任何創建者）:', anySubmission)
      console.log('診斷 - 是否存在此ID的草稿（任何創建者）:', anyDraft)
      
      if ((anySubmission && anySubmission.createdBy !== session.userId) || 
          (anyDraft && anyDraft.createdBy !== session.userId)) {
        return NextResponse.json({ error: '投稿不屬於當前用戶' }, { status: 403 })
      } else if (!anySubmission && !anyDraft) {
        return NextResponse.json({ error: `投稿ID ${submissionId} 不存在` }, { status: 404 })
      } else {
        return NextResponse.json({ error: '投稿不存在或無權限' }, { status: 404 })
      }
    }

    // 驗證檔案類型
    if (!['MANUSCRIPT_ANONYMOUS', 'TITLE_PAGE'].includes(fileType)) {
      return NextResponse.json({ error: '無效的檔案類型' }, { status: 400 })
    }

    // 驗證檔案格式 - 支援 Word 和 PDF
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/pdf' // .pdf
    ]
    
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: '僅接受 Word 格式檔案 (.doc, .docx) 或 PDF 檔案' }, { status: 400 })
    }

    // 檢查檔案大小 (限制10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: '檔案大小不能超過 10MB' }, { status: 400 })
    }

    // 讀取檔案內容
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // 確保上傳目錄存在
    const uploadDir = join(process.cwd(), 'uploads', 'submissions')
    await mkdir(uploadDir, { recursive: true })

    // 判斷檔案類型並處理轉換
    const isWordFile = file.type.includes('word') || file.type.includes('document')
    let finalFilePath: string
    let finalFileName: string
    let finalMimeType = file.type
    let tempFilePath: string | null = null

    // 確保我們有有效的實體ID
    const entityId = draft ? draft.id : (submission ? submission.id : null)
    if (!entityId) {
      console.error('無法獲取有效的實體ID:', { draftId: draft?.id, submissionId: submission?.id })
      return NextResponse.json({ error: '無效的投稿或草稿ID' }, { status: 400 })
    }

    console.log('使用實體ID:', entityId, '是否為草稿:', !!draft)

    if (isWordFile) {
      // Word 檔案需要轉換為 PDF
      const tempExtension = file.name.split('.').pop()
      const tempFileName = `temp_${entityId}_${fileType}_${Date.now()}.${tempExtension}`
      tempFilePath = join(uploadDir, tempFileName)
      
      // 先保存原始 Word 檔案到臨時位置
      await writeFile(tempFilePath, buffer)
      
      try {
        // 使用 LibreOffice 轉換 Word 為 PDF (Docker 環境相容)
        const sofficeCommand = process.env.NODE_ENV === 'production' 
          ? 'libreoffice' // Docker 環境中的命令
          : 'soffice'     // 本地開發環境
        
        const command = `${sofficeCommand} --headless --convert-to pdf --outdir "${uploadDir}" "${tempFilePath}"`
        const { stdout, stderr } = await execAsync(command, { timeout: 30000 })
        
        if (stderr && !stderr.includes('convert')) {
          console.warn('LibreOffice 轉換警告:', stderr)
        }
        
        // 生成轉換後的 PDF 檔案名稱
        const baseFileName = tempFileName.replace(/\.[^/.]+$/, "") // 移除副檔名
        const pdfFileName = `${baseFileName}.pdf`
        const convertedPdfPath = join(uploadDir, pdfFileName)
        
        // 重新命名轉換後的檔案
        finalFileName = `${entityId}_${fileType}_${Date.now()}.pdf`
        finalFilePath = join(uploadDir, finalFileName)
        
        // 重新命名檔案
        await writeFile(finalFilePath, await readFile(convertedPdfPath))
        await unlink(convertedPdfPath) // 刪除中間檔案
        
        finalMimeType = 'application/pdf'
      } catch (error) {
        console.error('Word 轉 PDF 失敗:', error)
        // 如果轉換失敗，清理臨時檔案並返回錯誤
        if (tempFilePath) {
          try { await unlink(tempFilePath) } catch {}
        }
        
        // 提供更詳細的錯誤信息
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('LibreOffice 轉換錯誤詳情:', errorMessage)
        
        return NextResponse.json({ 
          error: `Word 檔案轉換為 PDF 失敗: ${errorMessage}`,
          details: 'Please ensure LibreOffice is properly installed and accessible'
        }, { status: 500 })
      } finally {
        // 清理臨時 Word 檔案
        if (tempFilePath) {
          try { await unlink(tempFilePath) } catch {}
        }
      }
    } else {
      // PDF 檔案直接保存
      const fileExtension = file.name.split('.').pop()
      finalFileName = `${entityId}_${fileType}_${Date.now()}.${fileExtension}`
      finalFilePath = join(uploadDir, finalFileName)
      
      await writeFile(finalFilePath, buffer)
    }
    
    // 生成最終檔案的檢查碼
    const finalBuffer = await readFile(finalFilePath)
    const checksum = crypto.createHash('md5').update(finalBuffer).digest('hex')

    // 根據是草稿還是投稿決定檔案保存邏輯
    let fileAsset
    const finalFileSize = finalBuffer.length

    if (draft) {
      // 草稿檔案：保存到 DraftFileAsset 表格
      const existingFile = await prisma.draftFileAsset.findFirst({
        where: {
          draftId: submissionId,
          kind: fileType as any
        },
        orderBy: {
          version: 'desc'
        }
      })

      const version = existingFile ? existingFile.version + 1 : 1

      fileAsset = await prisma.draftFileAsset.create({
        data: {
          draftId: submissionId,
          kind: fileType as any,
          version,
          path: `uploads/submissions/${finalFileName}`,
          originalName: file.name, // 保留原始檔案名稱
          size: finalFileSize,
          mimeType: finalMimeType, // 使用最終的 MIME 類型（可能是轉換後的 PDF）
          checksum
        }
      })
    } else {
      // 正式投稿檔案：保存到 FileAsset 表格
      const existingFile = await prisma.fileAsset.findFirst({
        where: {
          submissionId,
          kind: fileType as any
        },
        orderBy: {
          version: 'desc'
        }
      })

      const version = existingFile ? existingFile.version + 1 : 1

      fileAsset = await prisma.fileAsset.create({
        data: {
          submissionId,
          kind: fileType as any,
          version,
          path: `uploads/submissions/${finalFileName}`,
          originalName: file.name, // 保留原始檔案名稱
          size: finalFileSize,
          mimeType: finalMimeType, // 使用最終的 MIME 類型（可能是轉換後的 PDF）
          checksum
        }
      })
    }

    return NextResponse.json({
      message: isWordFile ? 'Word 檔案已轉換為 PDF 並上傳成功' : 'PDF 檔案上傳成功',
      file: {
        id: fileAsset.id,
        originalName: fileAsset.originalName,
        finalName: finalFileName,
        size: fileAsset.size,
        type: fileAsset.kind,
        version: fileAsset.version,
        converted: isWordFile
      }
    })

  } catch (error) {
    console.error('檔案上傳失敗:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}