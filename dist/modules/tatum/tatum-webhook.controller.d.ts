import { TatumWebhookService } from './tatum-webhook.service';
import { TatumDepositService } from './tatum-deposit.service';
import { PrismaService } from '../../core/database/prisma.service';
export declare class TatumWebhookController {
    private readonly webhookService;
    private readonly depositService;
    private readonly prisma;
    private readonly logger;
    constructor(webhookService: TatumWebhookService, depositService: TatumDepositService, prisma: PrismaService);
    handleWebhook(payload: any, signature: string): Promise<{
        received: boolean;
    }>;
    simulateTestnetDeposit(currency: string, amount: string, address?: string): Promise<{
        success: boolean;
        message: string;
        txId: string;
        walletId: any;
        userId: any;
    }>;
    private handleConfirmation;
}
