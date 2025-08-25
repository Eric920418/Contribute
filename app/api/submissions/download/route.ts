import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getSession } from '@/lib/auth/session'
import { readFile } from 'fs/promises'
import { join } from 'path'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    
    
    if (!fileId) {
      return NextResponse.json({ error: '缺少檔案ID參數' }, { status: 400 })
    }

    // 首先嘗試查找正式投稿檔案
    let fileAsset = await prisma.fileAsset.findUnique({
      where: { id: fileId },
      include: {
        submission: {
          include: {
            creator: true
          }
        }
      }
    })

    let isDraft = false
    let draftFileAsset = null

    // 如果找不到正式投稿檔案，嘗試查找草稿檔案
    if (!fileAsset) {
      draftFileAsset = await prisma.draftFileAsset.findUnique({
        where: { id: fileId },
        include: {
          draft: {
            include: {
              creator: true
            }
          }
        }
      })
      
      if (draftFileAsset) {
        isDraft = true
      }
    }

    if (!fileAsset && !draftFileAsset) {
      return NextResponse.json({ error: '檔案不存在' }, { status: 404 })
    }

    // 權限檢查
    let hasPermission = false

    if (isDraft) {
      // 草稿檔案：只有作者本人可以下載
      hasPermission = draftFileAsset.draft.createdBy === session.userId
    } else {
      // 正式投稿檔案：投稿者、審稿人（如果被指派）、編輯和主編可以下載
      hasPermission = 
        fileAsset.submission.createdBy === session.userId || // 投稿者
        session.roles.includes('EDITOR') || // 編輯
        session.roles.includes('CHIEF_EDITOR') // 主編
      
      // TODO: 檢查是否為指派的審稿人
    }
    
    if (!hasPermission) {
      return NextResponse.json({ error: '無權限下載此檔案' }, { status: 403 })
    }

    // 讀取檔案
    const targetFile = isDraft ? draftFileAsset : fileAsset
    const filePath = join(process.cwd(), targetFile.path)
    
    try {
      const fileBuffer = await readFile(filePath)
      
      // 根據檔案類型設定適當的 headers
      const response = new NextResponse(fileBuffer)
      response.headers.set('Content-Type', targetFile.mimeType)
      response.headers.set('Content-Length', targetFile.size.toString())
      
      // 正確處理包含中文或特殊字符的檔案名稱
      const encodedFilename = encodeURIComponent(targetFile.originalName)
      response.headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`)
      
      return response
      
    } catch (error) {
      return NextResponse.json({ 
        error: '檔案讀取失敗',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      }, { status: 500 })
    }

  } catch (error) {
    return NextResponse.json({ 
      error: '伺服器錯誤',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
    }, { status: 500 })
  }
}