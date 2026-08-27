import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { CryptoConfigService } from './crypto-config.service';
import { ChainClientService } from './chain-client.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { HdWalletService } from './hd-wallet.service';
import { PlatformService } from './platform.service';
import { Currency } from '@src/generated/client';
export declare class CryptoWithdrawalService {
    private readonly prisma;
    private readonly hdWallet;
    private readonly chainClient;
    private readonly tracker;
    private readonly platformService;
    private readonly cryptoConfig;
    private readonly eventEmitter;
    private readonly logger;
    constructor(prisma: PrismaService, hdWallet: HdWalletService, chainClient: ChainClientService, tracker: WithdrawalTrackerService, platformService: PlatformService, cryptoConfig: CryptoConfigService, eventEmitter: EventEmitter2);
    processWithdrawal(params: {
        walletId: string;
        amount: number;
        destinationAddress: string;
        currency: Currency;
    }): Promise<{
        txId: string;
        status: string;
    }>;
    retryWithdrawal(transactionId: string): Promise<{
        txId: string;
        status: string;
    }>;
    sweepFeeWallet(params: {
        currency: Currency;
        destinationAddress: string;
        amount?: number;
    }): Promise<{
        txId: string;
        status: string;
    }>;
    private validateAddress;
}
