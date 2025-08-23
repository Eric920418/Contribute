'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, PenTool, FileText, Users } from 'lucide-react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { apiClient } from '@/lib/api/client'

type UserRole = 'author' | 'reviewer' | 'editor'

const roles = [
  {
    id: 'author' as const,
    label: '我是投稿作者',
    icon: PenTool,
    color: 'role-author'
  },
  {
    id: 'reviewer' as const,
    label: '我是審稿人',
    icon: FileText,
    color: 'role-reviewer'
  },
  {
    id: 'editor' as const,
    label: '我是編輯',
    icon: Users,
    color: 'role-editor'
  }
]

export default function LoginPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<UserRole>('author')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    account: '',
    password: ''
  })

  // 登入頁面獨立的認證檢查（只執行一次）
  useEffect(() => {
    const checkIfAlreadyLoggedIn = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            
            // 根據用戶角色決定跳轉目標
            if (data.user.roles.includes('EDITOR') || data.user.roles.includes('CHIEF_EDITOR')) {
              window.location.href = '/editor/dashboard'
            } else if (data.user.roles.includes('REVIEWER')) {
              window.location.href = '/reviewer/dashboard'
            } else if (data.user.roles.includes('AUTHOR')) {
              window.location.href = '/author'
            } else {
              window.location.href = '/author'
            }
          }
        }
      } catch (error) {
        // 用戶未登入，什麼都不做
      }
    }

    checkIfAlreadyLoggedIn()
  }, []) // 只在組件掛載時執行一次



  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // 驗證表單
      if (!formData.account || !formData.password) {
        setError('請填寫帳號和密碼')
        return
      }

      // 直接使用 API 登入
      const response = await apiClient.post('/auth/login', {
        email: formData.account,
        password: formData.password
      })
      
      const result = {
        success: true,
        user: response.data.user,
        mustChangePassword: response.data.mustChangePassword
      }

      if (!result.success) {
        setError(result.error || '登入失敗')
        return
      }

      // 檢查是否需要強制改密碼
      if (result.mustChangePassword) {
        router.push(`/force-change-password?email=${encodeURIComponent(formData.account)}`)
        return
      }

      if (result.user) {
        // 登入成功，根據用戶選擇的角色進行驗證和跳轉
        const userRoles = result.user.roles || []
        
        // 角色映射
        const roleMapping = {
          'author': 'AUTHOR',
          'reviewer': 'REVIEWER', 
          'editor': ['EDITOR', 'CHIEF_EDITOR'] // 編輯和主編都可以進入編輯頁面
        }
        
        const selectedRoleInDB = roleMapping[selectedRole]
        const hasSelectedRole = Array.isArray(selectedRoleInDB) 
          ? selectedRoleInDB.some(role => userRoles.includes(role))
          : userRoles.includes(selectedRoleInDB)
        
        if (!hasSelectedRole) {
          setError(`您沒有${roles.find(r => r.id === selectedRole)?.label}的權限，請選擇正確的身份`)
          return
        }
        
        // 登入成功後延遲跳轉，確保session cookie設置完成
        
        
        // 使用setTimeout確保session cookie已經設置
        setTimeout(() => {
          switch (selectedRole) {
            case 'author':
              
              window.location.href = '/author'
              break
            case 'reviewer':
              
              window.location.href = '/reviewer/dashboard'
              break
            case 'editor':
              
              window.location.href = '/editor/dashboard'
              break
            default:
              window.location.href = '/author'
          }
        }, 100) // 短暫延遲確保cookie設置完成
      }
    } catch (error: any) {
      
      setError(error.response?.data?.error || '登入失敗，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className=" flex flex-col bg-white">
      <Header currentPage="submit" />

      {/* 主要內容區域 */}
      <main className="flex-1 px-28 py-28 bg-gray-100">
        <div className="max-w-[992px] mx-auto">
          {/* 請選擇身份標題 */}
          <div className="text-center mb-[96px]">
            <h1 className="text-foreground text-48M">請選擇身份</h1>
          </div>

          {/* 身份選擇按鈕 */}
          <div className="flex justify-center gap-6 mb-[96px]">
            {roles.map(role => {
              const IconComponent = role.icon
              const isSelected = selectedRole === role.id
              return (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className={`
                    w-[315px] h-[246px] py-[48px] px-[56px] rounded-[8px] border-4 flex flex-col items-center justify-center gap-6
                    transition-all duration-300 hover:scale-105
                    ${
                      isSelected
                        ? 'border-primary bg-white shadow-lg'
                        : 'border-foreground/20 bg-white/80 hover:bg-white'
                    }
                  `}
                >
                  <IconComponent
                    className={`w-12 h-12 ${
                      isSelected ? 'text-primary' : 'text-foreground/60'
                    }`}
                  />
                  <span
                    className={`text-2xl font-medium ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {role.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* 登入表單 */}
          <div className="bg-white rounded-lg p-[96px]  mx-auto">
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-center">{error}</p>
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-[48px]">
              {/* 帳號輸入框 */}
              <div>
                <input
                  type="text"
                  placeholder="帳號"
                  value={formData.account}
                  onChange={e => handleInputChange('account', e.target.value)}
                  autoComplete="new-password"
                  className="w-[800px] p-[32px] text-40R text-foreground bg-white border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
                />
              </div>

              {/* 密碼輸入框 */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="密碼"
                  value={formData.password}
                  onChange={e => handleInputChange('password', e.target.value)}
                  autoComplete="new-password"
                  className="w-[800px] p-[32px] text-40R text-foreground bg-white border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors pr-[120px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-[32px] top-[32px] text-foreground/60 hover:text-foreground flex items-center justify-center w-[56px] h-[56px]"
                >
                  {showPassword ? (
                    <EyeOff className="w-[56px] h-[56px]" />
                  ) : (
                    <Eye className="w-[56px] h-[56px]" />
                  )}
                </button>

                {/* 忘記密碼 */}
                <div className="text-right mt-[8px]">
                  <Link
                    href="/forgot-password"
                    className="text-destructive text-28R hover:underline"
                  >
                    忘記密碼？
                  </Link>
                </div>
              </div>

              {/* 登入按鈕 */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-[32px] px-8 text-48M bg-primary text-white rounded-[8px] hover:bg-primary/90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? '登入中...' : '登入'}
              </button>
            </form>

            {/* 註冊區域 */}
            <div className="mt-[96px] text-start">
              <h3 className="text-40M text-foreground mb-[48px]">
                沒有投稿帳戶？
              </h3>
              <p className="text-lg text-foreground/80 leading-relaxed mb-[96px]">
                建立帳戶後，您即可開始在課程教學與傳播科技學術研討會投
                稿，分享人工智慧與創意教育的實踐經驗，並促成跨領域合作的 可能。
              </p>
              <Link href="/register">
                <button className="w-full py-[32px] px-8 text-48M border border-[#00182C70] text-[#00182C70] bg-transparent rounded-[8px] hover:text-primary hover:border-primary active:scale-95 transition-all duration-200">
                  註冊
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}