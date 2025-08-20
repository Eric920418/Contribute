import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const active = searchParams.get('active')

    const whereCondition: any = {}
    
    if (year) {
      whereCondition.year = parseInt(year)
    }
    
    if (active !== null) {
      whereCondition.isActive = active === 'true'
    }

    const conferences = await prisma.conference.findMany({
      where: whereCondition,
      orderBy: { year: 'desc' }
    })

    // 如果沒有會議資料，建立預設會議
    if (conferences.length === 0 && !year) {
      const defaultConference = await prisma.conference.create({
        data: {
          year: 2025,
          title: '2025 AI時代課程教學與傳播科技研討會',
          tracks: {
            'ai_education': 'AI在教育中的應用',
            'digital_learning': '數位學習與教學科技',
            'curriculum_design': '課程設計與開發',
            'assessment': '學習評量與分析',
            'media_technology': '傳播科技與媒體素養',
            'teacher_training': '教師專業發展'
          },
          settings: {
            submissionDeadline: '2025-12-31',
            reviewDeadline: '2026-02-28',
            notificationDate: '2026-03-15',
            conferenceDate: '2026-05-15'
          },
          isActive: true
        }
      })
      
      return NextResponse.json({ conferences: [defaultConference] })
    }

    return NextResponse.json({ conferences })
  } catch (error) {
    console.error('取得會議列表失敗:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { year, title, tracks, settings, isActive } = body

    // 驗證必填欄位
    if (!year || !title) {
      return NextResponse.json({ error: '年度和標題為必填欄位' }, { status: 400 })
    }

    // 檢查年度是否已存在
    const existingConference = await prisma.conference.findUnique({
      where: { year: parseInt(year) }
    })

    if (existingConference) {
      return NextResponse.json({ error: '該年度已有會議' }, { status: 400 })
    }

    const conference = await prisma.conference.create({
      data: {
        year: parseInt(year),
        title,
        tracks: tracks || {},
        settings: settings || {},
        isActive: isActive || false
      }
    })

    return NextResponse.json({
      message: '會議建立成功',
      conference
    })
  } catch (error) {
    console.error('建立會議失敗:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}