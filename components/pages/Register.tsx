'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import EmailVerification from './EmailVerification'

interface RegisterProps {
  onBack?: () => void
  onSuccess?: (user: any) => void
}

interface RegisterFormData {
  // 登入資訊
  name: string
  email: string
  password: string
  confirmPassword: string
  
  // 使用者資訊
  organization: string
  orcidId: string
  
  // 專業知識領域
  expertiseAreas: string[]
  
  // 審稿人興趣
  interestedInReviewing: boolean
  
  // 服務條款
  agreeToTerms: boolean
}

// 專業知識領域選項
const expertiseOptions = [
  { id: '21st-century-skills', label: '21世紀技能/批判性思考能力' },
  { id: 'ai-education', label: '人工智慧教育' },
  { id: 'ai-simulation-games', label: '人工智慧技術模擬遊戲' },
  { id: 'ar-vr-mr', label: '擴增實境/虛擬實境/混合實境' },
  { id: 'behavior-analysis', label: '行為模式分析與模型建立' },
  { id: 'collaborative-learning', label: '協作/合作學習' },
  { id: 'computational-thinking', label: '運算思維' },
  { id: 'computer-assisted-language', label: '電腦輔助語言學習' },
  { id: 'english-teaching', label: '英語教學' },
  { id: 'creativity', label: '創造力' },
  { id: 'distance-learning', label: '遠距教學和線上學習' },
  { id: 'k12-education', label: 'K-12 教育' },
  { id: 'social-media-education', label: '社交媒體應用與教育' },
  { id: 'inquiry-based-learning', label: '健康主義/探究式學習' },
  { id: 'music-education', label: '音樂教育' },
  { id: 'educational-data-mining', label: '教育資料探勘' },
  { id: 'teacher-training', label: '教師培訓' },
  { id: 'interactive-applications', label: '互動裝置應用' }
]

