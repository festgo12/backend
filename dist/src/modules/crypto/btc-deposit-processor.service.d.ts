import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { CryptoConfigService } from './crypto-config.service';
import { Currency } from '@src/generated/client';
export declare class BtcDepositProcessorService {
    private readonly prisma;
    private readonly walletService;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, walletService: WalletService, config: CryptoConfigService);
    getPendingCount(): Promise<number>;
    creditDeposit(params: {
        address: string;
        currency: Currency;
        amount: number;
        txHash: string;
        sourceAddress: string | null;
        confirmations: number;
        walletId: string;
    }): Promise<void>;
}
