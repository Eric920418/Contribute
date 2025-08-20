const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function deleteUser(email) {
  try {
    // 查詢用戶
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!user) {
      console.log(`❌ 找不到郵箱為 ${email} 的用戶`)
      return
    }

    console.log(`✅ 找到用戶: ${user.displayName} (${user.email})`)
    console.log(`🔑 角色: ${user.roles.map(ur => ur.role.key).join(', ') || '無角色'}`)
    console.log(`📅 註冊日期: ${user.createdAt.toLocaleString()}`)

    // 刪除用戶 (Cascade 會自動刪除相關的 UserRole 記錄)
    await prisma.user.delete({
      where: { id: user.id }
    })

    console.log(`✅ 用戶 ${user.email} 已成功刪除`)
    console.log(`🗑️  相關角色關聯也已自動清除`)
    
  } catch (error) {
    console.error('❌ 刪除用戶失敗:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 從命令行參數獲取郵箱
const email = process.argv[2]

if (!email) {
  console.log('❌ 請提供要刪除的用戶郵箱')
  console.log('用法: node scripts/delete-user.js <email>')
  process.exit(1)
}

console.log(`🗑️  準備刪除用戶: ${email}`)
deleteUser(email)