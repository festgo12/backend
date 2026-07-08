import type { User } from '@prisma/client';
import { PaystackService } from './paystack.service';
import { WalletService } from '../wallet/wallet.service';
export declare class PaystackController {
    private readonly paystackService;
    private readonly walletService;
    private readonly logger;
    constructor(paystackService: PaystackService, walletService: WalletService);
    initialize(user: User, amount: number): Promise<any>;
    getBanks(): Promise<any>;
    verifyAccount(accountNumber: string, bankCode: string): Promise<any>;
    verify(reference: string): Promise<{
        status: string;
        data: any;
        message?: undefined;
    } | {
        status: string;
        message: string;
        data?: undefined;
    }>;
    initiateTransfer(user: User, amount: number, accountNumber: string, bankCode: string, accountName: string): Promise<any>;
    handleWebhook(payload: any, signature: string): Promise<{
        status: string;
    }>;
    private handleChargeSuccess;
    private handleTransferSuccess;
    private handleTransferFailed;
    private handleTransferReversed;
}
