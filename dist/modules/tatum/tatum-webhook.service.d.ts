import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
export declare class TatumWebhookService {
    private readonly configService;
    private readonly prisma;
    private readonly logger;
    private readonly hmacSecret;
    constructor(configService: ConfigService, prisma: PrismaService);
    verifySignature(payload: any, signature: string): boolean;
    markTransactionAsCompleted(txId: string): Promise<void>;
}
