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
    constructor(prisma: PrismaService, hdWallet: HdWalletService, depositRegistry: DepositAddressRegistry, cryptoConfig: CryptoConfigService);
    onApplicationBootstrap(): Promise<void>;
    ensurePlatformWallets(): Promise<{
        userId: string;
        wallets: {
            currency: Currency;
            id: string;
            address: string | null;
        }[];
    }>;
    private persistMasterXpubs;
    getPlatformFeeWallet(currency: Currency): Promise<{
        id: string;
        updatedAt: Date;
        userId: string;
        version: number;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        address: string | null;
        derivationIndex: number | null;
        chain: string | null;
    } | null>;
    getPlatformUserId(): Promise<string>;
}
