import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import {
  Chain,
  ChainFamily,
  CryptoConfigService,
} from './crypto-config.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { Currency, LedgerType } from '@src/generated/client';

interface ErrorLike {
  message?: string;
  code?: string;
}

/** Normalized event produced by Alchemy normalizer, BTC WebSocket service, and TRON poller. */
export interface NormalizedCryptoEvent {
  provider: 'alchemy' | 'btc_websocket' | 'tron_poller';
  chain: Chain | 'BTC';
  family: ChainFamily;
  direction: 'INBOUND' | 'OUTBOUND';
  txHash: string;
  fromAddress: string;
  toAddress: string;
  asset: Currency;
  amount: number;
  blockNumber: number;
  logIndex?: number;
  removed?: boolean;
}

/**
 * Processes normalized crypto events from Alchemy (EVM) webhooks and the
 * BtcAlchemyWebSocketService (BTC WebSocket). Handles idempotent deposit
 * recording, reorg cancellation, and outbound withdrawal confirmation.
 */
@Injectable()
export class WebhookProcessorService {
  private readonly logger = new Logger(WebhookProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly depositRegistry: DepositAddressRegistry,
    private readonly config: CryptoConfigService,
    private readonly tracker: WithdrawalTrackerService,
  ) {}

  // ─── Alchemy Event Processing ───────────────────────────────────────────

  /**
   * Resolves the chain a raw Alchemy webhook payload was delivered for, based
   * on the `event.network` field. Returns null if the network is unknown.
   * Used by the webhook controller to select the correct signing key for HMAC
   * verification before processing.
   */
  chainFromPayload(payload: Record<string, unknown>): Chain | null {
    const event = payload.event as Record<string, unknown> | undefined;
    if (!event) return null;
    const network = (event.network as string) || '';
    return this.config.chainFromWebhookNetwork(network);
  }

  /**
   * Returns the raw `event.network` string of a payload (for logging when the
   * chain cannot be resolved from it).
   */
  networkFromPayload(payload: Record<string, unknown>): string | null {
    const event = payload.event as Record<string, unknown> | undefined;
    if (!event) return null;
    return (event.network as string) || null;
  }

  async processAlchemyEvent(payload: Record<string, unknown>): Promise<void> {
    const event = payload.event as Record<string, unknown> | undefined;
    if (!event) return;

    // Route by the Alchemy `network` field so deposits are attributed to the
    // correct chain (e.g. ETH_MAINNET -> ETH, SOLANA_DEVNET -> SOLANA).
    const network = (event.network as string) || '';
    const chain = this.config.chainFromWebhookNetwork(network);

    const activity = event.activity as
      | Array<Record<string, unknown>>
      | undefined;
    if (!Array.isArray(activity) || activity.length === 0) return;

    for (const item of activity) {
      const normalized = this.normalizeAlchemyActivity(item, chain);
      if (!normalized) continue;
      await this.processEvent(normalized);
    }
  }

