import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { CryptoConfigService } from './crypto-config.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { Currency } from '@src/generated/client';
export interface NormalizedCryptoEvent {
    provider: 'alchemy' | 'quicknode';
    chain: 'EVM' | 'BTC';
    direction: 'INBOUND' | 'OUTBOUND';
    txHash: string;
    fromAddress: string;
    toAddress: string;
    asset: Currency;
    amount: number;
    blockNumber: number;
    logIndex?: number;
    removed?: boolean;
}
export declare class WebhookProcessorService {
    private readonly prisma;
    private readonly walletService;
    private readonly depositRegistry;
    private readonly config;
    private readonly tracker;
    private readonly logger;
    constructor(prisma: PrismaService, walletService: WalletService, depositRegistry: DepositAddressRegistry, config: CryptoConfigService, tracker: WithdrawalTrackerService);
    processAlchemyEvent(payload: Record<string, unknown>): Promise<void>;
    private normalizeAlchemyActivity;
    processQuickNodeEvent(payload: Record<string, unknown>): Promise<void>;
    private normalizeQuickNodeEvent;
    private processEvent;
    private processDeposit;
    private cancelRemovedDeposit;
    private processWithdrawalConfirmation;
}
