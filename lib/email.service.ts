import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { formatDateLongInTimezone } from '@/lib/timezone-display';
import { getServerTimezone } from '@/lib/server-timezone-display';

/**
 * Email Service
 *
 * Handles sending emails via SMTP (Brevo/Sendinblue)
 */
export class EmailService {
  private transporter: Transporter;
  private isConfigured: boolean = false;

  constructor() {
    // Check if all required email configuration is present
    this.isConfigured = this.validateConfiguration();

    if (!this.isConfigured) {
      console.warn('[Email Service] WARNING: Email configuration is incomplete or missing.');
      console.warn('[Email Service] Required environment variables: MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_NAME, MAIL_FROM_ADDRESS');
      console.warn('[Email Service] Email sending will fail until configuration is provided.');
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });
  }

  /**
   * Validate that all required email configuration is present
   */
  private validateConfiguration(): boolean {
    const requiredVars = [
      'MAIL_HOST',
      'MAIL_USERNAME',
      'MAIL_PASSWORD',
      'MAIL_FROM_NAME',
      'MAIL_FROM_ADDRESS'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
      console.error('[Email Service] Missing required environment variables:', missing.join(', '));
      return false;
    }

    return true;
  }

  /**
   * Check if email service is properly configured
   */
  public isEmailConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Send an email
   * @throws Error if email configuration is missing or email fails to send
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    // Check if email is configured before attempting to send
    if (!this.isConfigured) {
      throw new Error(
        'Email service is not configured. Please set the required environment variables: MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM_NAME, MAIL_FROM_ADDRESS'
      );
    }

    try {
      const info = await this.transporter.sendMail({
        from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_ADDRESS}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log('[Email Service] Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('[Email Service] Failed to send email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const clientUrl = process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const html = this.getWelcomeEmailTemplate(name, clientUrl);

    return await this.sendEmail({
      to,
      subject: 'Welcome to Dollar Leads - Your Dollar Membership is Active! 🎉',
      html,
      text: `Welcome to Dollar Leads, ${name}! Please read the important onboarding information in this email. Log in at: ${clientUrl}/login`,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, name: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    const html = this.getPasswordResetEmailTemplate(name, resetUrl);
    return await this.sendEmail({
      to,
      subject: 'Reset Your Password - Dollar Leads',
      html,
      text: `Hi ${name}, reset your password by visiting: ${resetUrl}`,
    });
  }


  /**
   * Send 24 hours notice email
   */
  async send24HoursNoticeEmail(to: string): Promise<boolean> {

    const html = this.get24HoursNoticeEmailTemplate();

    return await this.sendEmail({
      to,
      subject: 'Your Leads Start Tomorrow at 8AM EST 🚀',
      html
    });
  }

    /**
   * Send live email
   */
  async sendLiveEmail(to: string): Promise<boolean> {

    const html = this.getLiveEmailTemplate();

    return await this.sendEmail({
      to,
      subject: 'Your Leads Are Now Live — Log In Now 🚀🔥',
      html
    });
  }

  /**
   * 24 hours notice email HTML template
   */
  private get24HoursNoticeEmailTemplate(): string {
    return `
     <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f4f4f4;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
      padding: 40px 30px;
      text-align: center;
      position: relative;
    }
    .mascot {
      width: 140px;
      height: 140px;
      margin: 0 auto 20px;
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    .header h1 {
      color: white;
      font-size: 36px;
      font-weight: 800;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
    }
    .header p {
      color: #fff3e0;
      font-size: 20px;
      font-weight: 600;
    }
    .header .countdown {
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid white;
      border-radius: 50px;
      padding: 15px 30px;
      margin: 20px auto 0;
      display: inline-block;
    }
    .countdown-text {
      color: white;
      font-size: 24px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 700;
      color: #ff6b35;
      margin-bottom: 20px;
    }
    .intro {
      font-size: 16px;
      color: #555;
      line-height: 1.8;
      margin-bottom: 30px;
    }
    .highlight {
      color: #ff6b35;
      font-weight: 600;
    }
    .alert-box {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border: 3px solid #ff6b35;
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
      text-align: center;
    }
    .alert-box h3 {
      color: #e65100;
      font-size: 28px;
      margin-bottom: 15px;
      font-weight: 800;
    }
    .alert-box .big-text {
      font-size: 20px;
      color: #e65100;
      font-weight: 700;
      margin: 15px 0;
    }
    .alert-box p {
      color: #e65100;
      font-size: 16px;
      line-height: 1.8;
      margin-bottom: 15px;
    }
    .checklist-box {
      background: #f1f8f4;
      border: 2px solid #3d9a50;
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
    }
    .checklist-box h4 {
      color: #2d7a3e;
      font-size: 22px;
      margin-bottom: 20px;
      text-align: center;
    }
    .checklist-item {
      display: flex;
      align-items: flex-start;
      margin: 15px 0;
      padding: 15px;
      background: white;
      border-radius: 8px;
      border-left: 4px solid #3d9a50;
    }
    .checklist-icon {
      font-size: 24px;
      margin-right: 15px;
      min-width: 30px;
    }
    .checklist-content {
      flex: 1;
    }
    .checklist-title {
      color: #2d7a3e;
      font-weight: 700;
      font-size: 16px;
      margin-bottom: 5px;
    }
    .checklist-desc {
      color: #666;
      font-size: 14px;
      line-height: 1.6;
    }
    .info-box {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
      padding: 20px;
      margin: 30px 0;
      border-radius: 8px;
    }
    .info-box h4 {
      color: #1565c0;
      font-size: 18px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .info-box p {
      color: #555;
      font-size: 15px;
      line-height: 1.8;
      margin-bottom: 10px;
    }
    .info-box ul {
      margin: 15px 0;
      padding-left: 20px;
    }
    .info-box li {
      color: #555;
      font-size: 15px;
      line-height: 1.8;
      margin-bottom: 8px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
      color: white !important;
      text-decoration: none;
      padding: 18px 40px;
      border-radius: 50px;
      font-size: 18px;
      font-weight: 700;
      margin: 30px 0;
      box-shadow: 0 6px 20px rgba(255, 107, 53, 0.4);
      transition: all 0.3s ease;
      text-align: center;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(255, 107, 53, 0.5);
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e0e0e0;
    }
    .footer-text {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }
    .footer-links {
      font-size: 12px;
      color: #999;
      margin-top: 15px;
    }
    @media (max-width: 600px) {
      .header h1 {
        font-size: 28px;
      }
      .mascot {
        width: 120px;
        height: 120px;
      }
      .content {
        padding: 30px 20px;
      }
      .cta-button {
        padding: 16px 30px;
        font-size: 16px;
      }
      .countdown-text {
        font-size: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://dollar-deal-club-v2.vercel.app/login-logo-img.png" alt="Dollar Leads Mascot" class="mascot">
      <h1>Your Leads Start Tomorrow! 🚀</h1>
      <p>8AM EST - Get Ready</p>
      <div class="countdown">
        <div class="countdown-text">⏰ 24 Hours</div>
      </div>
    </div>

    <div class="content">
      <div class="greeting">Hey there,</div>

      <p class="intro">
        Quick reminder — your Dollar Leads officially start tomorrow morning.
      </p>

      <div class="alert-box">
        <h3>Beginning tomorrow at:</h3>
        <div class="big-text" style="font-size: 32px; color: #e65100; font-weight: 800; margin: 20px 0;">
          ➡️ 8:00 AM EST
        </div>
        <p>
          your first batch of daily leads will drop directly into your Dollar Leads portal.
        </p>
      </div>

      <div class="checklist-box">
        <h4>✔️ What You Need to Do</h4>

        <div class="checklist-item">
          <div class="checklist-content">
            <p style="color: #555; font-size: 16px; line-height: 1.8; margin: 0;">
              Just log into your dashboard tomorrow after 8AM EST and your leads will be ready for you.
            </p>
          </div>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="https://dollar-deal-club-v2.vercel.app/login" class="cta-button">
          👉 Log Into Your Dashboard
        </a>
      </div>

      <div class="checklist-box">
        <h4>✔️ What to Expect Tomorrow</h4>

        <div class="checklist-item">
          <div class="checklist-icon">✓</div>
          <div class="checklist-content">
            <div class="checklist-desc">Qualified, exclusive motivated seller leads</div>
          </div>
        </div>

        <div class="checklist-item">
          <div class="checklist-icon">✓</div>
          <div class="checklist-content">
            <div class="checklist-desc">No duplicates, no sold properties</div>
          </div>
        </div>

        <div class="checklist-item">
          <div class="checklist-icon">✓</div>
          <div class="checklist-content">
            <div class="checklist-desc">Daily delivery at 8AM EST</div>
          </div>
        </div>

        <div class="checklist-item">
          <div class="checklist-icon">✓</div>
          <div class="checklist-content">
            <div class="checklist-desc">MP3 call recordings (Diamond Club only)</div>
          </div>
        </div>

        <div class="checklist-item">
          <div class="checklist-icon">✓</div>
          <div class="checklist-content">
            <div class="checklist-desc">Your dashboard will auto-refresh with new leads each day</div>
          </div>
        </div>
      </div>

      <p class="intro" style="text-align: center; font-size: 16px; line-height: 1.8;">
        Your leads will come in automatically — you don't need to push anything or request anything.
      </p>

      <p class="intro">
        We're excited for you to start working your leads and getting deals.
      </p>

      <p class="intro">
        If you need support, we're always here for you: <a href="mailto:support@dollarleads.com" style="color: #ff6b35; font-weight: 600;">support@dollarleads.com</a>
      </p>

      <p class="intro" style="text-align: center; font-size: 18px; color: #ff6b35; font-weight: 700;">
        Tomorrow's a big day — let's get you your next wholesale deal.
      </p>

      <p class="intro" style="text-align: center; font-size: 16px; color: #666; margin-top: 30px;">
        — Max & Zach
      </p>

    </div>

    <div class="footer">
      <p class="footer-text">
        Questions? Email us at <a href="mailto:support@dollarleads.com" style="color: #3d9a50;">support@dollarleads.com</a>
      </p>
      <p class="footer-links">
        © ${new Date().getFullYear()} Dollar Leads. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

    /**
   * 24 hours notice email HTML template
   */
  private getLiveEmailTemplate(): string {
    return `
    <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f4f4f4;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #2d7a3e 0%, #3d9a50 100%);
      padding: 40px 30px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: "🎉";
      position: absolute;
      font-size: 100px;
      opacity: 0.1;
      top: -20px;
      left: -20px;
      animation: float 3s ease-in-out infinite;
    }
    .header::after {
      content: "🚀";
      position: absolute;
      font-size: 100px;
      opacity: 0.1;
      bottom: -20px;
      right: -20px;
      animation: float 3s ease-in-out infinite reverse;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(10deg); }
    }
    .mascot {
      width: 160px;
      height: 160px;
      margin: 0 auto 20px;
      animation: celebrate 0.5s ease-in-out infinite alternate;
    }
    @keyframes celebrate {
      0% { transform: scale(1) rotate(-5deg); }
      100% { transform: scale(1.1) rotate(5deg); }
    }
    .header h1 {
      color: white;
      font-size: 42px;
      font-weight: 800;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
      position: relative;
      z-index: 1;
    }
    .header p {
      color: #e8f5e9;
      font-size: 22px;
      font-weight: 600;
      position: relative;
      z-index: 1;
    }
    .header .live-badge {
      background: #ff4444;
      color: white;
      padding: 10px 25px;
      border-radius: 50px;
      font-size: 16px;
      font-weight: 800;
      margin: 20px auto 0;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 2px;
      animation: blink 1.5s ease-in-out infinite;
      box-shadow: 0 4px 15px rgba(255, 68, 68, 0.5);
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 28px;
      font-weight: 700;
      color: #2d7a3e;
      margin-bottom: 20px;
      text-align: center;
    }
    .intro {
      font-size: 16px;
      color: #555;
      line-height: 1.8;
      margin-bottom: 30px;
    }
    .highlight {
      color: #3d9a50;
      font-weight: 600;
    }
    .live-box {
      background: linear-gradient(135deg, #f1f8f4 0%, #e8f5e9 100%);
      border: 3px solid #3d9a50;
      border-radius: 12px;
      padding: 35px;
      margin: 30px 0;
      text-align: center;
      box-shadow: 0 6px 20px rgba(61, 154, 80, 0.2);
    }
    .live-box h3 {
      color: #2d7a3e;
      font-size: 26px;
      margin-bottom: 20px;
      font-weight: 800;
    }
    .live-box .big-text {
      font-size: 22px;
      color: #2d7a3e;
      font-weight: 700;
      margin: 15px 0;
      line-height: 1.6;
    }
    .live-box p {
      color: #555;
      font-size: 16px;
      line-height: 1.8;
      margin-bottom: 15px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 30px 0;
    }
    .stat-card {
      background: white;
      border: 2px solid #3d9a50;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .stat-number {
      font-size: 36px;
      font-weight: 800;
      color: #3d9a50;
      margin-bottom: 5px;
    }
    .stat-label {
      font-size: 14px;
      color: #666;
      font-weight: 600;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #3d9a50 0%, #2d7a3e 100%);
      color: white !important;
      text-decoration: none;
      padding: 20px 50px;
      border-radius: 50px;
      font-size: 20px;
      font-weight: 700;
      margin: 30px 0;
      box-shadow: 0 6px 20px rgba(61, 154, 80, 0.4);
      transition: all 0.3s ease;
      text-align: center;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(61, 154, 80, 0.5);
    }
    .tips-section {
      background: #fff3e0;
      border-left: 4px solid #ff9800;
      padding: 25px;
      margin: 30px 0;
      border-radius: 8px;
    }
    .tips-section h4 {
      color: #e65100;
      font-size: 20px;
      margin-bottom: 15px;
    }
    .tip-item {
      margin: 12px 0;
      padding-left: 25px;
      position: relative;
      color: #555;
      font-size: 15px;
      line-height: 1.8;
    }
    .tip-item:before {
      content: "💡";
      position: absolute;
      left: 0;
      font-size: 18px;
    }
    .important-box {
      background: #e3f2fd;
      border: 2px solid #2196f3;
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
    }
    .important-box h4 {
      color: #1565c0;
      font-size: 20px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .important-box p {
      color: #555;
      font-size: 15px;
      line-height: 1.8;
      margin-bottom: 12px;
    }
    .important-box ul {
      margin: 15px 0;
      padding-left: 20px;
    }
    .important-box li {
      color: #555;
      font-size: 15px;
      line-height: 1.8;
      margin-bottom: 10px;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e0e0e0;
    }
    .footer-text {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }
    .footer-links {
      font-size: 12px;
      color: #999;
      margin-top: 15px;
    }
    @media (max-width: 600px) {
      .header h1 {
        font-size: 32px;
      }
      .mascot {
        width: 130px;
        height: 130px;
      }
      .content {
        padding: 30px 20px;
      }
      .cta-button {
        padding: 18px 35px;
        font-size: 18px;
      }
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://dollar-deal-club-v2.vercel.app/login-logo-img.png" alt="Dollar Leads Mascot" class="mascot">
      <h1>Your Leads Are Now Live! 🚀🔥</h1>
      <p>Log In Now</p>
      <div class="live-badge">🔴 LIVE NOW</div>
    </div>

    <div class="content">
      <div class="greeting">Good morning!</div>

      <p class="intro" style="text-align: center; font-size: 18px; font-weight: 700; color: #2d7a3e;">
        Your Dollar Leads are officially LIVE and ready for you to claim.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
          ➡️ Log in now and grab today's leads:
        </p>
        <a href="https://dollar-deal-club-v2.vercel.app/login" class="cta-button">
          🚀 Log In Now
        </a>
      </div>

      <p class="intro" style="text-align: center;">
        Your first batch of daily leads has just been delivered to your portal. From today forward, your leads will drop every morning at <strong>8AM EST</strong>, automatically.
      </p>

      <div class="live-box">
        <h3>✔️ What's Included Today</h3>

        <div style="text-align: left; margin: 20px auto; max-width: 400px;">
          <div style="margin: 12px 0; padding-left: 25px; position: relative; color: #555; font-size: 16px; line-height: 1.8;">
            <span style="position: absolute; left: 0; color: #3d9a50; font-weight: bold;">✓</span>
            Fresh motivated seller leads
          </div>
          <div style="margin: 12px 0; padding-left: 25px; position: relative; color: #555; font-size: 16px; line-height: 1.8;">
            <span style="position: absolute; left: 0; color: #3d9a50; font-weight: bold;">✓</span>
            Exclusive to you — never resold
          </div>
          <div style="margin: 12px 0; padding-left: 25px; position: relative; color: #555; font-size: 16px; line-height: 1.8;">
            <span style="position: absolute; left: 0; color: #3d9a50; font-weight: bold;">✓</span>
            No duplicates or sold properties
          </div>
          <div style="margin: 12px 0; padding-left: 25px; position: relative; color: #555; font-size: 16px; line-height: 1.8;">
            <span style="position: absolute; left: 0; color: #3d9a50; font-weight: bold;">✓</span>
            (Diamond Club) MP3 call recordings included
          </div>
          <div style="margin: 12px 0; padding-left: 25px; position: relative; color: #555; font-size: 16px; line-height: 1.8;">
            <span style="position: absolute; left: 0; color: #3d9a50; font-weight: bold;">✓</span>
            Delivered directly into your portal
          </div>
        </div>
      </div>

      <div class="tips-section">
        <h4>✔️ Quick Tip</h4>
        <p style="color: #555; font-size: 16px; line-height: 1.8; margin: 0;">
          The fastest deals come from speed. Call the warm and hot leads TODAY while they're still in a selling mindset.
        </p>
      </div>

      <div class="important-box">
        <h4>💼 Need Help Dispo'ing Your Deals?</h4>
        <p>
          If you get a property under contract and don't have buyers in that market, submit the deal to: <a href="https://maxdispo.com" style="color: #2196f3; font-weight: 600;">MaxDispo.com</a>
        </p>
        <p>
          Our dispo team can help you sell it so you can focus on locking up more deals.
        </p>
      </div>

      <p class="intro">
        We're pumped to have you on board. Go crush it — and message us when you get your first contract from Dollar Leads.
      </p>

      <p class="intro">
        If you need anything at all, email us anytime: <a href="mailto:support@dollarleads.com" style="color: #3d9a50; font-weight: 600;">support@dollarleads.com</a>
      </p>

      <p class="intro" style="text-align: center; font-size: 16px; color: #666; margin-top: 40px;">
        — Max & Zach
      </p>

    </div>

    <div class="footer">
      <p class="footer-text">
        Need help? We're here for you: <a href="mailto:support@dollarleads.com" style="color: #3d9a50;">support@dollarleads.com</a>
      </p>
      <p class="footer-links">
        © ${new Date().getFullYear()} Dollar Leads. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
     `;
  }

  /**
   * Welcome email HTML template
   */
  private getWelcomeEmailTemplate(name: string, clientUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f4f4f4;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #2d7a3e 0%, #3d9a50 100%);
      padding: 40px 30px;
      text-align: center;
      position: relative;
    }
    .mascot {
      width: 120px;
      height: 120px;
      margin: 0 auto 20px;
      animation: wave 2s ease-in-out infinite;
    }
    @keyframes wave {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-5deg); }
      75% { transform: rotate(5deg); }
    }
    .header h1 {
      color: white;
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
    }
    .header p {
      color: #e8f5e9;
      font-size: 18px;
      font-weight: 500;
    }
    .header .please-read {
      color: #ffeb3b;
      font-size: 22px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 10px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 700;
      color: #2d7a3e;
      margin-bottom: 20px;
    }
    .intro {
      font-size: 16px;
      color: #555;
      line-height: 1.8;
      margin-bottom: 30px;
    }
    .highlight {
      color: #3d9a50;
      font-weight: 600;
    }
    .alert-box {
      background: #fff3cd;
      border: 2px solid #ffc107;
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
    }
    .alert-box h3 {
      color: #856404;
      font-size: 20px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .alert-box p {
      color: #856404;
      font-size: 16px;
      line-height: 1.8;
      margin-bottom: 15px;
    }
    .alert-box ul {
      margin: 15px 0;
      padding-left: 20px;
    }
    .alert-box li {
      color: #856404;
      font-size: 15px;
      line-height: 1.8;
      margin-bottom: 8px;
    }
    .alert-box strong {
      font-weight: 700;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #3d9a50 0%, #2d7a3e 100%);
      color: white !important;
      text-decoration: none;
      padding: 18px 40px;
      border-radius: 50px;
      font-size: 18px;
      font-weight: 700;
      margin: 30px 0;
      box-shadow: 0 6px 20px rgba(61, 154, 80, 0.4);
      transition: all 0.3s ease;
      text-align: center;
    }
    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(61, 154, 80, 0.5);
    }
    .quote-section {
      background: #fafafa;
      border-left: 4px solid #3d9a50;
      padding: 20px;
      margin: 30px 0;
      border-radius: 8px;
    }
    .quote-text {
      font-size: 16px;
      color: #555;
      font-style: italic;
      margin-bottom: 15px;
      line-height: 1.8;
    }
    .quote-authors {
      font-size: 14px;
      color: #2d7a3e;
      font-weight: 600;
    }
    .quote-title {
      font-size: 12px;
      color: #666;
    }
    .support-box {
      background: linear-gradient(135deg, #f1f8f4 0%, #e8f5e9 100%);
      border: 2px solid #3d9a50;
      border-radius: 12px;
      padding: 25px;
      margin: 30px 0;
      text-align: center;
    }
    .support-box h3 {
      color: #2d7a3e;
      font-size: 20px;
      margin-bottom: 10px;
    }
    .support-box p {
      color: #555;
      font-size: 16px;
      margin-bottom: 10px;
    }
    .support-box a {
      color: #3d9a50;
      font-weight: 600;
      text-decoration: none;
    }
    .support-box a:hover {
      text-decoration: underline;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e0e0e0;
    }
    .footer-text {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }
    .footer-links {
      font-size: 12px;
      color: #999;
      margin-top: 15px;
    }
    @media (max-width: 600px) {
      .header h1 {
        font-size: 24px;
      }
      .mascot {
        width: 100px;
        height: 100px;
      }
      .content {
        padding: 30px 20px;
      }
      .cta-button {
        padding: 16px 30px;
        font-size: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://dollar-deal-club-v2.vercel.app/login-logo-img.png" alt="Dollar Leads Mascot" class="mascot">
      <h1>Welcome to Dollar Leads! 🎉</h1>
      <p class="please-read">(PLEASE READ)</p>
    </div>

    <div class="content">
      <div class="greeting">Hey ${name} 👋</div>

      <p class="intro">
        Welcome to <span class="highlight">Dollar Leads</span> — where wholesalers get exclusive motivated-seller leads for less than $1. 🎉 You're now part of a movement that's changing the wholesaling game forever.
      </p>

      <div class="alert-box">
        <h3>🚨 Important: Onboarding Time (Please Read)</h3>
        <p>
          Because of extremely high demand, there is currently a <strong>5-7 business day onboarding period</strong> before your leads begin delivering.
        </p>
        <p><strong>Here's exactly what that means:</strong></p>
        <ul>
          <li>You can log into your portal right now.</li>
          <li>Your dashboard will show zero leads until we finish onboarding your account.</li>
          <li>Your next billing doesn't hit until 30 days after you start receiving leads.</li>
          <li>We will email you 24 hours before we activate your leads so you're fully prepared.</li>
          <li>You don't need to do anything else — we're handling everything on our end.</li>
        </ul>
        <p>
          <strong>Please don't panic if you see no leads yet</strong> — nothing is wrong. Your account is simply waiting in the onboarding queue with our call centers.
        </p>
      </div>

      <div style="text-align: center;">
        <a href="${clientUrl}/login" class="cta-button">
          👉 Log Into Your Portal
        </a>
      </div>

      <div class="quote-section">
        <h3 style="color: #2d7a3e; font-size: 20px; margin-bottom: 15px;">💚 Welcome to the Family</h3>
        <p style="color: #555; font-size: 16px; line-height: 1.8; margin-bottom: 15px;">
          Whether Dollar Leads helps you get your first deal or your 100th, we built this to make wholesaling accessible for everyone.
        </p>
        <p class="quote-text">
          "Every wholesaler deserves affordable, high-quality leads. Welcome to the family."
        </p>
        <div class="quote-authors">— Maximilien Dier & Zach Ginn</div>
        <div class="quote-title">Co-Founders, Dollar Leads</div>
      </div>

      <div class="support-box">
        <h3>📩 Need Help?</h3>
        <p>Our support team is here for you:</p>
        <p><a href="mailto:support@dollarleads.com">support@dollarleads.com</a></p>
      </div>

    </div>

    <div class="footer">
      <p class="footer-links">
        © ${new Date().getFullYear()} Dollar Leads. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Password reset email HTML template
   */
  private getPasswordResetEmailTemplate(name: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #ef4444; padding: 40px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Reset Your Password</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Hi <strong>${name}</strong>,
                      </p>

                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                        We received a request to reset your password for your Dollar Leads account. Click the button below to create a new password.
                      </p>

                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${resetUrl}" style="background-color: #ef4444; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                        If the button doesn't work, copy and paste this link into your browser:
                      </p>
                      <p style="color: #ef4444; font-size: 14px; word-break: break-all;">
                        ${resetUrl}
                      </p>

                      <p style="color: #333333; font-size: 14px; line-height: 1.6; margin-top: 30px; background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
                        <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
                      </p>

                      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
                        If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Dollar Leads. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  /**
   * Send subscription confirmation email
   */
  async sendSubscriptionConfirmation(
    to: string,
    name: string,
    planName: string,
    nextBillingDate: Date
  ): Promise<boolean> {
    const timezone = await getServerTimezone();
    const html = await this.getSubscriptionConfirmationTemplate(name, planName, nextBillingDate, timezone);
    const planDisplay = planName === 'diamond-lead' ? 'Diamond Lead Club' : 'Dollar Lead Club';

    return await this.sendEmail({
      to,
      subject: `Welcome to ${planDisplay}!`,
      html,
      text: `Hi ${name}, your subscription to ${planDisplay} is now active!`,
    });
  }

  /**
   * Send payment succeeded email
   */
  async sendPaymentSucceeded(
    to: string,
    name: string,
    planName: string,
    amount: number,
    nextBillingDate: Date
  ): Promise<boolean> {
    const timezone = await getServerTimezone();
    const html = await this.getPaymentSucceededTemplate(name, planName, amount, nextBillingDate, timezone);
    const planDisplay = planName === 'diamond-lead' ? 'Diamond Lead Club' : 'Dollar Lead Club';

    return await this.sendEmail({
      to,
      subject: `Payment Confirmed - ${planDisplay}`,
      html,
      text: `Hi ${name}, your payment of $${amount} for ${planDisplay} was successful.`,
    });
  }

  /**
   * Send payment failed email
   */
  async sendPaymentFailed(
    to: string,
    name: string,
    planName: string,
    amount: number,
    attemptCount: number
  ): Promise<boolean> {
    const html = this.getPaymentFailedTemplate(name, planName, amount, attemptCount);
    const planDisplay = planName === 'diamond-lead' ? 'Diamond Lead Club' : 'Dollar Lead Club';

    return await this.sendEmail({
      to,
      subject: `Payment Failed - ${planDisplay}`,
      html,
      text: `Hi ${name}, we couldn't process your payment of $${amount}. Please update your payment method.`,
    });
  }

  /**
   * Send subscription upgraded email
   */
  async sendSubscriptionUpgraded(
    to: string,
    name: string,
    oldPlan: string,
    newPlan: string,
    nextBillingDate: Date
  ): Promise<boolean> {
    const timezone = await getServerTimezone();
    const html = await this.getSubscriptionUpgradedTemplate(name, oldPlan, newPlan, nextBillingDate, timezone);
    const newPlanDisplay = newPlan === 'diamond-lead' ? 'Diamond Lead Club' : 'Dollar Lead Club';

    return await this.sendEmail({
      to,
      subject: `Subscription Upgraded to ${newPlanDisplay}!`,
      html,
      text: `Hi ${name}, your subscription has been upgraded to ${newPlanDisplay}!`,
    });
  }

  /**
   * Send subscription downgraded email
   */
  async sendSubscriptionDowngraded(
    to: string,
    name: string,
    oldPlan: string,
    newPlan: string,
    effectiveDate: Date
  ): Promise<boolean> {
    const timezone = await getServerTimezone();
    const html = await this.getSubscriptionDowngradedTemplate(name, oldPlan, newPlan, effectiveDate, timezone);
    const newPlanDisplay = newPlan === 'diamond-lead' ? 'Diamond Lead Club' : 'Dollar Lead Club';
    const formattedDate = formatDateLongInTimezone(effectiveDate, timezone);

    return await this.sendEmail({
      to,
      subject: 'Subscription Change Scheduled',
      html,
      text: `Hi ${name}, your subscription will change to ${newPlanDisplay} on ${formattedDate}.`,
    });
  }

  /**
   * Send subscription canceled email
   */
  async sendSubscriptionCanceled(
    to: string,
    name: string,
    planName: string,
    accessUntil: Date
  ): Promise<boolean> {
    const timezone = await getServerTimezone();
    const html = await this.getSubscriptionCanceledTemplate(name, planName, accessUntil, timezone);
    const planDisplay = planName === 'diamond-lead' ? 'Diamond Lead Club' : 'Dollar Lead Club';
    const formattedDate = formatDateLongInTimezone(accessUntil, timezone);

    return await this.sendEmail({
      to,
      subject: 'Subscription Canceled',
      html,
      text: `Hi ${name}, your ${planDisplay} subscription has been canceled. You'll have access until ${formattedDate}.`,
    });
  }

  /**
   * Send subscription ended email
   */
  async sendSubscriptionEnded(to: string, name: string, planName: string): Promise<boolean> {
    const html = this.getSubscriptionEndedTemplate(name, planName);
    const planDisplay = planName === 'diamond-lead' ? 'Diamond Lead Club' : 'Dollar Lead Club';

    return await this.sendEmail({
      to,
      subject: `${planDisplay} Subscription Ended`,
      html,
      text: `Hi ${name}, your ${planDisplay} subscription has ended.`,
    });
  }

  /**
   * Subscription confirmation email template
   */
  private async getSubscriptionConfirmationTemplate(
    name: string,
    planName: string,
    nextBillingDate: Date,
    timezone: string
  ): Promise<string> {
    const planDisplay = planName === 'diamond-lead' ? 'Diamond Lead Club (DLC+)' : 'Dollar Lead Club (DLC)';
    const features = planName === 'diamond-lead'
      ? ['280 warm leads per month', '10 Dollar Leads daily', '56 hot leads per month', '2 Diamond Leads daily', 'MP3 Call Recordings', 'Priority Support']
      : ['100 warm leads per month', '5 Dollar Leads every weekday', 'Qualified leads only'];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Confirmed</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background-color: #10b981; padding: 40px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Welcome to ${planDisplay}!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Hi <strong>${name}</strong>,
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                        Your subscription is now active! Here's what you get:
                      </p>
                      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; border-left: 4px solid #10b981; margin-bottom: 30px;">
                        ${features.map(f => `<p style="color: #166534; margin: 8px 0; font-size: 14px;">✓ ${f}</p>`).join('')}
                      </div>
                      <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                        <strong>Next billing date:</strong> ${formatDateLongInTimezone(nextBillingDate, timezone)}
                      </p>
                      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
                        You can manage your subscription anytime from your dashboard.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Dollar Leads. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  /**
   * Payment succeeded email template
   */
  private async getPaymentSucceededTemplate(
    name: string,
    planName: string,
    amount: number,
    nextBillingDate: Date,
    timezone: string
  ): Promise<string> {
    const planDisplay = planName === 'diamond-lead' ? 'Diamond Lead Club (DLC+)' : 'Dollar Lead Club (DLC)';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Confirmed</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background-color: #10b981; padding: 40px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Payment Received</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Hi <strong>${name}</strong>,
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                        Thank you! Your payment has been processed successfully.
                      </p>
                      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; margin-bottom: 30px;">
                        <p style="color: #166534; margin: 8px 0; font-size: 14px;"><strong>Plan:</strong> ${planDisplay}</p>
                        <p style="color: #166534; margin: 8px 0; font-size: 14px;"><strong>Amount:</strong> $${amount.toFixed(2)}</p>
                        <p style="color: #166534; margin: 8px 0; font-size: 14px;"><strong>Next billing:</strong> ${formatDateLongInTimezone(nextBillingDate, timezone)}</p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Dollar Leads. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  /**
   * Payment failed email template
   */
  private getPaymentFailedTemplate(
    name: string,
    planName: string,
    amount: number,
    attemptCount: number
  ): string {
    const planDisplay = planName === 'diamond-lead' ? 'Diamond Lead Club (DLC+)' : 'Dollar Lead Club (DLC)';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Failed</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background-color: #ef4444; padding: 40px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Payment Failed</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Hi <strong>${name}</strong>,
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                        We were unable to process your payment for ${planDisplay}.
                      </p>
                      <div style="background-color: #fee2e2; padding: 20px; border-radius: 6px; border-left: 4px solid #ef4444; margin-bottom: 30px;">
                        <p style="color: #991b1b; margin: 8px 0; font-size: 14px;"><strong>Amount:</strong> $${amount.toFixed(2)}</p>
                        <p style="color: #991b1b; margin: 8px 0; font-size: 14px;"><strong>Attempt:</strong> ${attemptCount}</p>
                      </div>
                      <p style="color: #333333; font-size: 14px; line-height: 1.6;">
                        Please update your payment method to continue your subscription. Visit your account dashboard to update your payment details.
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${process.env.NEXTAUTH_URL}/dashboard/pricing" style="background-color: #ef4444; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                              Update Payment Method
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Dollar Leads. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  /**
   * Subscription upgraded email template
   */
  private async getSubscriptionUpgradedTemplate(
    name: string,
    oldPlan: string,
    newPlan: string,
    nextBillingDate: Date,
    timezone: string
  ): Promise<string> {
    const oldPlanDisplay = oldPlan === 'diamond-lead' ? 'Diamond Lead Club' : 'Dollar Lead Club';
    const newPlanDisplay = newPlan === 'diamond-lead' ? 'Diamond Lead Club' : 'Dollar Lead Club';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Upgraded</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background-color: #8b5cf6; padding: 40px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🚀 Subscription Upgraded!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Hi <strong>${name}</strong>,
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                        Great news! Your subscription has been upgraded from ${oldPlanDisplay} to ${newPlanDisplay}. Your new features are active immediately!
                      </p>
                      <div style="background-color: #f5f3ff; padding: 20px; border-radius: 6px; border-left: 4px solid #8b5cf6; margin-bottom: 30px;">
                        <p style="color: #5b21b6; margin: 8px 0; font-size: 14px;">You've been charged a prorated amount for the remainder of your billing period.</p>
                        <p style="color: #5b21b6; margin: 8px 0; font-size: 14px;"><strong>Next billing:</strong> ${formatDateLongInTimezone(nextBillingDate, timezone)}</p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Dollar Leads. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  /**
   * Subscription downgraded email template
   */
  private async getSubscriptionDowngradedTemplate(
    name: string,
    oldPlan: string,
    newPlan: string,
    effectiveDate: Date,
    timezone: string
  ): Promise<string> {
    const oldPlanDisplay = oldPlan === 'diamond-lead' ? 'Diamond Lead Club' : 'Dollar Lead Club';
    const newPlanDisplay = newPlan === 'diamond-lead' ? 'Diamond Lead Club' : 'Dollar Lead Club';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Change Scheduled</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background-color: #f97316; padding: 40px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Subscription Change Scheduled</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Hi <strong>${name}</strong>,
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                        We've scheduled your subscription change from ${oldPlanDisplay} to ${newPlanDisplay}.
                      </p>
                      <div style="background-color: #fff7ed; padding: 20px; border-radius: 6px; border-left: 4px solid #f97316; margin-bottom: 30px;">
                        <p style="color: #9a3412; margin: 8px 0; font-size: 14px;"><strong>Current plan:</strong> ${oldPlanDisplay}</p>
                        <p style="color: #9a3412; margin: 8px 0; font-size: 14px;"><strong>New plan:</strong> ${newPlanDisplay}</p>
                        <p style="color: #9a3412; margin: 8px 0; font-size: 14px;"><strong>Effective date:</strong> ${formatDateLongInTimezone(effectiveDate, timezone)}</p>
                      </div>
                      <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                        You'll continue to have access to your current plan features until ${formatDateLongInTimezone(effectiveDate, timezone)}.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Dollar Leads. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  /**
   * Subscription canceled email template
   */
  private async getSubscriptionCanceledTemplate(
    name: string,
    planName: string,
    accessUntil: Date,
    timezone: string
  ): Promise<string> {
    const planDisplay = planName === 'diamond-lead' ? 'Diamond Lead Club' : 'Dollar Lead Club';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Canceled</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background-color: #6b7280; padding: 40px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Subscription Canceled</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Hi <strong>${name}</strong>,
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                        We're sorry to see you go! Your ${planDisplay} subscription has been canceled.
                      </p>
                      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; border-left: 4px solid #6b7280; margin-bottom: 30px;">
                        <p style="color: #374151; margin: 8px 0; font-size: 14px;">You'll continue to have access to your subscription until:</p>
                        <p style="color: #374151; margin: 8px 0; font-size: 16px; font-weight: bold;">${formatDateLongInTimezone(accessUntil, timezone)}</p>
                      </div>
                      <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                        Changed your mind? You can reactivate your subscription anytime from your dashboard.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Dollar Leads. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  /**
   * Subscription ended email template
   */
  private getSubscriptionEndedTemplate(name: string, planName: string): string {
    const planDisplay = planName === 'diamond-lead' ? 'Diamond Lead Club' : 'Dollar Lead Club';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Ended</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background-color: #6b7280; padding: 40px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Subscription Ended</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Hi <strong>${name}</strong>,
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                        Your ${planDisplay} subscription has ended. We hope you enjoyed the service!
                      </p>
                      <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                        Ready to come back? Resubscribe anytime from your dashboard.
                      </p>
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${process.env.NEXTAUTH_URL}/dashboard/pricing" style="background-color: #0ea5e9; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                              Resubscribe Now
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Dollar Leads. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }
}

// Export singleton instance
export const emailService = new EmailService();
