import { ConfigService } from '@nestjs/config';
export declare class FcmService {
    private readonly configService;
    private readonly logger;
    private auth;
    private projectId;
    private isConfigured;
    constructor(configService: ConfigService);
    sendPushNotification(token: string, title: string, body: string, data?: Record<string, any>): Promise<boolean>;
    private sanitizeDataMap;
}
