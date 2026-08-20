import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { CryptoConfigService } from './crypto-config.service';
import { WithdrawalTrackerService } from './withdrawal-tracker.service';
import { Currency, LedgerType } from '@src/generated/client';

interface ErrorLike {
  message?: string;
  code?: string;
}

/** Normalized event produced by Alchemy normalizer and BTC WebSocket service. */
export interface NormalizedCryptoEvent {
  provider: 'alchemy' | 'btc_websocket';
  chain: 'EVM' | 'BTC';
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

  async processAlchemyEvent(payload: Record<string, unknown>): Promise<void> {
    const event = payload.event as Record<string, unknown> | undefined;
    if (!event) return;

    const activity = event.activity as
      | Array<Record<string, unknown>>
      | undefined;
    if (!Array.isArray(activity) || activity.length === 0) return;

    for (const item of activity) {
      const normalized = this.normalizeAlchemyActivity(item);
      if (!normalized) continue;
      await this.processEvent(normalized);
    }
  }

  private normalizeAlchemyActivity(
    item: Record<string, unknown>,
  ): NormalizedCryptoEvent | null {
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
    const isToOurs = this.depositRegistry.has(to, 'EVM');
    const isFromOurs = this.depositRegistry.has(from, 'EVM');

    // Handle reorg removals
    const log = item.log as Record<string, unknown> | undefined;
    const removed = log?.removed === true;

    // Reorg removals: always process to cancel pending deposits
    if (removed) {
      return {
        provider: 'alchemy',
        chain: 'EVM',
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
        chain: 'EVM',
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
        chain: 'EVM',
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
    event: Omit<NormalizedCryptoEvent, 'provider'> & {
      provider: 'btc_websocket';
    },
  ): Promise<void> {
    await this.processEvent(event);
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
    const address =
      chain === 'EVM' ? event.toAddress.toLowerCase() : event.toAddress;
    const registrations = this.depositRegistry.lookup(address, chain);
    if (registrations.length === 0) return;

    for (const reg of registrations) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { id: reg.walletId },
      });
      if (!wallet || wallet.currency !== event.asset) continue;

      const requiredConfirmations =
        event.chain === 'EVM'
          ? this.config.evmConfirmations
          : this.config.btcConfirmations;

      const canCreditImmediately = event.blockNumber > 0;

      const status = canCreditImmediately ? 'COMPLETED' : 'PENDING';
      const metadata = {
        source:
          event.provider === 'alchemy' ? 'ALCHEMY_WEBHOOK' : 'BTC_WEBSOCKET',
        listener:
          event.provider === 'alchemy' ? 'EVM_WEBHOOK' : 'BTC_WEBSOCKET',
        blockTxId: event.txHash,
        asset: event.asset,
        address,
        sourceAddress: event.fromAddress,
        blockNumber: event.blockNumber,
        confirmations: canCreditImmediately ? requiredConfirmations : 0,
        receivedAt: new Date().toISOString(),
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

    const required =
      event.chain === 'EVM'
        ? this.config.evmConfirmations
        : this.config.btcConfirmations;

    // Use the tracker's webhook confirmation path
    await this.tracker.confirmFromWebhook(event.txHash, required);
    this.logger.log(
      `Withdrawal confirmed via webhook: ${event.txHash} (${event.amount} ${event.asset})`,
    );
  }
}
