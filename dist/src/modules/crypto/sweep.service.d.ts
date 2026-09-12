import { PrismaService } from '../../core/database/prisma.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { ChainClientService } from './chain-client.service';
import { CryptoConfigService } from './crypto-config.service';
import { HdWalletService } from './hd-wallet.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { PlatformService } from './platform.service';
import { ExchangeRateService } from './exchange-rate.service';
import { LedgerService } from '../wallet/ledger.service';
export interface SweepRunSummary {
    evmSwept: number;
    btcSwept: number;
    solSwept: number;
    tronSwept: number;
    evmSkipped: number;
    btcSkipped: number;
    solSkipped: number;
    tronSkipped: number;
    errors: string[];
    sweptByChain: Record<string, number>;
    skippedByChain: Record<string, number>;
}
export declare class SweepService {
    private readonly prisma;
    private readonly depositRegistry;
    private readonly chainClient;
    private readonly config;
    private readonly hdWallet;
    private readonly tracker;
    private readonly platformService;
    private readonly exchangeRate;
    private readonly ledger;
    private readonly logger;
    private isRunning;
    constructor(prisma: PrismaService, depositRegistry: DepositAddressRegistry, chainClient: ChainClientService, config: CryptoConfigService, hdWallet: HdWalletService, tracker: WithdrawalTrackerService, platformService: PlatformService, exchangeRate: ExchangeRateService, ledger: LedgerService);
    sweepAll(): Promise<void>;
    manualSweepAll(): Promise<SweepRunSummary>;
    manualSweepChain(chain: string): Promise<SweepRunSummary>;
    private registryChains;
    private runSweep;
    private sweepChain;
    private hasSufficientGas;
    private chainBalance;
    private sweepChainCurrency;
    private destinationAddress;
    private broadcastSweep;
    private recordSweep;
    private markMatchedDepositsSwept;
    private sweepConfigFor;
    getSweepConfig(): Promise<{
        globalThresholdUsd: number;
        chains: {
            chain: string;
            enabled: boolean;
            thresholdUsd: number | null;
            usesGlobalThreshold: boolean;
        }[];
    }>;
    updateSweepConfig(chain: string, changes: {
        enabled?: boolean;
        thresholdUsd?: number | null;
    }): Promise<{
        chain: string;
        enabled: boolean;
        thresholdUsd: number | null;
    }>;
}
