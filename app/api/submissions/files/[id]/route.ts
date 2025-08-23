import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/auth/session'
import { unlink } from 'fs/promises'
import { join } from 'path'

const prisma = new PrismaClient()

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const fileId = params.id
    
    // 查找檔案記錄
    const fileAsset = await prisma.fileAsset.findUnique({
      where: { id: fileId },
      include: {
        submission: true
      }
    })

    if (!fileAsset) {
      return NextResponse.json({ error: '檔案不存在' }, { status: 404 })
    }

    // 權限檢查 - 只有投稿者可以刪除
    if (fileAsset.submission.createdBy !== session.userId) {
      return NextResponse.json({ error: '無權限刪除此檔案' }, { status: 403 })
    }

    // 刪除實際檔案
    const filePath = join(process.cwd(), fileAsset.path)
    try {
      await unlink(filePath)
      console.log('實際檔案已刪除:', filePath)
    } catch (error) {
      console.warn('刪除實際檔案失敗，但繼續刪除資料庫記錄:', error)
    }

    // 刪除資料庫記錄
    const deletedFile = await prisma.fileAsset.delete({
      where: { id: fileId }
    })

    console.log('檔案記錄已從資料庫刪除:', fileId)
    console.log('刪除的檔案詳情:', deletedFile)

    return NextResponse.json({ 
      message: '檔案已成功刪除',
      fileId,
      fileName: fileAsset.originalName
    })

  } catch (error) {
    console.error('檔案刪除失敗:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}