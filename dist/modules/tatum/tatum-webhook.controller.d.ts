import { TatumWebhookService } from './tatum-webhook.service';
import { TatumDepositService } from './tatum-deposit.service';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
export declare class TatumWebhookController {
    private readonly webhookService;
    private readonly depositService;
    private readonly walletService;
    private readonly prisma;
    private readonly logger;
    private readonly CONFIRMATION_THRESHOLDS;
    constructor(webhookService: TatumWebhookService, depositService: TatumDepositService, walletService: WalletService, prisma: PrismaService);
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
    private handleIncomingDeposit;
    private handleConfirmation;
    private handleOutgoingSuccess;
    private handleOutgoingFailed;
}
