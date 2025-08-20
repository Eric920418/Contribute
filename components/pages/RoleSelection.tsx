'use client'

import { useState } from 'react'
import { Eye, EyeOff, PenTool, FileText, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

interface RoleSelectionProps {
  onBack?: () => void
  onGoToRegister?: () => void
  onGoToForgotPassword?: () => void
}

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

export default function RoleSelection({ onBack, onGoToRegister, onGoToForgotPassword }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('author')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    account: '',
    password: ''
  })

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // 處理登入邏輯
    console.log('Login with:', { role: selectedRole, ...formData })
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header currentPage="submit" />
      
      {/* 主要內容區域 */}
      <main className="flex-1 px-28 py-28 bg-muted">
        <div className="max-w-[992px] mx-auto">
          {/* 請選擇身份標題 */}
          <div className="text-center mb-24">
            <h1 className="text-foreground text-5xl font-medium leading-[70px]">
              請選擇身份
            </h1>
          </div>

          {/* 身份選擇按鈕 */}
          <div className="flex justify-center gap-6 mb-24">
            {roles.map((role) => {
              const IconComponent = role.icon
              const isSelected = selectedRole === role.id
              return (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className={`
                    w-[315px] h-[246px] p-12 rounded-lg border-4 flex flex-col items-center justify-center gap-6
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
                  <span className={`text-2xl font-medium ${
                    isSelected ? 'text-primary' : 'text-foreground'
                  }`}>
                    {role.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* 登入表單 */}
          <div className="bg-white rounded-lg p-24 max-w-[800px] mx-auto">
            <form onSubmit={handleLogin} className="space-y-12">
              {/* 帳號輸入框 */}
              <div>
                <Input
                  type="text"
                  placeholder="帳號"
                  value={formData.account}
                  onChange={(e) => handleInputChange('account', e.target.value)}
                  className="w-full h-16 px-6 text-xl border-2 border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                />
              </div>

              {/* 密碼輸入框 */}
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="密碼"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full h-16 px-6 pr-16 text-xl border-2 border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
              </div>

              {/* 忘記密碼 */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={onGoToForgotPassword}
                  className="text-destructive text-lg hover:underline"
                >
                  忘記密碼？
                </button>
              </div>

              {/* 登入按鈕 */}
              <Button
                type="submit"
                size="xl"
                className="w-full text-3xl font-medium"
              >
                登入
              </Button>
            </form>

            {/* 註冊區域 */}
            <div className="mt-16 text-center">
              <h3 className="text-2xl font-medium text-foreground mb-8">
                沒有投稿帳戶？
              </h3>
              <p className="text-lg text-foreground/80 leading-relaxed mb-12">
                建立帳戶後，您即可開始在課程教學與傳播科技學術研討會投
                稿，分享人工智慧與創意教育的實踐經驗，並促成跨領域合作的
                可能。
              </p>
              <Button
                type="button"
                variant="outline"
                size="xl"
                className="w-full text-3xl font-medium"
                onClick={onGoToRegister}
              >
                註冊
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}