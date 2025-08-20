import { PrismaClient, RoleType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 開始資料庫種子資料建立...')

  // 建立角色
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { key: RoleType.AUTHOR },
      update: {},
      create: { key: RoleType.AUTHOR },
    }),
    prisma.role.upsert({
      where: { key: RoleType.REVIEWER },
      update: {},
      create: { key: RoleType.REVIEWER },
    }),
    prisma.role.upsert({
      where: { key: RoleType.EDITOR },
      update: {},
      create: { key: RoleType.EDITOR },
    }),
    prisma.role.upsert({
      where: { key: RoleType.CHIEF_EDITOR },
      update: {},
      create: { key: RoleType.CHIEF_EDITOR },
    }),
    prisma.role.upsert({
      where: { key: RoleType.ADMIN },
      update: {},
      create: { key: RoleType.ADMIN },
    }),
  ])

  console.log(`✅ 已建立 ${roles.length} 個角色`)

  // 建立預設研討會
  const conference = await prisma.conference.upsert({
    where: { year: 2024 },
    update: {},
    create: {
      year: 2024,
      title: '2024 科技學術研討會',
      tracks: [
        'AI與機器學習',
        '軟體工程',
        '資訊安全',
        '資料科學',
        '人機互動',
        '計算機網路'
      ],
      settings: {
        submissionDeadline: '2024-06-30',
        reviewDeadline: '2024-08-31',
        notificationDate: '2024-09-30',
        maxFileSize: 10485760, // 10MB
        allowedFileTypes: ['.pdf', '.doc', '.docx'],
        reviewersPerSubmission: 2,
        enableDoubleBlind: true
      },
      isActive: true,
    },
  })

  console.log(`✅ 已建立研討會: ${conference.title}`)

  // 建立預設管理者帳號
  const adminPasswordHash = await bcrypt.hash('admin123456', 12)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@conference.example.com' },
    update: {},
    create: {
      email: 'admin@conference.example.com',
      passwordHash: adminPasswordHash,
      displayName: '系統管理員',
      emailVerifiedAt: new Date(),
    },
  })

  // 指派管理員角色
  const adminRole = roles.find(role => role.key === RoleType.ADMIN)!
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  })

  // 建立主編帳號
  const chiefEditorPasswordHash = await bcrypt.hash('editor123456', 12)
  const chiefEditorUser = await prisma.user.upsert({
    where: { email: 'chief@conference.example.com' },
    update: {},
    create: {
      email: 'chief@conference.example.com',
      passwordHash: chiefEditorPasswordHash,
      displayName: '主編',
      emailVerifiedAt: new Date(),
    },
  })

  // 指派主編角色
  const chiefEditorRole = roles.find(role => role.key === RoleType.CHIEF_EDITOR)!
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: chiefEditorUser.id,
        roleId: chiefEditorRole.id,
      },
    },
    update: {},
    create: {
      userId: chiefEditorUser.id,
      roleId: chiefEditorRole.id,
    },
  })

  // 建立編輯帳號
  const editorPasswordHash = await bcrypt.hash('editor123456', 12)
  const editorUser = await prisma.user.upsert({
    where: { email: 'editor@conference.example.com' },
    update: {},
    create: {
      email: 'editor@conference.example.com',
      passwordHash: editorPasswordHash,
      displayName: '編輯',
      emailVerifiedAt: new Date(),
    },
  })

  // 指派編輯角色
  const editorRole = roles.find(role => role.key === RoleType.EDITOR)!
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: editorUser.id,
        roleId: editorRole.id,
      },
    },
    update: {},
    create: {
      userId: editorUser.id,
      roleId: editorRole.id,
    },
  })

  // 建立測試審稿人帳號
  const reviewerPasswordHash = await bcrypt.hash('reviewer123456', 12)
  const reviewerUser = await prisma.user.upsert({
    where: { email: 'reviewer@conference.example.com' },
    update: {},
    create: {
      email: 'reviewer@conference.example.com',
      passwordHash: reviewerPasswordHash,
      displayName: '審稿人',
      emailVerifiedAt: new Date(),
    },
  })

  // 指派審稿人角色
  const reviewerRole = roles.find(role => role.key === RoleType.REVIEWER)!
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: reviewerUser.id,
        roleId: reviewerRole.id,
      },
    },
    update: {},
    create: {
      userId: reviewerUser.id,
      roleId: reviewerRole.id,
    },
  })

  // 建立測試投稿者帳號
  const authorPasswordHash = await bcrypt.hash('author123456', 12)
  const authorUser = await prisma.user.upsert({
    where: { email: 'author@conference.example.com' },
    update: {},
    create: {
      email: 'author@conference.example.com',
      passwordHash: authorPasswordHash,
      displayName: '張教授',
      emailVerifiedAt: new Date(),
    },
  })

  // 指派投稿者角色
  const authorRole = roles.find(role => role.key === RoleType.AUTHOR)!
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: authorUser.id,
        roleId: authorRole.id,
      },
    },
    update: {},
    create: {
      userId: authorUser.id,
      roleId: authorRole.id,
    },
  })

  // 建立第二個測試投稿者帳號
  const author2PasswordHash = await bcrypt.hash('author123456', 12)
  const author2User = await prisma.user.upsert({
    where: { email: 'author2@conference.example.com' },
    update: {},
    create: {
      email: 'author2@conference.example.com',
      passwordHash: author2PasswordHash,
      displayName: '李博士',
      emailVerifiedAt: new Date(),
    },
  })

  // 指派第二個投稿者角色
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: author2User.id,
        roleId: authorRole.id,
      },
    },
    update: {},
    create: {
      userId: author2User.id,
      roleId: authorRole.id,
    },
  })

  console.log('✅ 已建立預設使用者帳號:')
  console.log('📧 管理員: admin@conference.example.com / admin123456')
  console.log('📧 主編: chief@conference.example.com / editor123456')
  console.log('📧 編輯: editor@conference.example.com / editor123456')
  console.log('📧 審稿人: reviewer@conference.example.com / reviewer123456')
  console.log('📧 投稿者1: author@conference.example.com / author123456')
  console.log('📧 投稿者2: author2@conference.example.com / author123456')

  console.log('🎉 資料庫種子資料建立完成!')
}

main()
  .catch((e) => {
    console.error('❌ 種子資料建立失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })