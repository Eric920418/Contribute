const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function setUserRole(email, roleKey) {
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
    console.log(`📧 郵箱驗證: ${user.emailVerifiedAt ? '已驗證' : '未驗證'}`)
    console.log(`🔑 當前角色: ${user.roles.map(ur => ur.role.key).join(', ') || '無角色'}`)

    // 查詢角色
    const role = await prisma.role.findUnique({
      where: { key: roleKey }
    })

    if (!role) {
      console.log(`❌ 找不到角色: ${roleKey}`)
      return
    }

    // 檢查用戶是否已有此角色
    const existingRole = user.roles.find(ur => ur.role.key === roleKey)
    if (existingRole) {
      console.log(`⚠️  用戶已經擁有 ${roleKey} 角色`)
      return
    }

    // 分配角色
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id
      }
    })

    console.log(`✅ 成功為用戶 ${user.email} 分配 ${roleKey} 角色`)

    // 驗證結果
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    console.log(`🎯 更新後角色: ${updatedUser.roles.map(ur => ur.role.key).join(', ')}`)
    
  } catch (error) {
    console.error('❌ 操作失敗:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 從命令行參數獲取郵箱和角色
const email = process.argv[2] || 'tinatina920119@gmail.com'
const role = process.argv[3] || 'AUTHOR'

console.log(`🚀 開始為 ${email} 設定 ${role} 角色...`)
setUserRole(email, role)