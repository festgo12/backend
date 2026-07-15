import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TatumWalletService } from './tatum-wallet.service';
import { TatumRiskService } from './tatum-risk.service';
export declare class TatumDepositService {
    private readonly configService;
    private readonly httpService;
    private readonly prisma;
    private readonly walletService;
    private readonly tatumWallet;
    private readonly riskService;
    private readonly logger;
    private readonly apiKey;
    private readonly baseUrl;
    constructor(configService: ConfigService, httpService: HttpService, prisma: PrismaService, walletService: WalletService, tatumWallet: TatumWalletService, riskService: TatumRiskService);
    handleDepositNotification(payload: {
        address: string;
        amount: string;
        asset: string;
        txId: string;
        reference?: string;
        sourceAddress?: string;
    }): Promise<void>;
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
