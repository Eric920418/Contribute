import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/auth/session'
import { unlink } from 'fs/promises'
import { join } from 'path'

const prisma = new PrismaClient()

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { id: fileId } = await params
    
    console.log('=== 檔案刪除 API 開始 ===')
    console.log('要刪除的檔案ID:', fileId)
    console.log('當前用戶ID:', session.userId)
    
    // 首先嘗試查找正式投稿檔案
    let fileAsset = await prisma.fileAsset.findUnique({
      where: { id: fileId },
      include: {
        submission: true
      }
    })
    
    console.log('正式投稿檔案查詢結果:', fileAsset ? { id: fileAsset.id, submissionId: fileAsset.submissionId } : null)

    let isDraft = false
    let draftFileAsset = null

    // 如果找不到正式投稿檔案，嘗試查找草稿檔案
    if (!fileAsset) {
      draftFileAsset = await prisma.draftFileAsset.findUnique({
        where: { id: fileId },
        include: {
          draft: true
        }
      })
      
      console.log('草稿檔案查詢結果:', draftFileAsset ? { id: draftFileAsset.id, draftId: draftFileAsset.draftId } : null)
      
      if (draftFileAsset) {
        isDraft = true
      }
    }

    if (!fileAsset && !draftFileAsset) {
      console.log('檔案不存在 - 兩個表格都找不到ID:', fileId)
      return NextResponse.json({ error: '檔案不存在' }, { status: 404 })
    }

    // 權限檢查 - 只有投稿者可以刪除
    const ownerId = isDraft ? draftFileAsset.draft.createdBy : fileAsset.submission.createdBy
    console.log('權限檢查 - 檔案擁有者ID:', ownerId, '當前用戶ID:', session.userId)
    
    if (ownerId !== session.userId) {
      console.log('權限不足 - 無法刪除檔案')
      return NextResponse.json({ error: '無權限刪除此檔案' }, { status: 403 })
    }
    
    console.log('權限檢查通過，開始刪除檔案')

    // 刪除實際檔案
    const targetFile = isDraft ? draftFileAsset : fileAsset
    const filePath = join(process.cwd(), targetFile.path)
    try {
      await unlink(filePath)
      console.log('實際檔案已刪除:', filePath)
    } catch (error) {
      console.warn('刪除實際檔案失敗，但繼續刪除資料庫記錄:', error)
    }

    // 刪除資料庫記錄
    let deletedFile
    console.log('準備從資料庫刪除檔案記錄 - 類型:', isDraft ? '草稿檔案' : '正式投稿檔案')
    
    try {
      if (isDraft) {
        console.log('執行草稿檔案資料庫刪除 - ID:', fileId)
        deletedFile = await prisma.draftFileAsset.delete({
          where: { id: fileId }
        })
        console.log('草稿檔案資料庫記錄刪除成功')
      } else {
        console.log('執行正式投稿檔案資料庫刪除 - ID:', fileId)
        deletedFile = await prisma.fileAsset.delete({
          where: { id: fileId }
        })
        console.log('正式投稿檔案資料庫記錄刪除成功')
      }
      
      console.log('刪除的檔案詳情:', {
        id: deletedFile.id,
        originalName: deletedFile.originalName,
        path: deletedFile.path
      })
    } catch (dbError) {
      console.error('資料庫刪除失敗:', dbError)
      throw dbError
    }

    console.log('=== 檔案刪除 API 完成 ===')
    console.log('成功回應:', {
      message: '檔案已成功刪除',
      fileId,
      fileName: targetFile.originalName,
      type: isDraft ? 'draft' : 'submission'
    })

    return NextResponse.json({ 
      message: '檔案已成功刪除',
      fileId,
      fileName: targetFile.originalName,
      type: isDraft ? 'draft' : 'submission'
    })

  } catch (error) {
    console.error('檔案刪除失敗:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}