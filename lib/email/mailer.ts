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

export interface InvitationEmailData {
  to: string
  name: string
  role: string
  temporaryPassword: string
  loginUrl: string
  appName: string
  appUrl: string
}

export interface ReviewerAssignmentEmailData {
  to: string
  reviewerName: string
  submissionTitle: string
  submissionId: string
  dueDate?: Date
  dashboardUrl: string
  appName: string
  appUrl: string
}

export interface DecisionResultEmailData {
  to: string
  authorName: string
  submissionTitle: string
  submissionId: string
  decision: 'ACCEPT' | 'REJECT' | 'REVISE'
  note?: string
  dashboardUrl: string
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
      const htmlContent = this.generateVerificationEmailHTML(data)
      const textContent = this.generateVerificationEmailText(data)

      const mailOptions = {
        from: this.config.from,
        to: data.to,
        subject: `${data.appName} - 驗證您的電子郵件地址`,
        text: textContent,
        html: htmlContent
      }

      const result = await this.transporter.sendMail(mailOptions)

      return true
    } catch (error) {
      return false
    }
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    try {
      const htmlContent = this.generatePasswordResetEmailHTML(data)
      const textContent = this.generatePasswordResetEmailText(data)

      const mailOptions = {
        from: this.config.from,
        to: data.to,
        subject: `${data.appName} - 密碼重設連結`,
        text: textContent,
        html: htmlContent
      }

      const result = await this.transporter.sendMail(mailOptions)

      return true
    } catch (error) {
      return false
    }
  }

  async sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
    try {
      const htmlContent = this.generateInvitationEmailHTML(data)
      const textContent = this.generateInvitationEmailText(data)

      const mailOptions = {
        from: this.config.from,
        to: data.to,
        subject: `${data.appName} - 邀請您加入研討會管理系統`,
        text: textContent,
        html: htmlContent
      }

      const result = await this.transporter.sendMail(mailOptions)

      return true
    } catch (error) {
      return false
    }
  }

  async sendReviewerAssignmentEmail(data: ReviewerAssignmentEmailData): Promise<boolean> {
    try {
      const htmlContent = this.generateReviewerAssignmentEmailHTML(data)
      const textContent = this.generateReviewerAssignmentEmailText(data)

      const mailOptions = {
        from: this.config.from,
        to: data.to,
        subject: `${data.appName} - 新的審稿任務：${data.submissionTitle}`,
        text: textContent,
        html: htmlContent
      }

      const result = await this.transporter.sendMail(mailOptions)

      return true
    } catch (error) {
      return false
    }
  }

  async sendDecisionResultEmail(data: DecisionResultEmailData): Promise<boolean> {
    try {
      const textContent = this.generateDecisionResultEmailText(data)

      const decisionText = data.decision === 'ACCEPT' ? '接受' : 
                          data.decision === 'REJECT' ? '拒絕' : '需修改後重新提交'

      const mailOptions = {
        from: this.config.from,
        to: data.to,
        subject: `${data.appName} - 稿件審查結果：${decisionText}`,
        text: textContent
        // 移除html欄位，只發送純文字
      }

      const result = await this.transporter.sendMail(mailOptions)

      return true
    } catch (error) {
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

  private generateInvitationEmailHTML(data: InvitationEmailData): string {
    const roleText = data.role === 'CHIEF_EDITOR' ? '主編' : data.role === 'EDITOR' ? '編輯' : '審稿人'
    
    return `
<!DOCTYPE html>
<html lang="zh-TW" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>邀請您加入研討會管理系統</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
    .email-wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #A855F7; padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; }
    .content { padding: 40px 20px; }
    .greeting { font-size: 20px; color: #333333; margin-bottom: 20px; }
    .message { font-size: 16px; color: #666666; line-height: 1.6; margin-bottom: 30px; }
    .credentials-box { 
      background: #f8f9fa; 
      border: 2px solid #A855F7; 
      border-radius: 8px; 
      padding: 20px; 
      margin: 30px 0; 
    }
    .credential-item { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin: 10px 0; 
      padding: 10px; 
      background: white; 
      border-radius: 4px; 
    }
    .credential-label { 
      font-weight: bold; 
      color: #333333; 
    }
    .credential-value { 
      font-family: 'Courier New', monospace; 
      color: #A855F7; 
      font-weight: bold; 
    }
    .login-button { 
      background: #A855F7; 
      color: #ffffff; 
      text-decoration: none; 
      padding: 15px 30px; 
      border-radius: 8px; 
      display: inline-block; 
      font-weight: bold; 
      margin: 20px 0;
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
    .footer a { color: #A855F7; text-decoration: none; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>${data.appName}</h1>
    </div>
    
    <div class="content">
      <div class="greeting">您好，${data.name}！</div>
      
      <div class="message">
        恭喜您！您已被邀請加入 <strong>${data.appName}</strong> 擔任 <strong>${roleText}</strong> 的角色。
      </div>
      
      <div class="message">
        為了開始使用系統，我們已為您創建了帳戶。以下是您的登入資訊：
      </div>
      
      <div class="credentials-box">
        <div class="credential-item">
          <span class="credential-label">電子郵件：</span>
          <span class="credential-value">${data.to}</span>
        </div>
        <div class="credential-item">
          <span class="credential-label">臨時密碼：</span>
          <span class="credential-value">${data.temporaryPassword}</span>
        </div>
        <div class="credential-item">
          <span class="credential-label">您的角色：</span>
          <span class="credential-value">${roleText}</span>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.loginUrl}" class="login-button text-white">立即登入系統</a>
      </div>
      
      <div class="message">
        <strong>重要說明：</strong>
        <ul>
          <li>請使用上述臨時密碼首次登入</li>
          <li>登入後請立即修改密碼以確保帳戶安全</li>
          <li>如果您忘記密碼，可以使用「忘記密碼」功能重設</li>
          <li>如有任何問題，請聯繫系統管理員</li>
        </ul>
      </div>
      
      <div class="warning">
        <strong>安全提醒：</strong><br>
        • 請妥善保管您的登入資訊<br>
        • 不要與他人分享您的密碼<br>
        • 定期更新密碼以維護帳戶安全<br>
        • 如果您沒有申請此帳戶，請立即聯繫我們
      </div>
    </div>
    
    <div class="footer">
      <p>此郵件由 <a href="${data.appUrl}">${data.appName}</a> 自動發送，請勿回覆</p>
      <p>如有問題，請聯繫我們的系統管理員</p>
    </div>
  </div>
</body>
</html>`
  }

  private generateInvitationEmailText(data: InvitationEmailData): string {
    const roleText = data.role === 'CHIEF_EDITOR' ? '主編' : data.role === 'EDITOR' ? '編輯' : '審稿人'
    
    return `
${data.appName} - 邀請您加入研討會管理系統

您好，${data.name}！

恭喜您！您已被邀請加入 ${data.appName} 擔任 ${roleText} 的角色。

為了開始使用系統，我們已為您創建了帳戶。以下是您的登入資訊：

電子郵件：${data.to}
臨時密碼：${data.temporaryPassword}
您的角色：${roleText}

請點擊以下連結登入系統：
${data.loginUrl}

重要說明：
• 請使用上述臨時密碼首次登入
• 登入後請立即修改密碼以確保帳戶安全
• 如果您忘記密碼，可以使用「忘記密碼」功能重設
• 如有任何問題，請聯繫系統管理員

安全提醒：
• 請妥善保管您的登入資訊
• 不要與他人分享您的密碼
• 定期更新密碼以維護帳戶安全
• 如果您沒有申請此帳戶，請立即聯繫我們

此郵件由 ${data.appName} 自動發送，請勿回覆。
如有問題，請聯繫我們的系統管理員。

${data.appUrl}
`
  }

  private generateReviewerAssignmentEmailHTML(data: ReviewerAssignmentEmailData): string {
    const dueDateText = data.dueDate ? new Date(data.dueDate).toLocaleDateString('zh-TW') : '尚未指定'
    
    return `
<!DOCTYPE html>
<html lang="zh-TW" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>新的審稿任務</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
    .email-wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #10B981; padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; }
    .content { padding: 40px 20px; }
    .greeting { font-size: 20px; color: #333333; margin-bottom: 20px; }
    .message { font-size: 16px; color: #666666; line-height: 1.6; margin-bottom: 30px; }
    .submission-box { 
      background: #f8f9fa; 
      border: 2px solid #10B981; 
      border-radius: 8px; 
      padding: 20px; 
      margin: 30px 0; 
    }
    .submission-item { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      margin: 10px 0; 
      padding: 10px; 
      background: white; 
      border-radius: 4px; 
    }
    .submission-label { 
      font-weight: bold; 
      color: #333333; 
      min-width: 80px;
    }
    .submission-value { 
      color: #10B981; 
      font-weight: bold; 
      flex: 1;
      margin-left: 15px;
    }
    .dashboard-button { 
      background: #10B981; 
      color: #ffffff; 
      text-decoration: none; 
      padding: 15px 30px; 
      border-radius: 8px; 
      display: inline-block; 
      font-weight: bold; 
      margin: 20px 0;
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
    .footer a { color: #10B981; text-decoration: none; }
  </style>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "EmailMessage",
    "about": {
      "@type": "ReviewAssignment",
      "name": "審稿任務",
      "description": "您有一個新的稿件需要審查：${data.submissionTitle}"
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
      <div class="greeting">親愛的 ${data.reviewerName} 審稿人，您好！</div>
      
      <div class="message">
        您有一篇新的稿件需要審查。以下是詳細資訊：
      </div>
      
      <div class="submission-box">
        <div class="submission-item">
          <span class="submission-label">稿件標題：</span>
          <span class="submission-value">${data.submissionTitle}</span>
        </div>
        <div class="submission-item">
          <span class="submission-label">稿件編號：</span>
          <span class="submission-value">${data.submissionId}</span>
        </div>
        <div class="submission-item">
          <span class="submission-label">截止日期：</span>
          <span class="submission-value">${dueDateText}</span>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="${data.dashboardUrl}" class="dashboard-button" style="color: white;">前往審稿系統</a>
      </div>
      
      <div class="message">
        <strong>審稿須知：</strong>
        <ul>
          <li>請在截止日期前完成審稿</li>
          <li>請客觀公正地評估稿件品質</li>
          <li>提供具體的修改建議以幫助作者改進</li>
          <li>如有利益衝突或其他問題，請及時聯繫編輯</li>
        </ul>
      </div>
      
      <div class="warning">
        <strong>重要提醒：</strong><br>
        • 審稿內容請保密，不得外洩<br>
        • 如無法在期限內完成，請提前通知編輯<br>
        • 請透過系統提交審稿意見，不要透過其他管道<br>
        • 如有技術問題，請聯繫系統管理員
      </div>
    </div>
    
    <div class="footer">
      <p>此郵件由 <a href="${data.appUrl}">${data.appName}</a> 自動發送，請勿回覆</p>
      <p>如有問題，請聯繫編輯團隊</p>
    </div>
  </div>
</body>
</html>`
  }

  private generateReviewerAssignmentEmailText(data: ReviewerAssignmentEmailData): string {
    const dueDateText = data.dueDate ? new Date(data.dueDate).toLocaleDateString('zh-TW') : '尚未指定'
    
    return `
${data.appName} - 新的審稿任務：${data.submissionTitle}

親愛的 ${data.reviewerName} 審稿人，您好！

您有一篇新的稿件需要審查。以下是詳細資訊：

稿件標題：${data.submissionTitle}
稿件編號：${data.submissionId}
截止日期：${dueDateText}

請前往審稿系統查看詳細內容：
${data.dashboardUrl}

審稿須知：
• 請在截止日期前完成審稿
• 請客觀公正地評估稿件品質
• 提供具體的修改建議以幫助作者改進
• 如有利益衝突或其他問題，請及時聯繫編輯

重要提醒：
• 審稿內容請保密，不得外洩
• 如無法在期限內完成，請提前通知編輯
• 請透過系統提交審稿意見，不要透過其他管道
• 如有技術問題，請聯繫系統管理員

此郵件由 ${data.appName} 自動發送，請勿回覆。
如有問題，請聯繫編輯團隊。

${data.appUrl}
`
  }

  private generateDecisionResultEmailHTML(data: DecisionResultEmailData): string {
    const decisionText = data.decision === 'ACCEPT' ? '接受' : 
                        data.decision === 'REJECT' ? '拒絕' : '需修改後重新提交'
    const decisionColor = data.decision === 'ACCEPT' ? '#10B981' : 
                         data.decision === 'REJECT' ? '#EF4444' : '#F59E0B'
    const bgColor = data.decision === 'ACCEPT' ? '#ECFDF5' : 
                   data.decision === 'REJECT' ? '#FEF2F2' : '#FFFBEB'
    
    return `
<!DOCTYPE html>
<html lang="zh-TW" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>稿件審查結果</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
    .email-wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: ${decisionColor}; padding: 40px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; }
    .content { padding: 40px 20px; }
    .greeting { font-size: 20px; color: #333333; margin-bottom: 20px; }
    .message { font-size: 16px; color: #666666; line-height: 1.6; margin-bottom: 30px; }
    .decision-box { 
      background: ${bgColor}; 
      border: 2px solid ${decisionColor}; 
      border-radius: 8px; 
      padding: 20px; 
      margin: 30px 0; 
      text-align: center;
    }
    .decision-result { 
      font-size: 24px; 
      font-weight: bold; 
      color: ${decisionColor}; 
      margin-bottom: 10px;
    }
    .submission-box { 
      background: #f8f9fa; 
      border: 1px solid #dee2e6; 
      border-radius: 8px; 
      padding: 20px; 
      margin: 20px 0; 
    }
    .submission-item { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      margin: 10px 0; 
      padding: 8px 0; 
      border-bottom: 1px solid #e9ecef;
    }
    .submission-item:last-child { border-bottom: none; }
    .submission-label { 
      font-weight: bold; 
      color: #333333; 
      min-width: 100px;
    }
    .submission-value { 
      color: #666666; 
      flex: 1;
      margin-left: 15px;
    }
    .note-box {
      background: #f8f9fa;
      border-left: 4px solid ${decisionColor};
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }
    .dashboard-button { 
      background: ${decisionColor}; 
      color: #ffffff; 
      text-decoration: none; 
      padding: 15px 30px; 
      border-radius: 8px; 
      display: inline-block; 
      font-weight: bold; 
      margin: 20px 0;
    }
    .footer { 
      background: #f8f9fa; 
      padding: 20px; 
      text-align: center; 
      color: #666666; 
      font-size: 12px; 
    }
    .footer a { color: ${decisionColor}; text-decoration: none; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h1>${data.appName}</h1>
    </div>
    
    <div class="content">
      <div class="greeting">親愛的 ${data.authorName} 作者，您好！</div>
      
      <div class="message">
        您的稿件審查結果已經出爐，詳細資訊如下：
      </div>
      
      <div class="decision-box">
        <div class="decision-result">審查結果：${decisionText}</div>
      </div>
      
      <div class="submission-box">
        <div class="submission-item">
          <span class="submission-label">稿件標題：</span>
          <span class="submission-value">${data.submissionTitle}</span>
        </div>
        <div class="submission-item">
          <span class="submission-label">稿件編號：</span>
          <span class="submission-value">${data.submissionId}</span>
        </div>
      </div>
      
      ${data.note ? `
      <div class="note-box">
        <strong>編輯意見：</strong><br>
        ${data.note.replace(/\n/g, '<br>')}
      </div>
      ` : ''}
      
      <div style="text-align: center;">
        <a href="${data.dashboardUrl}" class="dashboard-button" style="color: white;">查看完整結果</a>
      </div>
      
      <div class="message">
        ${data.decision === 'ACCEPT' ? 
          '恭喜您！您的稿件已被接受。請留意後續發表相關通知。' :
          data.decision === 'REJECT' ? 
          '很抱歉，您的稿件未能通過審查。感謝您對研討會的投稿。' :
          '請根據審查意見修改您的稿件，並重新提交。期待您的修改版本。'
        }
      </div>
    </div>
    
    <div class="footer">
      <p>此郵件由 <a href="${data.appUrl}">${data.appName}</a> 自動發送，請勿回覆</p>
      <p>如有問題，請聯繫編輯團隊</p>
    </div>
  </div>
</body>
</html>`
  }

  private generateDecisionResultEmailText(data: DecisionResultEmailData): string {
    const decisionText = data.decision === 'ACCEPT' ? '接受' : 
                        data.decision === 'REJECT' ? '拒絕' : '需修改後重新提交'
    
    return `${data.appName} - 稿件審查結果通知

親愛的 ${data.authorName} 作者，您好！

您的稿件審查結果已經出爐，詳細資訊如下：

════════════════════════════════════════
【審查結果】${decisionText}
════════════════════════════════════════

【稿件資訊】
稿件標題：${data.submissionTitle}
稿件編號：${data.submissionId}

${data.note ? `【編輯意見】
${data.note}

` : ''}【系統連結】
請前往系統查看完整結果：${data.dashboardUrl}

【後續說明】
${data.decision === 'ACCEPT' ? 
  '恭喜您！您的稿件已被接受。請留意後續發表相關通知。' :
  data.decision === 'REJECT' ? 
  '很抱歉，您的稿件未能通過審查。感謝您對研討會的投稿。' :
  '請根據審查意見修改您的稿件，並重新提交。期待您的修改版本。'
}

────────────────────────────────────────
此郵件由 ${data.appName} 自動發送，請勿回覆。
如有問題，請聯繫編輯團隊。

系統網址：${data.appUrl}`
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