import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/auth/middleware'

const conferenceSchema = z.object({
  year: z.number().int().min(2020).max(2030),
  title: z.string().min(1),
  tracks: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
  isActive: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const active = searchParams.get('active')
    
    if (year) {
      // 查詢特定年份的會議
      const conference = await prisma.conference.findUnique({
        where: { year: parseInt(year) }
      })
      
      if (!conference) {
        // 如果沒有找到，回傳預設會議資料
        const defaultConference = {
          year: parseInt(year),
          title: `${year} AI時代課程教學與傳播科技研討會`,
          tracks: {
            'ai_education': 'AI在教育中的應用',
            'digital_learning': '數位學習與教學科技',
            'curriculum_design': '課程設計與開發',
            'assessment': '學習評量與分析',
            'media_technology': '傳播科技與媒體素養',
            'teacher_training': '教師專業發展'
          },
          settings: {
            submissionDeadline: `${year}-12-31`,
            reviewDeadline: `${parseInt(year) + 1}-02-28`,
            notificationDate: `${parseInt(year) + 1}-03-15`,
            conferenceDate: `${parseInt(year) + 1}-05-15`
          },
          isActive: false
        }
        return NextResponse.json(defaultConference)
      }
      
      return NextResponse.json(conference)
    }

    // 查詢所有會議
    const whereCondition: any = {}
    if (active !== null) {
      whereCondition.isActive = active === 'true'
    }

    const conferences = await prisma.conference.findMany({
      where: whereCondition,
      orderBy: { year: 'desc' }
    })

    return NextResponse.json({ conferences })
  } catch (error) {
    console.error('取得會議列表失敗:', error)
    return NextResponse.json({ error: '取得會議資料失敗' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (session) => {
    // 只有主編可以創建會議
    if (!session.user.roles?.includes('CHIEF_EDITOR')) {
      return NextResponse.json(
        { error: '權限不足，只有主編可以創建會議' },
        { status: 403 }
      )
    }

    try {
      const body = await request.json()
      const validatedData = conferenceSchema.parse(body)
      
      // 檢查年份是否已存在
      const existingConference = await prisma.conference.findUnique({
        where: { year: validatedData.year }
      })
      
      if (existingConference) {
        return NextResponse.json(
          { error: '該年份的會議已存在' },
          { status: 400 }
        )
      }
      
      const conference = await prisma.conference.create({
        data: validatedData
      })
      
      return NextResponse.json(conference, { status: 201 })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: '資料格式錯誤', details: error.errors },
          { status: 400 }
        )
      }
      
      console.error('Error creating conference:', error)
      return NextResponse.json(
        { error: '創建會議失敗' },
        { status: 500 }
      )
    }
  })
}

// PUT /api/conferences - 更新會議
export async function PUT(request: NextRequest) {
  return withAuth(request, async (session) => {
    // 只有主編可以更新會議
    if (!session.user.roles?.includes('CHIEF_EDITOR')) {
      return NextResponse.json(
        { error: '權限不足，只有主編可以修改會議設定' },
        { status: 403 }
      )
    }

    try {
      const body = await request.json()
      const { year, ...updateData } = body
      
      if (!year) {
        return NextResponse.json(
          { error: '缺少年份參數' },
          { status: 400 }
        )
      }
      
      // 驗證更新資料
      const validatedData = conferenceSchema.partial().parse(updateData)
      
      const conference = await prisma.conference.upsert({
        where: { year },
        create: {
          year,
          title: `${year} AI時代課程教學與傳播科技研討會`,
          tracks: {
            'ai_education': 'AI在教育中的應用',
            'digital_learning': '數位學習與教學科技',
            'curriculum_design': '課程設計與開發',
            'assessment': '學習評量與分析',
            'media_technology': '傳播科技與媒體素養',
            'teacher_training': '教師專業發展'
          },
          settings: {
            submissionDeadline: `${year}-12-31`,
            reviewDeadline: `${year + 1}-02-28`,
            notificationDate: `${year + 1}-03-15`,
            conferenceDate: `${year + 1}-05-15`
          },
          isActive: false,
          ...validatedData
        },
        update: validatedData
      })
      
      return NextResponse.json(conference)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: '資料格式錯誤', details: error.errors },
          { status: 400 }
        )
      }
      
      console.error('Error updating conference:', error)
      return NextResponse.json(
        { error: '更新會議失敗' },
        { status: 500 }
      )
    }
  })
}