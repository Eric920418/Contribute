import nodemailer from 'nodemailer'
import { generateRandomString } from '@/lib/utils'

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  user?: string
  pass?: string
  from: string
}

export interface VerificationEmailData {
  to: string
  name: string
  code: string
  appName: string
  appUrl: string
}

export interface PasswordResetEmailData {
  to: string
  name: string
  resetUrl: string
  appName: string
  appUrl: string
}

export class EmailService {
  private transporter: nodemailer.Transporter
  private config: EmailConfig

  constructor(config: EmailConfig) {
    this.config = config
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? {
        user: config.user,
        pass: config.pass
      } : undefined
    })
  }

  async sendVerificationEmail(data: VerificationEmailData): Promise<boolean> {
    try {
      console.log(`開始發送驗證郵件到 ${data.to}...`)
      
      const htmlContent = this.generateVerificationEmailHTML(data)
      const textContent = this.generateVerificationEmailText(data)

      const mailOptions = {
        from: this.config.from,
        to: data.to,
        subject: `${data.appName} - 驗證您的電子郵件地址`,
        text: textContent,
        html: htmlContent
      }

      console.log('郵件配置:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      })

      const result = await this.transporter.sendMail(mailOptions)
      console.log('郵件發送結果:', result)

      return true
    } catch (error) {
      console.error('發送驗證郵件失敗:', error)
      if (error instanceof Error) {
        console.error('錯誤詳情:', error.message)
        console.error('錯誤堆疊:', error.stack)
      }
      return false
    }
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    try {
      console.log(`開始發送密碼重設郵件到 ${data.to}...`)
      
      const htmlContent = this.generatePasswordResetEmailHTML(data)
      const textContent = this.generatePasswordResetEmailText(data)

      const mailOptions = {
        from: this.config.from,
        to: data.to,
        subject: `${data.appName} - 密碼重設連結`,
        text: textContent,
        html: htmlContent
      }

      console.log('郵件配置:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      })

      const result = await this.transporter.sendMail(mailOptions)
      console.log('密碼重設郵件發送結果:', result)

      return true
    } catch (error) {
      console.error('發送密碼重設郵件失敗:', error)
      if (error instanceof Error) {
        console.error('錯誤詳情:', error.message)
        console.error('錯誤堆疊:', error.stack)
      }
      return false
    }
  }

  private generateVerificationEmailHTML(data: VerificationEmailData): string {
    return `
<!DOCTYPE html>
<html lang="zh-TW" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>驗證您的電子郵件地址</title>
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
    .email-wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #1EBFFF; padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; }
    .content { padding: 40px 20px; }
    .greeting { font-size: 20px; color: #333333; margin-bottom: 20px; }
    .message { font-size: 16px; color: #666666; line-height: 1.6; margin-bottom: 30px; }
    .verification-code { 
      background: #f8f9fa; 
      border: 2px solid #1EBFFF; 
      border-radius: 8px; 
      padding: 20px; 
      text-align: center; 
      margin: 30px 0; 
    }
    .code { 
      font-size: 36px; 
      font-weight: bold; 
      color: #1EBFFF; 
      letter-spacing: 8px; 
      font-family: 'Courier New', monospace; 
    }
    .code-label { 
      font-size: 14px; 
      color: #666666; 
      margin-bottom: 10px; 
    }
    .warning { 
      background: #fff3cd; 
      border-left: 4px solid #ffc107; 
      padding: 15px; 
      margin: 20px 0; 
      color: #856404; 
      font-size: 14px; 
    }
    .footer { 
      background: #f8f9fa; 
      padding: 20px; 
      text-align: center; 
      color: #666666; 
      font-size: 12px; 
    }
    .footer a { color: #1EBFFF; text-decoration: none; }
  </style>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "EmailMessage",
    "about": {
      "@type": "VerificationMessage",
      "name": "電子郵件驗證",
      "description": "驗證您在${data.appName}的電子郵件地址"
    },
    "sender": {
      "@type": "Organization",
      "name": "${data.appName}",
      "url": "${data.appUrl}"
    }
  }
  </script>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>${data.appName}</h1>
    </div>
    
    <div class="content">
      <div class="greeting">您好，${data.name}！</div>
      
      <div class="message">
        感謝您註冊 ${data.appName}。為了確保您的帳戶安全，請使用以下驗證碼完成電子郵件驗證：
      </div>
      
      <div class="verification-code">
        <div class="code-label">您的驗證碼</div>
        <div class="code">${data.code}</div>
      </div>
      
      <div class="message">
        請在註冊頁面輸入此驗證碼。此驗證碼將在 <strong>10 分鐘</strong> 後過期。
      </div>
      
      <div class="warning">
        <strong>重要提醒：</strong><br>
        • 如果您沒有註冊此帳戶，請忽略此郵件<br>
        • 請勿將此驗證碼分享給任何人<br>
        • 此驗證碼僅能使用一次
      </div>
    </div>
    
    <div class="footer">
      <p>此郵件由 <a href="${data.appUrl}">${data.appName}</a> 自動發送，請勿回覆</p>
      <p>如有問題，請聯繫我們的客服團隊</p>
    </div>
  </div>
</body>
</html>`
  }

  private generateVerificationEmailText(data: VerificationEmailData): string {
    return `
${data.appName} - 驗證您的電子郵件地址

您好，${data.name}！

感謝您註冊 ${data.appName}。為了確保您的帳戶安全，請使用以下驗證碼完成電子郵件驗證：

驗證碼：${data.code}

請在註冊頁面輸入此驗證碼。此驗證碼將在 10 分鐘後過期。

重要提醒：
• 如果您沒有註冊此帳戶，請忽略此郵件
• 請勿將此驗證碼分享給任何人
• 此驗證碼僅能使用一次

此郵件由 ${data.appName} 自動發送，請勿回覆。
如有問題，請聯繫我們的客服團隊。

${data.appUrl}
`
  }

  private generatePasswordResetEmailHTML(data: PasswordResetEmailData): string {
    return `
<!DOCTYPE html>
<html lang="zh-TW" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>重設您的密碼</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
    .email-wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #1EBFFF; padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; }
    .content { padding: 40px 20px; }
    .greeting { font-size: 20px; color: #333333; margin-bottom: 20px; }
    .message { font-size: 16px; color: #666666; line-height: 1.6; margin-bottom: 30px; }
    .reset-button { 
      background: #1EBFFF; 
      color: #ffffff; 
      text-decoration: none; 
      padding: 15px 30px; 
      border-radius: 8px; 
      display: inline-block; 
      font-weight: bold; 
      margin: 20px 0;
    }
    .reset-link { 
      background: #f8f9fa; 
      border: 1px solid #dee2e6; 
      border-radius: 8px; 
      padding: 15px; 
      margin: 20px 0; 
      word-break: break-all; 
      font-family: monospace;
      font-size: 14px;
    }
    .warning { 
      background: #fff3cd; 
      border-left: 4px solid #ffc107; 
      padding: 15px; 
      margin: 20px 0; 
      color: #856404; 
      font-size: 14px; 
    }
    .footer { 
      background: #f8f9fa; 
      padding: 20px; 
      text-align: center; 
      color: #666666; 
      font-size: 12px; 
    }
    .footer a { color: #1EBFFF; text-decoration: none; }
  </style>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "EmailMessage",
    "about": {
      "@type": "PasswordResetMessage",
      "name": "密碼重設",
      "description": "重設您在${data.appName}的密碼"
    },
    "sender": {
      "@type": "Organization",
      "name": "${data.appName}",
      "url": "${data.appUrl}"
    }
  }
  </script>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>${data.appName}</h1>
    </div>
    
    <div class="content">
      <div class="greeting">您好，${data.name}！</div>
      
      <div class="message">
        我們收到了您的密碼重設請求。點擊下方按鈕即可重設您的密碼：
      </div>
      
      <div style="text-align: center;">
        <a href="${data.resetUrl}" class="reset-button">重設我的密碼</a>
      </div>
      
      <div class="message">
        如果按鈕無法點擊，請複製以下連結到瀏覽器中開啟：
      </div>
      
      <div class="reset-link">${data.resetUrl}</div>
      
      <div class="warning">
        <strong>重要提醒：</strong><br>
        • 此重設連結將在 <strong>24 小時</strong> 後失效<br>
        • 如果您沒有請求重設密碼，請忽略此郵件<br>
        • 請勿將此連結分享給任何人<br>
        • 此連結只能使用一次
      </div>
    </div>
    
    <div class="footer">
      <p>此郵件由 <a href="${data.appUrl}">${data.appName}</a> 自動發送，請勿回覆</p>
      <p>如有問題，請聯繫我們的客服團隊</p>
    </div>
  </div>
</body>
</html>`
  }

  private generatePasswordResetEmailText(data: PasswordResetEmailData): string {
    return `
${data.appName} - 重設您的密碼

您好，${data.name}！

我們收到了您的密碼重設請求。請使用以下連結重設您的密碼：

重設連結：${data.resetUrl}

重要提醒：
• 此重設連結將在 24 小時後失效
• 如果您沒有請求重設密碼，請忽略此郵件
• 請勿將此連結分享給任何人
• 此連結只能使用一次

此郵件由 ${data.appName} 自動發送，請勿回覆。
如有問題，請聯繫我們的客服團隊。

${data.appUrl}
`
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('開始驗證 SMTP 連接...')
      const result = await this.transporter.verify()
      console.log('SMTP 連接驗證結果:', result)
      return true
    } catch (error) {
      console.error('郵件服務連接測試失敗:', error)
      if (error instanceof Error) {
        console.error('錯誤詳情:', error.message)
        console.error('錯誤堆疊:', error.stack)
      }
      return false
    }
  }
}

// 創建默認郵件服務實例
export function createEmailService(): EmailService {
  const config: EmailConfig = {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from: process.env.SMTP_FROM || 'noreply@localhost'
  }

  return new EmailService(config)
}

// 生成6位數字驗證碼
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}