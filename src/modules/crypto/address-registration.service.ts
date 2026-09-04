import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Chain, CryptoConfigService } from './crypto-config.service';

interface ErrorLike {
  message?: string;
  response?: { data?: unknown; status?: number };
}

interface ChainQueue {
  pending: string[];
  flushTimer: NodeJS.Timeout | null;
}

/**
 * Manages address registration with external webhook providers.
 *
 * - EVM-family (ETH/BSC/POLYGON) & Solana: Alchemy Notify API
 *   (PATCH /api/update-webhook-addresses), one webhook per chain.
 * - TRON: Alchemy Notify API (poller-driven; webhook optional).
 * - BTC: Alchemy WebSocket subscribeAddresses (managed by
 *   BtcAlchemyWebSocketService).
 *
 * Each chain has its own pending queue + 500/batch flush + 5s delay.
 * Called by DepositAddressRegistry when a new address is derived.
 */
@Injectable()
export class AddressRegistrationService {
  private readonly logger = new Logger(AddressRegistrationService.name);
  private readonly queues = new Map<string, ChainQueue>();

  private static readonly BATCH_SIZE = 500;
  private static readonly FLUSH_DELAY_MS = 5_000;

  constructor(
    private readonly httpService: HttpService,
    private readonly config: CryptoConfigService,
  ) {}

  private queueFor(chain: string): ChainQueue {
    let q = this.queues.get(chain);
    if (!q) {
      q = { pending: [], flushTimer: null };
      this.queues.set(chain, q);
    }
    return q;
  }

  /**
   * Queues an address for registration with the given chain's Alchemy
   * webhook. Addresses are batched and flushed in groups of 500.
   * `chain` is a canonical Chain ('ETH'|'BSC'|'POLYGON'|'SOLANA'|'TRON').
   */
  queueChainAddress(chain: Chain, address: string): void {
    const normalized =
      this.config.isEvmChain(chain) || chain === 'TRON'
        ? address.toLowerCase()
        : address;
    const queue = this.queueFor(chain);
    if (!queue.pending.includes(normalized)) {
      queue.pending.push(normalized);
    }
    this.scheduleFlush(chain);
  }

  private scheduleFlush(chain: Chain): void {
    const queue = this.queueFor(chain);
    if (queue.flushTimer) return;
    queue.flushTimer = setTimeout(() => {
      queue.flushTimer = null;
      void this.flushChainAddresses(chain);
    }, AddressRegistrationService.FLUSH_DELAY_MS);
  }

  private async flushChainAddresses(chain: Chain): Promise<void> {
    const queue = this.queueFor(chain);
    if (queue.pending.length === 0) return;

    const batch = queue.pending.splice(
      0,
      AddressRegistrationService.BATCH_SIZE,
    );

    try {
      await this.registerChainAddressesWithAlchemy(chain, batch);
      this.logger.log(
        `Registered ${batch.length} ${chain} addresses with Alchemy webhook`,
      );
    } catch (error) {
      const err = error as ErrorLike;
      this.logger.error(
        `Failed to register ${chain} addresses with Alchemy: ${err.message}`,
      );
      queue.pending.unshift(...batch);
    }

    // If more remain, schedule another flush
    if (queue.pending.length > 0) {
      this.scheduleFlush(chain);
    }
  }

  /**
   * Calls Alchemy's PATCH /api/update-webhook-addresses to add addresses
   * to the configured chain Address Activity Webhook.
   */
  private async registerChainAddressesWithAlchemy(
    chain: Chain,
    addresses: string[],
  ): Promise<void> {
    const authToken = this.config.authTokenForChain(chain);
    const webhookId = this.config.webhookIdForChain(chain);
    if (!authToken || !webhookId) {
      this.logger.warn(
        `Alchemy AUTH_TOKEN or WEBHOOK_ID not configured for ${chain}; skipping address registration`,
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
   * Replaces the ENTIRE address list on a chain's Alchemy webhook via PUT.
   * Called on boot to ensure all DB-known addresses are registered, even
   * those derived before the webhook was set up. Addresses are batched in
   * groups of 500 (Alchemy API limit).
   */
  async replaceAllChainAddresses(
    chain: Chain,
    addresses: string[],
    authToken?: string | null,
    webhookId?: string | null,
  ): Promise<void> {
    const token = authToken ?? this.config.authTokenForChain(chain);
    const id = webhookId ?? this.config.webhookIdForChain(chain);
    if (!token || !id) {
      this.logger.warn(
        `Alchemy AUTH_TOKEN or WEBHOOK_ID not configured for ${chain}; skipping boot-sync`,
      );
      return;
    }

    if (addresses.length === 0) {
      this.logger.debug(`No ${chain} addresses to sync to Alchemy webhook`);
      return;
    }

    // De-duplicate and lowercase (EVM-family + TRON lowercase; Solana verbatim)
    const normalized = addresses.map((a) =>
      this.config.isEvmChain(chain) || chain === 'TRON' ? a.toLowerCase() : a,
    );
    const unique = [...new Set(normalized)];

    // Batch in groups of 500
    for (
      let i = 0;
      i < unique.length;
      i += AddressRegistrationService.BATCH_SIZE
    ) {
      const batch = unique.slice(i, i + AddressRegistrationService.BATCH_SIZE);
      const batchNum =
        Math.floor(i / AddressRegistrationService.BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(
        unique.length / AddressRegistrationService.BATCH_SIZE,
      );

      try {
        await lastValueFrom(
          this.httpService.put(
            'https://dashboard.alchemy.com/api/update-webhook-addresses',
            {
              webhook_id: id,
              addresses: batch,
            },
            {
              headers: {
                'X-Alchemy-Token': token,
                'Content-Type': 'application/json',
              },
              timeout: 30_000,
            },
          ),
        );
        this.logger.log(
          `Boot-synced ${chain} addresses to Alchemy webhook: batch ${batchNum}/${totalBatches} (${batch.length} addresses)`,
        );
      } catch (error) {
        const err = error as ErrorLike;
        this.logger.error(
          `Failed to boot-sync ${chain} addresses batch ${batchNum}/${totalBatches}: ${err.message}`,
        );
      }
    }

    this.logger.log(
      `Boot-sync complete: ${unique.length} ${chain} addresses registered with Alchemy webhook`,
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
  registerAddress(address: string, chain: Chain | 'BTC'): void {
    if (chain === 'BTC') return; // BTC handled by BtcAlchemyWebSocketService
    this.queueChainAddress(chain, address);
  }

  // ─── Back-compat EVM helpers ─────────────────────────────────────────────

  /** Back-compat: queues an address for the legacy ETH webhook. */
  queueEvmAddress(address: string): void {
    this.queueChainAddress('ETH', address);
  }

  /** Back-compat: replaces the legacy ETH webhook's address list. */
  replaceAllEvmAddresses(addresses: string[]): Promise<void> {
    return this.replaceAllChainAddresses('ETH', addresses);
  }
}
