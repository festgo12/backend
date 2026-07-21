import type { User } from '@src/generated/client';
import { PaystackService } from './paystack.service';
import { WalletService } from '../wallet/wallet.service';
import { InitializeDepositDto } from './dto/initialize-deposit.dto';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';
import { VerifyAccountDto } from './dto/verify-account.dto';
import { InitiateRefundDto } from './dto/initiate-refund.dto';
import type { Request } from 'express';
export declare class PaystackController {
    private readonly paystackService;
    private readonly walletService;
    private readonly logger;
    constructor(paystackService: PaystackService, walletService: WalletService);
    initialize(user: User, dto: InitializeDepositDto): Promise<any>;
    getBanks(): Promise<any>;
    verifyAccount(dto: VerifyAccountDto): Promise<any>;
    verify(reference: string): Promise<{
        status: string;
        data: any;
        message?: undefined;
    } | {
        status: string;
        message: string;
        data?: undefined;
    }>;
    initiateTransfer(user: User, dto: InitiateTransferDto): Promise<any>;
    initiateRefund(user: User, dto: InitiateRefundDto): Promise<any>;
    handleWebhook(req: Request, payload: any, signature: string): Promise<{
        status: string;
    }>;
    private handleChargeSuccess;
    private handleTransferSuccess;
    private handleTransferFailed;
    private handleTransferReversed;
}
