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

    if (!submissionId || !fileType || !file) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    // 驗證投稿是否存在且屬於當前用戶
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        createdBy: session.userId
      }
    })

    if (!submission) {
      return NextResponse.json({ error: '投稿不存在或無權限' }, { status: 404 })
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

    if (isWordFile) {
      // Word 檔案需要轉換為 PDF
      const tempExtension = file.name.split('.').pop()
      const tempFileName = `temp_${submission.id}_${fileType}_${Date.now()}.${tempExtension}`
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
        finalFileName = `${submission.id}_${fileType}_${Date.now()}.pdf`
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
      finalFileName = `${submission.id}_${fileType}_${Date.now()}.${fileExtension}`
      finalFilePath = join(uploadDir, finalFileName)
      
      await writeFile(finalFilePath, buffer)
    }
    
    // 生成最終檔案的檢查碼
    const finalBuffer = await readFile(finalFilePath)
    const checksum = crypto.createHash('md5').update(finalBuffer).digest('hex')

    // 檢查是否已存在相同類型的檔案，如果有則更新版本號
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

    // 保存檔案記錄到資料庫
    const finalFileSize = finalBuffer.length
    const fileAsset = await prisma.fileAsset.create({
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