  private normalizeAlchemyActivity(
    item: Record<string, unknown>,
    chain: Chain | null,
  ): NormalizedCryptoEvent | null {
    // Only process known networks; skip if the network couldn't be resolved.
    if (!chain) return null;
    const family = this.config.chainFamily(chain);

    const hash = item.hash as string;
    const from = ((item.fromAddress as string) || '').toLowerCase();
    const to = ((item.toAddress as string) || '').toLowerCase();
    const blockNum = parseInt(item.blockNum as string, 16);
    if (!hash || !to || !Number.isFinite(blockNum)) return null;

    const category = item.category as string;
    const asset = ((item.asset as string) || '').toUpperCase();
    const value = Number(item.value ?? 0);
    if (!Number.isFinite(value) || value <= 0) return null;

    // Determine currency
    let currency: Currency;
    if (category === 'external' || category === 'internal' || asset === 'ETH') {
      currency = Currency.ETH;
    } else if (asset === 'USDT') {
      currency = Currency.USDT;
    } else if (asset === 'USDC') {
      currency = Currency.USDC;
    } else {
      return null;
    }

    // Determine direction by checking which address is ours
    const isToOurs = this.depositRegistry.has(to, chain);
    const isFromOurs = this.depositRegistry.has(from, chain);

    // Handle reorg removals
    const log = item.log as Record<string, unknown> | undefined;
    const removed = log?.removed === true;

    // Reorg removals: always process to cancel pending deposits
    if (removed) {
      return {
        provider: 'alchemy',
        chain,
        family,
        direction: 'INBOUND',
        txHash: hash,
        fromAddress: from,
        toAddress: to,
        asset: currency,
        amount: value,
        blockNumber: blockNum,
        logIndex: log?.logIndex != null ? Number(log.logIndex) : undefined,
        removed: true,
      };
    }

    if (isToOurs) {
      return {
        provider: 'alchemy',
        chain,
        family,
        direction: 'INBOUND',
        txHash: hash,
        fromAddress: from,
        toAddress: to,
        asset: currency,
        amount: value,
        blockNumber: blockNum,
        logIndex: log?.logIndex != null ? Number(log.logIndex) : undefined,
      };
    }

    if (isFromOurs) {
      return {
        provider: 'alchemy',
        chain,
        family,
        direction: 'OUTBOUND',
        txHash: hash,
        fromAddress: from,
        toAddress: to,
        asset: currency,
        amount: value,
        blockNumber: blockNum,
        logIndex: log?.logIndex != null ? Number(log.logIndex) : undefined,
      };
    }

    return null;
  }

  // ─── BTC WebSocket Event Processing ─────────────────────────────────────

  /**
   * Processes a normalized BTC event from BtcAlchemyWebSocketService.
   * The WebSocket service handles address matching; this just normalizes
   * the event into the common format and processes it.
   */
  async processBtcEvent(
    event: Omit<NormalizedCryptoEvent, 'provider' | 'family'> & {
      provider: 'btc_websocket';
    },
  ): Promise<void> {
    await this.processEvent({ ...event, family: 'BTC' });
  }

  // ─── Core Event Processing ──────────────────────────────────────────────

  async processEvent(event: NormalizedCryptoEvent): Promise<void> {
    if (event.direction === 'INBOUND') {
      await this.processDeposit(event);
    } else {
      await this.processWithdrawalConfirmation(event);
    }
  }

  // ─── Deposit Processing ─────────────────────────────────────────────────

