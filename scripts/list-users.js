const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`📊 資料庫中共有 ${users.length} 位用戶：`)
    console.log('─'.repeat(80))

    if (users.length === 0) {
      console.log('❌ 資料庫中沒有用戶')
      return
    }

    users.forEach((user, index) => {
      console.log(`${index + 1}. 📧 ${user.email}`)
      console.log(`   👤 名稱: ${user.displayName}`)
      console.log(`   ✅ 驗證: ${user.emailVerifiedAt ? '已驗證' : '未驗證'}`)
      console.log(`   🔑 角色: ${user.roles.map(ur => ur.role.key).join(', ') || '無角色'}`)
      console.log(`   📅 註冊: ${user.createdAt.toLocaleString()}`)
      if (user.orcid) console.log(`   🎓 ORCID: ${user.orcid}`)
      console.log('─'.repeat(40))
    })

  } catch (error) {
    console.error('❌ 查詢失敗:', error)
  } finally {
    await prisma.$disconnect()
  }
}

console.log('🔍 查詢所有用戶...')
listUsers()