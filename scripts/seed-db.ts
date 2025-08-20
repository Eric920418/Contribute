import { PrismaClient, RoleType } from '@prisma/client'
import { hashPassword } from '@/lib/auth/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('開始初始化資料庫...')

  // 建立角色
  const roles: { key: RoleType }[] = [
    { key: 'AUTHOR' },
    { key: 'REVIEWER' },
    { key: 'EDITOR' },
    { key: 'CHIEF_EDITOR' },
    { key: 'ADMIN' }
  ]

  for (const role of roles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: {},
      create: role
    })
  }
  console.log('✅ 角色建立完成')

  // 建立會議
  const conference = await prisma.conference.upsert({
    where: { year: 2025 },
    update: {},
    create: {
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
  console.log('✅ 會議建立完成')

  // 建立測試使用者
  const hashedPassword = await hashPassword('test123456')
  
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: hashedPassword,
      displayName: '測試作者',
      emailVerifiedAt: new Date()
    }
  })
  console.log('✅ 測試使用者建立完成')

  // 指派作者角色
  const authorRole = await prisma.role.findUnique({ where: { key: 'AUTHOR' } })
  if (authorRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: authorRole.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        roleId: authorRole.id
      }
    })
  }
  console.log('✅ 角色指派完成')

  // 建立範例投稿
  const submission = await prisma.submission.create({
    data: {
      title: 'AI輔助個性化學習系統設計與實作',
      abstract: '本研究探討AI技術在個性化學習系統中的應用，通過機器學習算法分析學習者的學習行為模式，提供客製化的學習路徑推薦。研究結果顯示，AI輔助的個性化學習系統能有效提升學習效果，並增加學習者的參與度。',
      track: 'ai_education',
      status: 'DRAFT',
      conferenceId: conference.id,
      createdBy: user.id,
      authors: {
        create: [{
          name: '測試作者',
          email: 'test@example.com',
          affiliation: '國立臺北教育大學',
          isCorresponding: true
        }]
      }
    }
  })
  console.log('✅ 範例投稿建立完成')

  console.log('🎉 資料庫初始化完成！')
  console.log(`📧 測試帳號: test@example.com`)
  console.log(`🔑 測試密碼: test123456`)
}

main()
  .catch((e) => {
    console.error('❌ 初始化失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })