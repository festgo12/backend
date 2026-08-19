import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { CryptoConfigService } from './crypto-config.service';
import { ChainKind } from './crypto-config.service';

interface ErrorLike {
  message?: string;
  response?: { data?: unknown; status?: number };
}

/**
 * Manages address registration with external webhook providers.
 *
 * - EVM: Alchemy Notify API (PATCH /api/update-webhook-addresses)
 * - BTC: QuickNode KV Store (POST /key-value-store/rest/v1/lists/{name}/items)
 *
 * Called by DepositAddressRegistry when a new address is derived.
 */
@Injectable()
export class AddressRegistrationService {
  private readonly logger = new Logger(AddressRegistrationService.name);
  private pendingEvmAddresses: string[] = [];
  private evmFlushTimer: NodeJS.Timeout | null = null;

  private static readonly EVM_BATCH_SIZE = 500;
  private static readonly EVM_FLUSH_DELAY_MS = 5_000;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: CryptoConfigService,
  ) {}

  // ─── EVM (Alchemy) ─────────────────────────────────────────────────────

  /**
   * Queues an EVM address for registration with the Alchemy webhook.
   * Addresses are batched and flushed in groups of 500.
   */
  queueEvmAddress(address: string): void {
    const lower = address.toLowerCase();
    if (!this.pendingEvmAddresses.includes(lower)) {
      this.pendingEvmAddresses.push(lower);
    }
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.evmFlushTimer) return;
    this.evmFlushTimer = setTimeout(() => {
      this.evmFlushTimer = null;
      void this.flushEvmAddresses();
    }, AddressRegistrationService.EVM_FLUSH_DELAY_MS);
  }

  private async flushEvmAddresses(): Promise<void> {
    if (this.pendingEvmAddresses.length === 0) return;

    const batch = this.pendingEvmAddresses.splice(
      0,
      AddressRegistrationService.EVM_BATCH_SIZE,
    );

    try {
      await this.registerEvmAddressesWithAlchemy(batch);
      this.logger.log(
        `Registered ${batch.length} EVM addresses with Alchemy webhook`,
      );
    } catch (error) {
      const err = error as ErrorLike;
      this.logger.error(
        `Failed to register EVM addresses with Alchemy: ${err.message}`,
      );
      // Re-queue on failure for retry
      this.pendingEvmAddresses.unshift(...batch);
    }

    // If more remain, schedule another flush
    if (this.pendingEvmAddresses.length > 0) {
      this.scheduleFlush();
    }
  }

  /**
   * Calls Alchemy's PATCH /api/update-webhook-addresses to add addresses
   * to the configured Address Activity Webhook.
   */
  private async registerEvmAddressesWithAlchemy(
    addresses: string[],
  ): Promise<void> {
    const authToken = this.config.alchemyAuthToken;
    const webhookId = this.config.alchemyWebhookId;
    if (!authToken || !webhookId) {
      this.logger.warn(
        'Alchemy AUTH_TOKEN or WEBHOOK_ID not configured; skipping address registration',
      );
      return;
    }

    await lastValueFrom(
      this.httpService.patch(
        'https://dashboard.alchemy.com/api/update-webhook-addresses',
        {
          webhook_id: webhookId,
          addresses_to_add: addresses,
          addresses_to_remove: [],
        },
        {
          headers: {
            'X-Alchemy-Token': authToken,
            'Content-Type': 'application/json',
          },
          timeout: 15_000,
        },
      ),
    );
  }

  // ─── BTC (QuickNode KV Store) ──────────────────────────────────────────

  /**
   * Registers a BTC address with QuickNode's KV Store for the Streams filter.
   */
  async registerBtcAddress(address: string): Promise<void> {
    const apiKey = this.config.quicknodeApiKey;
    const listName = this.config.quicknodeKvListName;
    if (!apiKey) {
      this.logger.warn(
        'QUICKNODE_API_KEY not configured; skipping BTC address registration',
      );
      return;
    }

    try {
      await lastValueFrom(
        this.httpService.post(
          `https://api.quicknode.com/key-value-store/rest/v1/lists/${listName}/items`,
          { item: address },
          {
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            timeout: 15_000,
          },
        ),
      );
      this.logger.debug(
        `Registered BTC address ${address} with QuickNode KV store`,
      );
    } catch (error) {
      const err = error as ErrorLike;
      // 409 = already exists, which is fine
      if (err.response?.status === 409) {
        this.logger.debug(
          `BTC address ${address} already registered in QuickNode KV store`,
        );
        return;
      }
      this.logger.error(
        `Failed to register BTC address ${address} with QuickNode: ${err.message}`,
      );
    }
  }

  // ─── Convenience ────────────────────────────────────────────────────────

  /**
   * Registers a deposit address with the appropriate provider based on chain.
   */
  async registerAddress(address: string, chain: ChainKind): Promise<void> {
    if (chain === 'EVM') {
      this.queueEvmAddress(address);
    } else if (chain === 'BTC') {
      await this.registerBtcAddress(address);
    }
  }
}
