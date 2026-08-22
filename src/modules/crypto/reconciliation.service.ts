import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../../core/database/prisma.service';
import { CryptoConfigService } from './crypto-config.service';
import { Currency, LedgerType, Prisma } from '@src/generated/client';

interface ErrorLike {
  message?: string;
  code?: string;
}

interface XpubTxItem {
  txid: string;
  confirmations: number;
  blockHeight: number;
  value: string;
  vin: Array<{ addresses?: string[] }>;
  vout: Array<{ addresses?: string[]; value: string }>;
}

interface XpubResponse {
  page: number;
  totalPages: number;
  txs: XpubTxItem[];
  txids: string[];
}

export interface ReconciliationResult {
  resolved: number;
  missed: number;
  rollbacks: number;
  pending: number;
  skippedTestnet: number;
}

/**
 * Automated and on-demand BTC transaction reconciliation.
 *
 * Compares on-chain state (via Alchemy xpub endpoint) against DB
 * WalletTransaction records to detect:
 *   - Fully Resolved: on-chain confirmed + DB processed + resolvedAt set
 *   - Missed Event: confirmed on-chain, no DB record → auto-credit
 *   - Rollback Alert: DB COMPLETED, missing/reverted on-chain → revert + freeze
 *   - Pending Mempool: DB PENDING, 0 confirmations → hold
 *
 * EVM deposits are handled exclusively via Alchemy webhooks (push) and
 * do not require cron-based reconciliation.
 *
 * System testnet transactions (reference: testnet-credit-*) are ignored.
 */
@Injectable()
export class ReconciliationService implements OnModuleInit {
  private readonly logger = new Logger(ReconciliationService.name);
  private isRunning = false;

