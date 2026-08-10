import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { ChainClientService } from './chain-client.service';
import { CryptoConfigService } from './crypto-config.service';
import { Currency, Prisma } from '@src/generated/client';
export declare class WithdrawalTrackerService {
    private readonly prisma;
    private readonly walletService;
    private readonly chainClient;
    private readonly config;
    private readonly logger;
    private isProcessing;
    constructor(prisma: PrismaService, walletService: WalletService, chainClient: ChainClientService, config: CryptoConfigService);
    enqueue(params: {
        txHash: string;
        walletId: string;
        currency: Currency;
        amount: number;
        destination: string;
        metadata?: Record<string, unknown>;
    }): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        currency: import("@src/generated/client").$Enums.Currency;
        metadata: Prisma.JsonValue | null;
        destination: string;
        amount: Prisma.Decimal;
        walletId: string;
        txHash: string;
        attempts: number;
        nextPollAt: Date;
    }>;
    processQueue(): Promise<void>;
    private poll;
    private finalize;
}
