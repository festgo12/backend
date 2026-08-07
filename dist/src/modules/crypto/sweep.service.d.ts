import { PrismaService } from '../../core/database/prisma.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { ChainClientService } from './chain-client.service';
import { CryptoConfigService } from './crypto-config.service';
import { HdWalletService } from './hd-wallet.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
export declare class SweepService {
    private readonly prisma;
    private readonly depositRegistry;
    private readonly chainClient;
    private readonly config;
    private readonly hdWallet;
    private readonly tracker;
    private readonly logger;
    private isRunning;
    constructor(prisma: PrismaService, depositRegistry: DepositAddressRegistry, chainClient: ChainClientService, config: CryptoConfigService, hdWallet: HdWalletService, tracker: WithdrawalTrackerService);
    sweepAll(): Promise<void>;
    private sweepEvm;
    private sweepBtc;
    private sweepEvmCurrency;
    private recordSweep;
}
