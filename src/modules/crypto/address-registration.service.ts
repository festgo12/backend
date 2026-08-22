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
 * - BTC: Alchemy WebSocket subscribeAddresses (managed by BtcAlchemyWebSocketService)
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

  // ─── Boot Sync (Replace All) ──────────────────────────────────────────

  /**
   * Replaces the ENTIRE address list on the Alchemy webhook via PUT.
   * Called on boot to ensure all DB-known addresses are registered,
   * even those derived before the webhook was set up.
   *
   * Alchemy's PUT endpoint replaces the previous list completely.
   * Addresses are batched in groups of 500 (Alchemy API limit).
   */
  async replaceAllEvmAddresses(addresses: string[]): Promise<void> {
    const authToken = this.config.alchemyAuthToken;
    const webhookId = this.config.alchemyWebhookId;
    if (!authToken || !webhookId) {
      this.logger.warn(
        'Alchemy AUTH_TOKEN or WEBHOOK_ID not configured; skipping boot-sync',
      );
      return;
    }

    if (addresses.length === 0) {
      this.logger.debug('No EVM addresses to sync to Alchemy webhook');
      return;
    }

    // De-duplicate and lowercase
    const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];

    // Batch in groups of 500
    for (
      let i = 0;
      i < unique.length;
      i += AddressRegistrationService.EVM_BATCH_SIZE
    ) {
      const batch = unique.slice(
        i,
        i + AddressRegistrationService.EVM_BATCH_SIZE,
      );
      const batchNum =
        Math.floor(i / AddressRegistrationService.EVM_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(
        unique.length / AddressRegistrationService.EVM_BATCH_SIZE,
      );

      try {
        await lastValueFrom(
          this.httpService.put(
            'https://dashboard.alchemy.com/api/update-webhook-addresses',
            {
              webhook_id: webhookId,
              addresses: batch,
            },
            {
              headers: {
                'X-Alchemy-Token': authToken,
                'Content-Type': 'application/json',
              },
              timeout: 30_000,
            },
          ),
        );
        this.logger.log(
          `Boot-synced EVM addresses to Alchemy webhook: batch ${batchNum}/${totalBatches} (${batch.length} addresses)`,
        );
      } catch (error) {
        const err = error as ErrorLike;
        this.logger.error(
          `Failed to boot-sync EVM addresses batch ${batchNum}/${totalBatches}: ${err.message}`,
        );
      }
    }

    this.logger.log(
      `Boot-sync complete: ${unique.length} EVM addresses registered with Alchemy webhook`,
    );
  }

  // ─── BTC (Alchemy WebSocket) ───────────────────────────────────────────
  //
  // BTC address registration is handled by BtcAlchemyWebSocketService.addAddress().
  // The registerAddress() method below triggers a WebSocket re-subscribe.

  // ─── Convenience ────────────────────────────────────────────────────────

  /**
   * Registers a deposit address with the appropriate provider based on chain.
   * For BTC, this triggers a WebSocket re-subscribe (handled externally by
   * DepositAddressRegistry calling BtcWebSocketService.addAddress()).
   */
  registerAddress(address: string, chain: ChainKind): void {
    if (chain === 'EVM') {
      this.queueEvmAddress(address);
    }
    // BTC registration is handled by BtcAlchemyWebSocketService
  }
}
