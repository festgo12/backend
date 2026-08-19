import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { CryptoConfigService } from './crypto-config.service';
export interface EvmDepositProcessorStatus {
    enabled: boolean;
    pendingCount: number;
}
export declare class EvmDepositProcessorService {
    private readonly prisma;
    private readonly walletService;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, walletService: WalletService, config: CryptoConfigService);
    getStatus(): Promise<EvmDepositProcessorStatus>;
    finalizePendingDeposits(maxBlock: number): Promise<void>;
}
