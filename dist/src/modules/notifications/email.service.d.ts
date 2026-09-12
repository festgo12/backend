import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private readonly configService;
    private readonly logger;
    private transporter;
    constructor(configService: ConfigService);
    sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean>;
    wrapEmailHtml(innerHtml: string, title?: string): string;
    renderTemplate(template: string, data: Record<string, any>): string;
}