  private async processDeposit(event: NormalizedCryptoEvent): Promise<void> {
    // Handle reorg removal: cancel any PENDING deposit for this txHash
    if (event.removed) {
      await this.cancelRemovedDeposit(event.txHash);
      return;
    }

    // Idempotency: check if txHash already recorded
    const existing = await this.prisma.walletTransaction.findUnique({
      where: { reference: event.txHash },
    });
    if (existing) return;

    // Look up which wallets own this address
    const chain = event.chain;
    const address = this.config.isEvmChain(chain)
      ? event.toAddress.toLowerCase()
      : event.toAddress;
    const registrations = this.depositRegistry.lookup(address, chain);
    if (registrations.length === 0) return;

    for (const reg of registrations) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: reg.walletId },
      });
      if (!wallet || wallet.currency !== event.asset) continue;
      // A shared EVM-family address can belong to wallets on multiple chains
      // (ETH/BSC/POLYGON all share the same 0x). Attribute the deposit only to
      // the wallet on the network the webhook reported. Legacy 'EVM' values
      // resolve to the default ETH chain.
      if (!this.walletOnChain(wallet.chain, chain)) continue;

      const requiredConfirmations = this.config.confirmationsFor(chain);

      const canCreditImmediately = event.blockNumber > 0;

      const status = canCreditImmediately ? 'COMPLETED' : 'PENDING';
      const metadata = {
        source:
          event.provider === 'alchemy' ? 'ALCHEMY_WEBHOOK' : 'BTC_WEBSOCKET',
        listener: this.sourceListenerLabel(event),
        chain,
        blockTxId: event.txHash,
        asset: event.asset,
        address,
        sourceAddress: event.fromAddress,
        blockNumber: event.blockNumber,
        confirmations: canCreditImmediately ? requiredConfirmations : 0,
        receivedAt: new Date().toISOString(),
        swept: false,
      };

      try {
        await this.walletService.createTransaction({
          walletId: wallet.id,
          type: LedgerType.DEPOSIT,
          amount: event.amount,
          reference: event.txHash,
          status,
          metadata,
        });

        // Mark as resolved when deposited via webhook with confirmations
        if (status === 'COMPLETED') {
          const created = await this.prisma.walletTransaction.findUnique({
            where: { reference: event.txHash },
          });
          if (created && !created.resolvedAt) {
            await this.prisma.walletTransaction.update({
              where: { id: created.id },
              data: { resolvedAt: new Date() },
            });
          }
        }

        this.logger.log(
          `Deposit ${status}: ${event.amount} ${event.asset} to wallet ${wallet.id} (TX: ${event.txHash}, block ${event.blockNumber})`,
        );
      } catch (error) {
        const err = error as ErrorLike;
        if (err.code === 'P2002') {
          this.logger.debug(
            `Deposit ${event.txHash} already recorded for wallet ${wallet.id}; skipping`,
          );
        } else {
          this.logger.error(
            `Failed to record deposit ${event.txHash} for wallet ${wallet.id}: ${err.message}`,
          );
        }
      }
    }
  }

  private async cancelRemovedDeposit(txHash: string): Promise<void> {
    if (!txHash) return;
    const existing = await this.prisma.walletTransaction.findUnique({
      where: { reference: txHash },
    });
    if (!existing || existing.status !== 'PENDING') return;
    await this.walletService.updateTransactionStatus(existing.id, 'CANCELLED', {
      finalization: 'WEBHOOK_REORG_REMOVED',
      cancelledAt: new Date().toISOString(),
    });
    this.logger.warn(`Deposit cancelled (webhook reorg): ${txHash}`);
  }

  // ─── Withdrawal Confirmation Processing ─────────────────────────────────

  private async processWithdrawalConfirmation(
    event: NormalizedCryptoEvent,
  ): Promise<void> {
    // Look up a pending withdrawal job matching this txHash
    const job = await this.prisma.withdrawalJob.findUnique({
      where: { txHash: event.txHash },
    });
    if (!job || job.status !== 'PENDING') return;

    const required = this.config.confirmationsFor(event.chain);

    // Use the tracker's webhook confirmation path
    await this.tracker.confirmFromWebhook(event.txHash, required);
    this.logger.log(
      `Withdrawal confirmed via webhook: ${event.txHash} (${event.amount} ${event.asset})`,
    );
  }

  /** Human-readable listener label for a normalized event's metadata. */
  private sourceListenerLabel(event: NormalizedCryptoEvent): string {
    switch (event.provider) {
      case 'btc_websocket':
        return 'BTC_WEBSOCKET';
      case 'tron_poller':
        return 'TRON_POLLER';
      case 'alchemy':
        return this.config.isEvmChain(event.chain)
          ? `${event.chain}_WEBHOOK`
          : 'SOLANA_WEBHOOK';
    }
  }

  /**
   * Whether a wallet's stored `chain` value corresponds to the given event
   * chain. Legacy 'EVM' rows are treated as the default ETH chain; otherwise
   * the values must match exactly (e.g. BSC, SOLANA, TRON).
   */
  private walletOnChain(
    walletChain: string | null,
    eventChain: Chain | 'BTC',
  ): boolean {
    if (!walletChain) return false;
    if (this.config.isEvmChain(eventChain)) {
      return walletChain === eventChain || walletChain === 'EVM';
    }
    return walletChain === eventChain;
  }
}
