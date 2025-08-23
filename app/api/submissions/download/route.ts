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

    // 查找檔案記錄
    const fileAsset = await prisma.fileAsset.findUnique({
      where: { id: fileId },
      include: {
        submission: {
          include: {
            creator: true
          }
        }
      }
    })


    if (!fileAsset) {
      return NextResponse.json({ error: '檔案不存在' }, { status: 404 })
    }

    // 權限檢查 - 只有投稿者、審稿人（如果被指派）、編輯和主編可以下載
    const hasPermission = 
      fileAsset.submission.createdBy === session.userId || // 投稿者
      session.roles.includes('EDITOR') || // 編輯
      session.roles.includes('CHIEF_EDITOR') // 主編
    
    
    // TODO: 檢查是否為指派的審稿人
    if (!hasPermission) {
      return NextResponse.json({ error: '無權限下載此檔案' }, { status: 403 })
    }

    // 讀取檔案
    const filePath = join(process.cwd(), fileAsset.path)
    
    try {
      const fileBuffer = await readFile(filePath)
      
      // 根據檔案類型設定適當的 headers
      const response = new NextResponse(fileBuffer)
      response.headers.set('Content-Type', fileAsset.mimeType)
      response.headers.set('Content-Length', fileAsset.size.toString())
      
      // 正確處理包含中文或特殊字符的檔案名稱
      const encodedFilename = encodeURIComponent(fileAsset.originalName)
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