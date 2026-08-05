import { OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { Currency } from '@src/generated/client';
import { TatumWalletService } from './tatum-wallet.service';
import { TatumWebhookService } from './tatum-webhook.service';
export declare const PLATFORM_EMAIL = "platform@p2n.app";
export declare const PLATFORM_WALLET_INDEX_BASE = 900000;
export declare class TatumPlatformService implements OnApplicationBootstrap {
    private readonly prisma;
    private readonly tatumWallet;
    private readonly tatumWebhook;
    private readonly logger;
    private readonly cryptoCurrencies;
    constructor(prisma: PrismaService, tatumWallet: TatumWalletService, tatumWebhook: TatumWebhookService);
    onApplicationBootstrap(): Promise<void>;
    ensurePlatformWallets(): Promise<{
        userId: string;
        wallets: {
            currency: Currency;
            id: string;
            address: string | null;
        }[];
    }>;
    getPlatformFeeWallet(currency: Currency): Promise<{
        id: string;
        updatedAt: Date;
        userId: string;
        version: number;
        currency: import("@src/generated/client").$Enums.Currency;
        balance: import("@src/generated/client/runtime/library").Decimal;
        reservedBalance: import("@src/generated/client/runtime/library").Decimal;
        address: string | null;
    } | null>;
    getPlatformUserId(): Promise<string>;
}