export default function Register({ onBack, onSuccess }: RegisterProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [registrationData, setRegistrationData] = useState<any>(null)
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    orcidId: '',
    expertiseAreas: [],
    interestedInReviewing: false,
    agreeToTerms: false
  })

  const handleInputChange = (field: keyof RegisterFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleExpertiseChange = (expertiseId: string, checked: boolean) => {
    setFormData(prev => {
      const currentAreas = prev.expertiseAreas
      if (checked) {
        // 最多選擇5個領域
        if (currentAreas.length < 5) {
          return {
            ...prev,
            expertiseAreas: [...currentAreas, expertiseId]
          }
        }
      } else {
        return {
          ...prev,
          expertiseAreas: currentAreas.filter(id => id !== expertiseId)
        }
      }
      return prev
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          displayName: formData.name,
          ...(formData.orcidId.trim() && { orcid: formData.orcidId.trim() })
        }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.requiresVerification) {
          // 顯示郵件驗證步驟
          setRegistrationData({
            user: data.user,
            nextResendTime: data.nextResendTime
          })
          setShowEmailVerification(true)
        } else {
          // 直接註冊成功（不需要驗證）
          if (onSuccess) {
            onSuccess(data.user)
          }
        }
      } else {
        setError(data.error || '註冊失敗，請稍後再試')
      }
    } catch (error) {
      console.error('註冊失敗:', error)
      setError('網絡錯誤，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEmailVerificationSuccess = (user: any) => {
    if (onSuccess) {
      onSuccess(user)
    }
  }

  const handleEmailVerificationError = (error: string) => {
    setError(error)
  }

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const passwordMatch = formData.password === formData.confirmPassword
    const passwordValid =
      formData.password.length >= 8 &&
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)

    const hasRequiredFields =
      !!formData.name &&
      !!formData.email &&
      !!formData.password &&
      !!formData.confirmPassword &&
      !!formData.organization &&
      !!formData.orcidId

    const hasExpertise = formData.expertiseAreas.length >= 1
    const termsOk = formData.interestedInReviewing

    return (
      hasRequiredFields &&
      emailRegex.test(formData.email) &&
      passwordMatch &&
      passwordValid &&
      hasExpertise &&
      termsOk
    )
  }


  const getOrcidError = () => {
    if (!formData.orcidId) return '不能空白'
    return ''
  }


  const getPasswordError = () => {
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      return '密碼不一致'
    }
    if (formData.password && formData.password.length < 8) {
      return '密碼至少需要8個字符'
    }
    if (formData.password && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      return '密碼必須包含大小寫字母和數字'
    }
    return ''
  }

  const getEmailError = () => {
    if (!formData.email) return ''
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(formData.email) ? '' : 'Email 格式不正確'
  }

  const getExpertiseError = () => {
    if (formData.expertiseAreas.length < 1) return '請至少選擇一個領域'
    return ''
  }


  const canSubmit = validateForm()
  const isDisabled = !canSubmit || isSubmitting


  // 如果需要顯示郵件驗證，顯示驗證組件
  if (showEmailVerification && registrationData) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header currentPage="submit" />

        <main className="flex-1 px-4 py-8 md:px-60 md:py-28 bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 md:p-20 w-full max-w-2xl">
            {error && (
              <div className="mb-4 md:mb-6">
                <p className="text-destructive text-base md:text-32R">{error}</p>
              </div>
            )}
            
            <EmailVerification
              userId={registrationData.user.id}
              email={registrationData.user.email}
              displayName={registrationData.user.displayName}
              nextResendTime={registrationData.nextResendTime}
              onSuccess={handleEmailVerificationSuccess}
              onError={handleEmailVerificationError}
            />
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header currentPage="submit" />

      {/* 主要內容區域 */}
      <main className="flex-1 bg-[#F5F5F5] py-8 md:py-[112px]">
        <div className="max-w-[1440px] mx-auto bg-white rounded-lg mx-4 md:mx-auto">
          <div className="text-center py-6 md:py-[56px] border-b border-foreground/20">
            <h1 className="text-foreground text-2xl md:text-48M px-4" style={{
              fontWeight: '500',
              lineHeight: '1.2',
              letterSpacing: '0.06em',
            }}>建立新帳戶</h1>
          </div>
          {/* 註冊表單卡片 */}
          <div className="px-4 py-6 md:px-[96px] md:py-[96px]">
            {error && (
              <div className="mb-6 md:mb-8">
                <p className="text-destructive text-base md:text-32R">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8 md:space-y-[96px]">
              {/* 登入資訊 */}
              <div className="space-y-6 md:space-y-[56px]">
                <h2
                  className="text-lg md:text-32R opacity-70 text-[#00182CB3] bg-[#187DF810] rounded-lg w-fit px-4 py-2 md:px-[24px] md:py-[8px]"
                  style={{
                    fontWeight: '500',
                  }}
                >
                  登入資訊
                </h2>

                {/* 姓名 */}
                <div>
                  <label className="block text-foreground text-base md:text-32R mb-2 md:mb-4">
                    <span className="text-destructive">*</span>姓名
                  </label>
                  <input
                    type="text"
                    placeholder="姓名"
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    className="w-full py-3 px-4 md:py-[16px] md:px-[24px] text-base md:text-40R border border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                    required
                  />
                </div>

                {/* 電子郵件 */}
                <div>
                  <label className="block text-foreground text-base md:text-32R mb-2 md:mb-4">
                    <span className="text-destructive">*</span>電子郵件（登入帳號）
                  </label>
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    className="w-full py-3 px-4 md:py-[16px] md:px-[24px] text-base md:text-40R border border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                    required
                  />
                  {getEmailError() && (
                    <p className="text-destructive text-sm mt-2">
                      {getEmailError()}
                    </p>
                  )}
                </div>

                {/* 密碼和確認密碼 */}
                <div className="space-y-6 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
                  {/* 密碼 */}
                  <div>
                    <label className="block text-foreground text-base md:text-32R mb-2 md:mb-4">
                      <span className="text-destructive">*</span>密碼
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="密碼"
                        value={formData.password}
                        onChange={e =>
                          handleInputChange('password', e.target.value)
                        }
                        className="w-full py-3 px-4 md:py-[16px] md:px-[24px] text-base md:text-40R border border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 md:w-6 md:h-6" />
                        ) : (
                          <Eye className="w-5 h-5 md:w-6 md:h-6" />
                        )}
                      </button>
                    </div>
                    <p className="text-foreground/60 text-sm md:text-base mt-2">
                      至少8個字符，包含大小寫字母和數字
                    </p>
                  </div>

                  {/* 確認密碼 */}
                  <div>
                    <label className="block text-foreground text-base md:text-32R mb-2 md:mb-4">
                      <span className="text-destructive">*</span>確認密碼
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="密碼"
                        value={formData.confirmPassword}
                        onChange={e =>
                          handleInputChange('confirmPassword', e.target.value)
                        }
                        className="w-full py-3 px-4 md:py-[16px] md:px-[24px] text-base md:text-40R border border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5 md:w-6 md:h-6" />
                        ) : (
                          <Eye className="w-5 h-5 md:w-6 md:h-6" />
                        )}
                      </button>
                    </div>
                    {getPasswordError() && (
                      <p className="text-destructive text-sm mt-2">
                        {getPasswordError()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 分隔線 */}
              <div className="w-full h-px bg-[#00182C1A]"></div>

              {/* 使用者資訊 */}
              <div className="space-y-6 md:space-y-[56px]">
                <h2
                  className="text-lg md:text-32R font-bold text-[#00182C70] bg-[#187DF810] rounded-lg w-fit px-4 py-2 md:px-[24px] md:py-[8px]"
                  style={{
                    fontWeight: '500',
                  }}
                >
                  使用者資訊
                </h2>

                <div className="space-y-6 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
                  {/* 服務單位與職稱 */}
                  <div>
                    <label className="block text-foreground text-base md:text-32R mb-2 md:mb-4">
                      <span className="text-destructive">*</span>服務單位與職稱
                    </label>
                    <input
                      type="text"
                      placeholder="機構"
                      value={formData.organization}
                      onChange={e =>
                        handleInputChange('organization', e.target.value)
                      }
                      className="w-full py-3 px-4 md:py-[16px] md:px-[24px] text-base md:text-40R border border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                      required
                    />
                  </div>

                  {/* ORCID ID */}
                  <div>
                    <label className="block text-foreground text-base md:text-32R mb-2 md:mb-4">
                      <span className="text-destructive">*</span>ORCID ID
                    </label>
                    <input
                      type="text"
                      placeholder="ORCID ID"
                      value={formData.orcidId}
                      onChange={e =>
                        handleInputChange('orcidId', e.target.value)
                      }
                      className="w-full py-3 px-4 md:py-[16px] md:px-[24px] text-base md:text-40R border border-foreground/20 rounded-lg focus:border-primary focus:ring-0"
                      required
                    />
                    {getOrcidError() && (
                      <p className="text-destructive text-sm mt-2">
                        {getOrcidError()}
                      </p>
                    )}
                  </div>
                </div>

                {/* 專業知識領域 */}
                <div>
                  <label className="block text-foreground text-base md:text-32R mb-4 md:mb-[32px]">
                    <span className="text-destructive">*</span>專業知識領域（至多勾選五個）
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 bg-[#eaedef40] rounded-lg p-4 md:p-[40px]">
                    {expertiseOptions.map(option => (
                      <label
                        key={option.id}
                        className="flex items-center space-x-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.expertiseAreas.includes(option.id)}
                          onChange={e =>
                            handleExpertiseChange(option.id, e.target.checked)
                          }
                          disabled={
                            !formData.expertiseAreas.includes(option.id) &&
                            formData.expertiseAreas.length >= 5
                          }
                          className="w-4 h-4 md:w-5 md:h-5 text-primary bg-white border-2 border-foreground/20 rounded focus:ring-primary focus:ring-2"
                        />
                        <span className="text-foreground text-sm md:text-32R">
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
            
                  {getExpertiseError() && (
                    <p className="text-destructive text-sm mt-2">
                      {getExpertiseError()}
                    </p>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
        {/* 審稿人興趣 */}
        <div className="text-center mt-8 md:mt-[96px] px-4 md:px-0">
          <label
            htmlFor="interestedInReviewing"
            className="inline-flex items-center gap-3 cursor-pointer"
          >
            <input
              id="interestedInReviewing"
              type="checkbox"
              checked={formData.interestedInReviewing}
              required
              onChange={e =>
                handleInputChange('interestedInReviewing', e.target.checked)
              }
              className="peer sr-only"
            />
            {/* 圓形外觀 */}
            <span
              aria-hidden
              className="
                w-6 h-6 md:w-[32px] md:h-[32px] grid place-items-center rounded-full
                border border-foreground/20 bg-white
                transition
                ring-offset-2 peer-focus:ring-2 peer-focus:ring-primary
                peer-checked:bg-primary peer-checked:border-primary
                text-transparent peer-checked:text-white
                flex-shrink-0
              "
            >
              {/* 勾勾：跟隨 currentColor，勾選時變白 */}
              <svg
                viewBox="0 0 24 24"
                className="w-3 h-3 opacity-0 peer-checked:opacity-100"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M20 6 9 17 4 12" />
              </svg>
            </span>
            <span className="text-foreground text-base md:text-32R">有興趣擔任審稿人</span>
          </label>
        </div>

        {/* 註冊按鈕 */}
        <div className="text-center mt-8 md:mt-[56px] px-4 md:px-0">
          <button
            type="button"
            disabled={isDisabled}
            onClick={handleSubmit}
            className="w-full max-w-md md:w-[640px] py-4 md:py-[24px] text-lg md:text-40M bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
            style={{
              fontWeight: '500',
              lineHeight: '1.2',
              letterSpacing: '0.06em',
            }}
          >
            {isSubmitting && <Loader2 className="mr-2 md:mr-3 h-5 w-5 md:h-6 md:w-6 animate-spin" />}
            {isSubmitting ? '註冊中...' : '註冊'}
          </button>
        </div>
      </main>

      <Footer />
    </div>
  )
}