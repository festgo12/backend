import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TatumWalletService } from './tatum-wallet.service';
import { PLATFORM_EMAIL } from './tatum-platform.service';
import { Currency } from '@src/generated/client';
import * as crypto from 'crypto';

export interface WebhookSubscription {
  id: string;
  address: string;
  chain: string;
  currency: string;
  type: string;
  createdAt: Date;
}

@Injectable()
export class TatumWebhookService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TatumWebhookService.name);
  private readonly hmacSecret: string;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tatum.io/v4';

  /** In-memory cache of active webhook subscriptions */
  private readonly subscriptions = new Map<string, WebhookSubscription>();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly tatumWallet: TatumWalletService,
  ) {
    this.hmacSecret =
      this.configService.get<string>('TATUM_WEBHOOK_SECRET') || '';
    this.apiKey = this.configService.get<string>('TATUM_API_KEY') || '';
  }

  /**
   * Register outgoing webhooks on startup.
   */
  async onApplicationBootstrap() {
    try {
      await this.ensureOutgoingWebhooks();
    } catch (error: any) {
      this.logger.warn(
        `Failed to register outgoing webhooks on startup: ${error.message}`,
      );
    }
  }

  private get headers() {
    return { 'x-api-key': this.apiKey };
  }

  /**
   * Verifies the HMAC signature from Tatum.
   * HMAC must be computed over the RAW request body bytes, not the
   * re-serialized JSON object, or the digest will never match.
   */
  verifySignature(
    rawBody: Buffer | string | undefined,
    signature: string,
  ): boolean {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    if (!this.hmacSecret || !signature || !rawBody) {
      if (!isProduction) return true;
      return false;
    }

    const hmac = crypto.createHmac('sha256', this.hmacSecret);
    const digest = hmac.update(rawBody).digest('hex');

    return digest === signature;
  }

  /**
   * Marks a pending transaction as completed.
   */
  async markTransactionAsCompleted(txId: string) {
    try {
      const transaction = await this.prisma.walletTransaction.findUnique({
        where: { reference: txId },
      });

      if (!transaction) {
        this.logger.warn(`Transaction with reference ${txId} not found.`);
        return;
      }

      await this.walletService.updateTransactionStatus(
        transaction.id,
        'COMPLETED',
      );
      this.logger.log(
        `Transaction ${txId} marked as COMPLETED and balance synced.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to mark transaction ${txId} as completed: ${error.message}`,
      );
    }
  }

  // ─── Webhook Subscription Management ───────────────────────────────────────

  /**
   * Gets the configured webhook URL for incoming events.
   * Reads from env or constructs from app URL.
   */
  private getWebhookUrl(): string {
    const configured = this.configService.get<string>('TATUM_WEBHOOK_URL');
    if (configured) return configured.replace(/\/+$/, '');

    const appUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:3000',
    );
    return `${appUrl.replace(/\/+$/, '')}/tatum/webhooks/incoming`;
  }

  /**
   * Registers an address subscription with Tatum.
   * Tells Tatum to send us webhooks when transactions hit this address.
   */
  async registerAddressSubscription(
    address: string,
    chain: string,
    currency: string,
  ): Promise<WebhookSubscription | null> {
    const webhookUrl = this.getWebhookUrl();
    const subKey = `${chain}:${address}`;

    // Skip if already subscribed
    if (this.subscriptions.has(subKey)) {
      this.logger.debug(`Webhook subscription already exists for ${address}`);
      return this.subscriptions.get(subKey)!;
    }

    try {
      this.logger.log(
        `Registering Tatum webhook for ${currency} address ${address}`,
      );

      const response = await lastValueFrom(
        this.httpService.post(
          `${this.baseUrl}/subscription`,
          {
            type: 'ADDRESS_EVENT',
            attr: {
              address,
              chain,
              url: webhookUrl,
            },
          },
          { headers: this.headers },
        ),
      );

      const subscription: WebhookSubscription = {
        id: response.data?.id || `sub-${Date.now()}`,
        address,
        chain,
        currency,
        type: 'ADDRESS_EVENT',
        createdAt: new Date(),
      };

      this.subscriptions.set(subKey, subscription);
      this.logger.log(
        `Tatum webhook registered: ${subscription.id} for ${address}`,
      );

      return subscription;
    } catch (error: any) {
      this.logger.error(
        `Failed to register Tatum webhook for ${address}: ${error.response?.data?.message || error.message}`,
      );
      return null;
    }
  }

  /**
   * Registers a subscription for outgoing transactions from an address on a
   * chain. Used for monitoring withdrawal confirmations.
   * Tatum v4 requires an `address` for OUTGOING_NATIVE_TX subscriptions.
   */
  async registerOutgoingSubscription(
    chain: string,
    address: string,
  ): Promise<WebhookSubscription | null> {
    const webhookUrl = this.getWebhookUrl();
    const subKey = `outgoing:${chain}:${address}`;

    if (this.subscriptions.has(subKey)) {
      return this.subscriptions.get(subKey)!;
    }

    try {
      this.logger.log(
        `Registering outgoing transaction webhook for ${chain} address ${address}`,
      );

      const response = await lastValueFrom(
        this.httpService.post<{ id: string }>(
          `${this.baseUrl}/subscription`,
          {
            type: 'OUTGOING_NATIVE_TX',
            attr: {
              chain,
              address,
              url: webhookUrl,
            },
          },
          { headers: this.headers },
        ),
      );

      const subscription: WebhookSubscription = {
        id: response.data?.id || `sub-out-${Date.now()}`,
        address,
        chain,
        currency: chain,
        type: 'OUTGOING_NATIVE_TX',
        createdAt: new Date(),
      };

      this.subscriptions.set(subKey, subscription);
      this.logger.log(
        `Outgoing webhook registered: ${subscription.id} for ${chain} address ${address}`,
      );

      return subscription;
    } catch (error: unknown) {
      const apiError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      this.logger.error(
        `Failed to register outgoing webhook for ${chain} address ${address}: ${apiError.response?.data?.message || apiError.message || String(error)}`,
      );
      return null;
    }
  }

  /**
   * Cancels a webhook subscription by ID.
   */
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await lastValueFrom(
        this.httpService.delete(
          `${this.baseUrl}/subscription/${subscriptionId}`,
          {
            headers: this.headers,
          },
        ),
      );

      // Remove from cache
      for (const [key, sub] of this.subscriptions.entries()) {
        if (sub.id === subscriptionId) {
          this.subscriptions.delete(key);
          break;
        }
      }

      this.logger.log(`Webhook subscription cancelled: ${subscriptionId}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to cancel subscription ${subscriptionId}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Lists all currently tracked webhook subscriptions.
   */
  getActiveSubscriptions(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Gets a subscription summary for admin display.
   */
  getSubscriptionSummary(): {
    total: number;
    byChain: Record<string, number>;
    byType: Record<string, number>;
    subscriptions: WebhookSubscription[];
  } {
    const subs = this.getActiveSubscriptions();
    const byChain: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const sub of subs) {
      byChain[sub.chain] = (byChain[sub.chain] || 0) + 1;
      byType[sub.type] = (byType[sub.type] || 0) + 1;
    }

    return {
      total: subs.length,
      byChain,
      byType,
      subscriptions: subs,
    };
  }

  /**
   * Ensures outgoing webhooks are registered for all supported chains.
   * Tatum v4 requires an address per OUTGOING_NATIVE_TX subscription, so we
   * monitor each chain's platform fee wallet (covers fee sweeps). Called on
   * application bootstrap and on demand by admins.
   */
  async ensureOutgoingWebhooks(): Promise<void> {
    const chains = ['BTC', 'ETH'];
    for (const chain of chains) {
      const address = await this.getPlatformFeeWalletAddress(chain);
      if (!address) {
        this.logger.warn(
          `Skipping outgoing webhook registration for ${chain}: no platform fee wallet address yet`,
        );
        continue;
      }
      await this.registerOutgoingSubscription(chain, address);
    }
  }

  /**
   * Resolves the platform fee wallet address for a chain from the database.
   * Avoids injecting TatumPlatformService (which would create a DI cycle).
   */
  private async getPlatformFeeWalletAddress(
    chain: string,
  ): Promise<string | null> {
    const currencyMap: Record<string, Currency> = {
      BTC: Currency.BTC,
      ETH: Currency.ETH,
    };
    const currency = currencyMap[chain];
    if (!currency) return null;

    const platformUser = await this.prisma.user.findUnique({
      where: { email: PLATFORM_EMAIL },
    });
    if (!platformUser) return null;

    const wallet = await this.prisma.wallet.findUnique({
      where: {
        userId_currency: { userId: platformUser.id, currency },
      },
    });

    return wallet?.address || null;
  }

  /**
   * Maps a currency to the chain identifier used in Tatum v4 notifications.
   * Notifications require uppercase chain identifiers (BTC, ETH).
   */
  static notificationChain(currency: string): string {
    switch (currency.toUpperCase()) {
      case 'BTC':
        return 'BTC';
      case 'ETH':
      case 'USDT':
      case 'USDC':
        return 'ETH';
      default:
        return currency.toUpperCase();
    }
  }
}
