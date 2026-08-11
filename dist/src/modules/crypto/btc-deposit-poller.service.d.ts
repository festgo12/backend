import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { ChainClientService } from './chain-client.service';
import { CryptoConfigService } from './crypto-config.service';
import { Currency } from '@src/generated/client';
export declare class BtcDepositPollerService {
    private readonly prisma;
    private readonly walletService;
    private readonly depositRegistry;
    private readonly chainClient;
    private readonly config;
    private readonly logger;
    private isRunning;
    private nextPollAllowedAt;
    constructor(prisma: PrismaService, walletService: WalletService, depositRegistry: DepositAddressRegistry, chainClient: ChainClientService, config: CryptoConfigService);
    scan(): Promise<void>;
    creditDeposit(params: {
        address: string;
        currency: Currency;
        amount: number;
        txHash: string;
        sourceAddress: string | null;
        confirmations: number;
    }): Promise<void>;
}
