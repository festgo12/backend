import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { Currency } from '@src/generated/client';
import { TatumWalletService } from './tatum-wallet.service';
import { TatumRiskService } from './tatum-risk.service';
import { TatumWebhookService } from './tatum-webhook.service';
export declare const STABLECOIN_CONTRACTS: Record<string, string>;
export declare const STABLECOIN_CONTRACTS_TESTNET: Record<string, string>;
export declare const CRYPTO_CURRENCIES: Currency[];
export declare function getStablecoinContract(currency: string, configService: ConfigService): string | null;
export declare class TatumDepositService {
    private readonly configService;
    private readonly httpService;
    private readonly prisma;
    private readonly walletService;
    private readonly tatumWallet;
    private readonly riskService;
    private readonly webhookService;
    private readonly logger;
    private readonly apiKey;
    private readonly dataBaseUrl;
    constructor(configService: ConfigService, httpService: HttpService, prisma: PrismaService, walletService: WalletService, tatumWallet: TatumWalletService, riskService: TatumRiskService, webhookService: TatumWebhookService);
    handleDepositNotification(payload: {
        address: string;
        amount: string;
        asset: string;
        txId: string;
        reference?: string;
        sourceAddress?: string;
    }): Promise<void>;
    private fetchConfirmations;
    private getMinConfirmations;
    confirmDeposit(txId: string): Promise<{
        confirmed: boolean;
        confirmations: number;
        reason?: string;
    }>;
    confirmPendingDeposits(): Promise<{
        scanned: number;
        confirmed: number;
    }>;
    confirmWithdrawal(txId: string): Promise<{
        confirmed: boolean;
        confirmations: number;
        reason?: string;
    }>;
    confirmPendingWithdrawals(): Promise<{
        scanned: number;
        confirmed: number;
    }>;
    syncBalanceWithBlockchain(walletId: string): Promise<{
        synced: boolean;
        onChainBalance: number;
        localBalance: number;
        discrepancy: number;
    }>;
    syncAllWallets(): Promise<{
        total: number;
        synced: number;
        discrepancies: number;
    }>;
}
