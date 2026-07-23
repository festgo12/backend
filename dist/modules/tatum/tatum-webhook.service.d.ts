import { OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TatumWalletService } from './tatum-wallet.service';
export interface WebhookSubscription {
    id: string;
    address: string;
    chain: string;
    currency: string;
    type: string;
    createdAt: Date;
}
export declare class TatumWebhookService implements OnApplicationBootstrap {
    private readonly configService;
    private readonly httpService;
    private readonly prisma;
    private readonly walletService;
    private readonly tatumWallet;
    private readonly logger;
    private readonly hmacSecret;
    private readonly apiKey;
    private readonly baseUrl;
    private readonly subscriptions;
    constructor(configService: ConfigService, httpService: HttpService, prisma: PrismaService, walletService: WalletService, tatumWallet: TatumWalletService);
    onApplicationBootstrap(): Promise<void>;
    private get headers();
    verifySignature(payload: any, signature: string): boolean;
    markTransactionAsCompleted(txId: string): Promise<void>;
    private getWebhookUrl;
    registerAddressSubscription(address: string, chain: string, currency: string): Promise<WebhookSubscription | null>;
    registerOutgoingSubscription(chain: string): Promise<WebhookSubscription | null>;
    cancelSubscription(subscriptionId: string): Promise<boolean>;
    getActiveSubscriptions(): WebhookSubscription[];
    getSubscriptionSummary(): {
        total: number;
        byChain: Record<string, number>;
        byType: Record<string, number>;
        subscriptions: WebhookSubscription[];
    };
    ensureOutgoingWebhooks(): Promise<void>;
    static notificationChain(currency: string): string;
}
