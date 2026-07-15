import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TatumWalletService } from './tatum-wallet.service';
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
  private readonly baseUrl = 'https://api.tatum.io/v3';

  /** In-memory cache of active webhook subscriptions */
  private readonly subscriptions = new Map<string, WebhookSubscription>();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly tatumWallet: TatumWalletService,
  ) {
    this.hmacSecret = this.configService.get<string>('TATUM_WEBHOOK_SECRET') || '';
    this.apiKey = this.configService.get<string>('TATUM_API_KEY') || '';
  }

  /**
   * Register outgoing webhooks on startup.
   */
  async onApplicationBootstrap() {
    try {
      await this.ensureOutgoingWebhooks();
    } catch (error: any) {
      this.logger.warn(`Failed to register outgoing webhooks on startup: ${error.message}`);
    }
  }

  private get headers() {
    return { 'x-api-key': this.apiKey };
  }

  /**
   * Verifies the HMAC signature from Tatum.
   */
  verifySignature(payload: any, signature: string): boolean {
    if (!this.hmacSecret || !signature) {
      if (this.configService.get('NODE_ENV') !== 'production') return true;
      return false;
    }

    const hmac = crypto.createHmac('sha256', this.hmacSecret);
    const body = JSON.stringify(payload);
    const digest = hmac.update(body).digest('hex');

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

      await this.walletService.updateTransactionStatus(transaction.id, 'COMPLETED');
      this.logger.log(`Transaction ${txId} marked as COMPLETED and balance synced.`);
    } catch (error) {
      this.logger.error(`Failed to mark transaction ${txId} as completed: ${error.message}`);
    }
  }

  // ─── Webhook Subscription Management ───────────────────────────────────────

  /**
   * Gets the configured webhook URL for incoming events.
   * Reads from env or constructs from app URL.
   */
  private getWebhookUrl(): string {
    const configured = this.configService.get<string>('TATUM_WEBHOOK_URL');
    if (configured) return configured;

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    return `${appUrl}/tatum/webhooks/incoming`;
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
      this.logger.log(`Registering Tatum webhook for ${currency} address ${address}`);

      const response = await lastValueFrom(
        this.httpService.post(
          `${this.baseUrl}/subscription`,
          {
            type: 'ADDRESS_TRANSACTION',
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
        type: 'ADDRESS_TRANSACTION',
        createdAt: new Date(),
      };

      this.subscriptions.set(subKey, subscription);
      this.logger.log(`Tatum webhook registered: ${subscription.id} for ${address}`);

      return subscription;
    } catch (error: any) {
      this.logger.error(
        `Failed to register Tatum webhook for ${address}: ${error.response?.data?.message || error.message}`
      );
      return null;
    }
  }

  /**
   * Registers a subscription for outgoing transactions on a chain.
   * Used for monitoring withdrawal confirmations.
   */
  async registerOutgoingSubscription(chain: string): Promise<WebhookSubscription | null> {
    const webhookUrl = this.getWebhookUrl();
    const subKey = `outgoing:${chain}`;

    if (this.subscriptions.has(subKey)) {
      return this.subscriptions.get(subKey)!;
    }

    try {
      this.logger.log(`Registering outgoing transaction webhook for ${chain}`);

      const response = await lastValueFrom(
        this.httpService.post(
          `${this.baseUrl}/subscription`,
          {
            type: 'OUTGOING_BLOCKCHAIN_TRANSACTION',
            attr: {
              chain,
              url: webhookUrl,
            },
          },
          { headers: this.headers },
        ),
      );

      const subscription: WebhookSubscription = {
        id: response.data?.id || `sub-out-${Date.now()}`,
        address: '*',
        chain,
        currency: chain,
        type: 'OUTGOING_BLOCKCHAIN_TRANSACTION',
        createdAt: new Date(),
      };

      this.subscriptions.set(subKey, subscription);
      this.logger.log(`Outgoing webhook registered: ${subscription.id} for ${chain}`);

      return subscription;
    } catch (error: any) {
      this.logger.error(
        `Failed to register outgoing webhook for ${chain}: ${error.response?.data?.message || error.message}`
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
        this.httpService.delete(`${this.baseUrl}/subscription/${subscriptionId}`, {
          headers: this.headers,
        }),
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
      this.logger.error(`Failed to cancel subscription ${subscriptionId}: ${error.message}`);
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
   * Called on application bootstrap.
   */
  async ensureOutgoingWebhooks(): Promise<void> {
    const chains = ['bitcoin', 'ethereum'];
    for (const chain of chains) {
      await this.registerOutgoingSubscription(chain);
    }
  }
}
