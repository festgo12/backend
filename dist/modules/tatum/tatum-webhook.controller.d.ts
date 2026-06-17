import { TatumWebhookService } from './tatum-webhook.service';
import { TatumDepositService } from './tatum-deposit.service';
export declare class TatumWebhookController {
    private readonly webhookService;
    private readonly depositService;
    private readonly logger;
    constructor(webhookService: TatumWebhookService, depositService: TatumDepositService);
    handleWebhook(payload: any, signature: string): Promise<{
        received: boolean;
    }>;
    private handleConfirmation;
}
