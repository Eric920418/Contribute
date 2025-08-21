const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('初始化資料庫...')

  // 創建角色
  const roles = ['AUTHOR', 'REVIEWER', 'EDITOR', 'CHIEF_EDITOR', 'ADMIN']
  
  for (const roleKey of roles) {
    const existingRole = await prisma.role.findUnique({
      where: { key: roleKey }
    })
    
    if (!existingRole) {
      await prisma.role.create({
        data: { key: roleKey }
      })
      console.log(`角色 ${roleKey} 已創建`)
    } else {
      console.log(`角色 ${roleKey} 已存在`)
    }
  }

  // 創建主編帳號
  const chiefEmail = 'chief@conference.example.com'
  const chiefPassword = 'chief123456'
  
  const existingChief = await prisma.user.findUnique({
    where: { email: chiefEmail }
  })
  
  if (!existingChief) {
    const hashedPassword = await bcrypt.hash(chiefPassword, 12)
    
    const chiefUser = await prisma.user.create({
      data: {
        email: chiefEmail,
        passwordHash: hashedPassword,
        displayName: '主編',
        status: 'ENABLED'
      }
    })
    
    // 指派主編角色
    const chiefRole = await prisma.role.findUnique({
      where: { key: 'CHIEF_EDITOR' }
    })
    
    if (chiefRole) {
      await prisma.userRole.create({
        data: {
          userId: chiefUser.id,
          roleId: chiefRole.id
        }
      })
    }
    
    console.log(`主編帳號已創建: ${chiefEmail}`)
  } else {
    console.log(`主編帳號已存在: ${chiefEmail}`)
  }

  console.log('資料庫初始化完成！')
}

main()
  .catch((e) => {
    console.error('初始化失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })