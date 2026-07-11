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
   * Simple template placeholder compiler interpolating {{key}} values in string templates.
   */
  renderTemplate(template: string, data: Record<string, any>): string {
    if (!template) return '';
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }
}
