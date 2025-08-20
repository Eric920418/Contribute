import { z } from 'zod'

// 註冊表單驗證
export const registerSchema = z.object({
  email: z
    .string()
    .email('請輸入有效的 Email 地址')
    .min(1, 'Email 不能為空'),
  password: z
    .string()
    .min(8, '密碼至少需要 8 個字元')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密碼必須包含大小寫字母和數字'),
  confirmPassword: z.string().min(1, '請確認密碼'),
  displayName: z
    .string()
    .min(2, '顯示名稱至少需要 2 個字元')
    .max(50, '顯示名稱不能超過 50 個字元'),
  orcid: z.string().optional(),
  agreeToTerms: z.boolean().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: '密碼不一致',
  path: ['confirmPassword']
})

// 登入表單驗證
export const loginSchema = z.object({
  email: z
    .string()
    .email('請輸入有效的 Email 地址')
    .min(1, 'Email 不能為空'),
  password: z
    .string()
    .min(1, '密碼不能為空'),
  rememberMe: z.boolean().optional()
})

// 忘記密碼表單驗證
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('請輸入有效的 Email 地址')
    .min(1, 'Email 不能為空')
})

// 重設密碼表單驗證
export const resetPasswordSchema = z.object({
  token: z.string().min(1, '無效的重設連結'),
  password: z
    .string()
    .min(8, '密碼至少需要 8 個字元')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密碼必須包含大小寫字母和數字'),
  confirmPassword: z.string().min(1, '請確認密碼')
}).refine((data) => data.password === data.confirmPassword, {
  message: '密碼不一致',
  path: ['confirmPassword']
})

// 變更密碼表單驗證
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '請輸入目前密碼'),
  newPassword: z
    .string()
    .min(8, '密碼至少需要 8 個字元')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密碼必須包含大小寫字母和數字'),
  confirmPassword: z.string().min(1, '請確認新密碼')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '新密碼不一致',
  path: ['confirmPassword']
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: '新密碼不能與目前密碼相同',
  path: ['newPassword']
})

// 個人資料更新驗證
export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, '顯示名稱至少需要 2 個字元')
    .max(50, '顯示名稱不能超過 50 個字元'),
  orcid: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/.test(val), {
      message: 'ORCID 格式不正確 (例: 0000-0000-0000-0000)'
    })
})

// Type definitions
export type RegisterFormData = z.infer<typeof registerSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>