  private static readonly JOB_NAME = 'reconciliation';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: CryptoConfigService,
    private readonly httpService: HttpService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const cronExpression = this.config.reconciliationCron;
    const job = new CronJob(cronExpression, () => {
      void this.runAutomatedReconciliation();
    });
    this.schedulerRegistry.addCronJob(ReconciliationService.JOB_NAME, job);
    job.start();
    this.logger.log(`BTC reconciliation cron scheduled: ${cronExpression}`);
  }

  // ─── Automated Cron ────────────────────────────────────────────────────

  async runAutomatedReconciliation() {
    if (this.isRunning) {
      this.logger.debug('Reconciliation already in progress; skipping');
      return;
    }
    this.isRunning = true;
    try {
      this.logger.log('Starting automated BTC reconciliation…');
      const result = await this.reconcileAll();
      this.logger.log(
        `BTC reconciliation complete: resolved=${result.resolved} missed=${result.missed} rollbacks=${result.rollbacks} pending=${result.pending} skippedTestnet=${result.skippedTestnet}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`BTC reconciliation failed: ${err.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  // ─── Manual Trigger ────────────────────────────────────────────────────

  /** BTC-only reconciliation. */
  async reconcileAll(): Promise<ReconciliationResult> {
    return this.reconcileBtc();
  }

  /** Reconcile a single currency (BTC only). */
  async reconcileCurrency(currency: Currency): Promise<ReconciliationResult> {
    if (currency !== Currency.BTC) {
      this.logger.warn(
        `Reconciliation for ${currency} is not supported; only BTC is reconciled via cron`,
      );
      return this.emptyResult();
    }
    return this.reconcileBtc();
  }

  // ─── BTC Reconciliation (xpub endpoint) ────────────────────────────────

  private async reconcileBtc(): Promise<ReconciliationResult> {
    const result = this.emptyResult();
    const xpub = this.config.btcMasterXpub;
    if (!xpub) {
      this.logger.warn('BTC xpub not configured; skipping BTC reconciliation');
      return result;
    }

    const btcUrl = this.config.alchemyBtcHttpUrl;
    if (!btcUrl) {
      this.logger.warn(
        'ALCHEMY_BTC_HTTP_URL not configured; skipping BTC reconciliation',
      );
      return result;
    }

    // 1. Fetch all on-chain BTC transactions via xpub (paginate)
    const onChainTxs = await this.fetchBtcXpubTxs(btcUrl, xpub);
    const onChainTxMap = new Map<string, XpubTxItem>();
    for (const tx of onChainTxs) {
      onChainTxMap.set(tx.txid, tx);
    }
    this.logger.log(
      `BTC reconciliation: fetched ${onChainTxs.length} on-chain transactions`,
    );

    // 2. Fetch all unresolved BTC deposit transactions
    const unresolved = await this.prisma.walletTransaction.findMany({
      where: {
        resolvedAt: null,
        reference: { not: { startsWith: 'testnet-credit-' } },
        wallet: { currency: Currency.BTC },
      },
      include: {
        wallet: {
          select: { id: true, currency: true, address: true, isFrozen: true },
        },
      },
    });
    this.logger.log(
      `BTC reconciliation: ${unresolved.length} unresolved DB transactions`,
    );

    // 3. Classify each unresolved DB transaction
    for (const tx of unresolved) {
      const onChain = onChainTxMap.get(tx.reference);

      if (onChain) {
        // Found on-chain → mark resolved
        await this.markResolved(tx.id);
        result.resolved++;
      } else if (tx.status === 'COMPLETED') {
        // COMPLETED in DB but not on-chain → rollback
        await this.executeRollback(tx);
        result.rollbacks++;
      } else if (tx.status === 'PENDING') {
        // PENDING in DB, not on-chain → check if stale
        const age = Date.now() - tx.createdAt.getTime();
        const staleThreshold = 2 * 60 * 60 * 1000; // 2 hours
        if (age > staleThreshold) {
          // Stale pending → rollback
          await this.executeRollback(tx);
          result.rollbacks++;
        } else {
          result.pending++;
        }
      }
    }

    // 4. Check for missed events: on-chain txs with no DB record
    const allBtcRefs = new Set(
      (
        await this.prisma.walletTransaction.findMany({
          where: { wallet: { currency: Currency.BTC } },
          select: { reference: true },
        })
      ).map((r) => r.reference),
    );

    for (const onChainTx of onChainTxs) {
      if (allBtcRefs.has(onChainTx.txid)) continue;
      if (onChainTx.txid.startsWith('testnet-credit-')) {
        result.skippedTestnet++;
        continue;
      }

      // Missed event → find the receiving wallet and auto-credit
      const credited = await this.autoCreditBtcDeposit(onChainTx);
      if (credited) result.missed++;
    }

    return result;
  }

  private async fetchBtcXpubTxs(
    baseUrl: string,
    xpub: string,
  ): Promise<XpubTxItem[]> {
    const allTxs: XpubTxItem[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const url = `${baseUrl}/api/v2/xpub/${encodeURIComponent(xpub)}?details=txs&pageSize=1000&page=${page}`;
      try {
        const res = await lastValueFrom(
          this.httpService.get<XpubResponse>(url, { timeout: 30_000 }),
        );
        const data = res.data;
        allTxs.push(...(data.txs || []));
        totalPages = data.totalPages || 1;
        page++;
      } catch (error) {
        const err = error as ErrorLike;
        this.logger.error(
          `BTC xpub fetch failed (page ${page}): ${err.message}`,
        );
        break;
      }
    } while (page <= totalPages);

    return allTxs;
  }

  private async autoCreditBtcDeposit(tx: XpubTxItem): Promise<boolean> {
    // Find which of our addresses received in this tx
    const voutAddresses = tx.vout.flatMap((o) => o.addresses || []);
    for (const addr of voutAddresses) {
      const registrations = await this.prisma.wallet.findMany({
        where: { address: addr, currency: Currency.BTC },
        select: { id: true, currency: true, isFrozen: true },
      });

      for (const wallet of registrations) {
        if (wallet.isFrozen) continue;
        const amount = Math.abs(parseFloat(tx.value || '0'));
        if (amount <= 0) continue;

        try {
          await this.prisma.$transaction(async (prismaTx) => {
            await prismaTx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: LedgerType.DEPOSIT,
                status: 'COMPLETED',
                amount,
                reference: tx.txid,
                resolvedAt: new Date(),
                metadata: {
                  source: 'RECONCILIATION',
                  listener: 'BTC_RECONCILIATION',
                  blockTxId: tx.txid,
                  asset: Currency.BTC,
                  address: addr,
                  blockNumber: tx.blockHeight,
                  confirmations: tx.confirmations,
                  missedEvent: true,
                  receivedAt: new Date().toISOString(),
                },
              },
            });
            await prismaTx.wallet.update({
              where: { id: wallet.id },
              data: { balance: { increment: amount } },
            });
          });
          this.logger.log(
            `Missed BTC deposit auto-credited: ${amount} BTC to wallet ${wallet.id} (TX: ${tx.txid})`,
          );
          return true;
        } catch (error) {
          const err = error as ErrorLike;
          if (err.code === 'P2002') {
            this.logger.debug(
              `BTC deposit ${tx.txid} already recorded; skipping`,
            );
          } else {
            this.logger.error(
              `Failed to auto-credit BTC deposit ${tx.txid}: ${err.message}`,
            );
          }
        }
      }
    }
    return false;
  }

  // ─── Shared Helpers ────────────────────────────────────────────────────

  private async markResolved(transactionId: string): Promise<void> {
    await this.prisma.walletTransaction.update({
      where: { id: transactionId },
      data: { resolvedAt: new Date() },
    });
  }

  private async executeRollback(tx: {
    id: string;
    walletId: string;
    amount: Prisma.Decimal | number | string;
    reference: string;
    metadata: unknown;
  }): Promise<void> {
    const meta = (tx.metadata || {}) as Record<string, unknown>;
    this.logger.warn(
      `Rollback detected: ${tx.reference} — reverting ${String(tx.amount)} from wallet ${tx.walletId}`,
    );

    await this.prisma.$transaction(async (prismaTx) => {
      const wallet = await prismaTx.wallet.findUniqueOrThrow({
        where: { id: tx.walletId },
      });
      const newBalance = new Prisma.Decimal(wallet.balance.toString()).minus(
        new Prisma.Decimal(tx.amount),
      );

      // Debit the wallet balance
      await prismaTx.wallet.update({
        where: { id: tx.walletId },
        data: {
          balance: newBalance,
          isFrozen: true,
        },
      });

      // Mark the transaction as cancelled
      await prismaTx.walletTransaction.update({
        where: { id: tx.id },
        data: {
          status: 'CANCELLED',
          resolvedAt: new Date(),
          metadata: {
            ...meta,
            rollbackDetectedAt: new Date().toISOString(),
            rollbackReason:
              'Transaction missing/reverted on-chain during reconciliation',
          },
        },
      });

      // Create a reversal ledger entry
      await prismaTx.ledgerEntry.create({
        data: {
          walletId: tx.walletId,
          amount: new Prisma.Decimal(tx.amount).negated(),
          type: LedgerType.RECONCILIATION_ADJUSTMENT,
          reference: `${tx.reference}-rollback-${Date.now()}`,
          balanceAfter: newBalance,
          metadata: {
            reason: 'RECONCILIATION_ROLLBACK',
            originalReference: tx.reference,
          },
        },
      });
    });
  }

  private emptyResult(): ReconciliationResult {
    return {
      resolved: 0,
      missed: 0,
      rollbacks: 0,
      pending: 0,
      skippedTestnet: 0,
    };
  }
}
