import { OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { Currency } from '@src/generated/client';
import { HdWalletService } from './hd-wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { CryptoConfigService } from './crypto-config.service';
export declare const PLATFORM_EMAIL = "platform@p2n.app";
export declare class PlatformService implements OnApplicationBootstrap {
    private readonly prisma;
    private readonly hdWallet;
    private readonly depositRegistry;
    private readonly cryptoConfig;
    private readonly logger;
    private readonly cryptoCurrencies;
    private readonly pairs;
    constructor(prisma: PrismaService, hdWallet: HdWalletService, depositRegistry: DepositAddressRegistry, cryptoConfig: CryptoConfigService);
    onApplicationBootstrap(): Promise<void>;
    ensurePlatformWallets(): Promise<{
        userId: string;
        wallets: {
            currency: Currency;
            chain: string;
            id: string;
            address: string | null;
        }[];
    }>;
    private feeAddressForChain;
    private persistMasterXpubs;
    getPlatformFeeWallet(currency: Currency, chain?: string): Promise<{
        id: string;
        updatedAt: Date;
        userId: string;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        address: string | null;
        derivationIndex: number | null;
        chain: string | null;
        isFrozen: boolean;
        version: number;
    } | null>;
    getPlatformUserId(): Promise<string>;
}
