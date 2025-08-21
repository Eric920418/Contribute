const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedConference() {
  try {
    // 檢查是否已存在 2025 年的會議
    const existing = await prisma.conference.findFirst({
      where: { year: 2025 }
    })

    if (existing) {
      console.log('2025 年會議已存在')
      return
    }

    // 創建 2025 年會議
    const conference = await prisma.conference.create({
      data: {
        year: 2025,
        title: '2025 科技學術研討會',
        isActive: true,
        tracks: {
          'AI': '人工智慧',
          'ML': '機器學習', 
          'DATA': '資料科學',
          'SECURITY': '資訊安全',
          'WEB': '網頁技術',
          'MOBILE': '行動應用'
        },
        settings: {
          description: '2025年度科技學術研討會，歡迎各界學者專家投稿',
          submissionStartDate: '2025-01-01',
          submissionEndDate: '2025-06-30',
          reviewStartDate: '2025-07-01',
          reviewEndDate: '2025-08-31',
          conferenceDate: '2025-10-15',
          location: '台北國際會議中心'
        }
      }
    })

    console.log('成功創建 2025 年會議:', conference.id)
  } catch (error) {
    console.error('創建會議失敗:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedConference()