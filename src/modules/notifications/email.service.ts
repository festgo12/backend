import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST') || 'smtp.mailtrap.io';
    const port = this.configService.get<number>('SMTP_PORT') || 2525;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure = this.configService.get<boolean>('SMTP_SECURE') || false;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    try {
      const from = this.configService.get<string>('SMTP_FROM') || '"P2N Marketplace" <no-reply@p2n.com>';
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Fallback text formatting
      });
      this.logger.log(`Email successfully sent to ${to} with subject "${subject}"`);
      return true;
    } catch (error: any) {
      this.logger.error(`Error sending email to ${to}: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Wraps inner HTML content in a P2N-branded email layout.
   */
  wrapEmailHtml(innerHtml: string, title?: string): string {
    const heading = title
      ? `<h1 style="margin:0 0 8px;font-size:22px;color:#1a1a1a;">${title}</h1>`
      : '';
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#E89E2D;padding:24px 32px;">
    <span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">P2N</span>
  </td></tr>
  <tr><td style="padding:32px;">
    ${heading}
    <div style="font-size:15px;line-height:1.6;color:#333333;">
      ${innerHtml}
    </div>
  </td></tr>
  <tr><td style="background:#fafafa;padding:20px 32px;border-top:1px solid #eeeeee;">
    <p style="margin:0;font-size:12px;color:#999999;text-align:center;">
      P2N Marketplace &mdash; Secure Peer-to-Peer Trading<br>
      If you did not request this email, you can safely ignore it.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  }

  /**
   * Simple template placeholder compiler interpolating {{key}} values in string templates.
   */
  renderTemplate(template: string, data: Record<string, any>): string {
    if (!template) return '';
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }
}
