import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
export declare class TatumWebhookService {
    private readonly configService;
    private readonly prisma;
    private readonly walletService;
    private readonly logger;
    private readonly hmacSecret;
    constructor(configService: ConfigService, prisma: PrismaService, walletService: WalletService);
    verifySignature(payload: any, signature: string): boolean;
    markTransactionAsCompleted(txId: string): Promise<void>;
}
