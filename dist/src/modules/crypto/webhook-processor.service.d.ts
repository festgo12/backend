import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { CryptoConfigService } from './crypto-config.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { Currency } from '@src/generated/client';
export interface NormalizedCryptoEvent {
    provider: 'alchemy' | 'btc_websocket';
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
    processBtcEvent(event: Omit<NormalizedCryptoEvent, 'provider'> & {
        provider: 'btc_websocket';
    }): Promise<void>;
    processEvent(event: NormalizedCryptoEvent): Promise<void>;
    private processDeposit;
    private cancelRemovedDeposit;
    private processWithdrawalConfirmation;
}
