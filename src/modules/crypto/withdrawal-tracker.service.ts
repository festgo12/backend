import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { ChainClientService } from './chain-client.service';
import { CryptoConfigService } from './crypto-config.service';
import { Currency, Prisma, WithdrawalJob } from '@src/generated/client';
import { Chain } from './crypto-config.service';

const MAX_ATTEMPTS = 60;
const MAX_BACKOFF_SEC = 600;

interface ErrorLike {
  message?: string;
}

/** Narrow a stored chain string to the config `Chain` type (non-BTC). */
function asChain(chain: string): Chain {
  return chain as Chain;
}

/**
 * Hybrid withdrawal confirmation queue.
 *
 * Primary path: WebhookProcessorService receives a push notification from
 * Alchemy (EVM) or BtcAlchemyWebSocketService (BTC) when the outgoing tx
 * is mined, and calls confirmFromWebhook() for instant finalization.
 *
 * Fallback path: A 30-second cron polls the chain directly for any pending
 * jobs that were not confirmed via webhook within the expected window.
 */
@Injectable()
export class WithdrawalTrackerService {
  private readonly logger = new Logger(WithdrawalTrackerService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly chainClient: ChainClientService,
    private readonly config: CryptoConfigService,
  ) {}

  async enqueue(params: {
    txHash: string;
    walletId: string;
    currency: Currency;
    chain: string;
    amount: number;
    destination: string;
    metadata?: Record<string, unknown>;
  }) {
    const {
      txHash,
      walletId,
      currency,
      chain,
      amount,
      destination,
      metadata,
    } = params;
    return this.prisma.withdrawalJob.create({
      data: {
        txHash,
        walletId,
        currency,
        chain,
        amount,
        destination,
        metadata: (metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  // ─── Webhook Confirmation (Primary Path) ────────────────────────────────

  /**
   * Called by WebhookProcessorService when an outbound transaction is detected
   * via webhook push. Immediately finalizes if enough confirmations are met;
   * otherwise stores the confirmation count for the polling fallback.
   */
  async confirmFromWebhook(
    txHash: string,
    requiredConfirmations: number,
  ): Promise<void> {
    const job = await this.prisma.withdrawalJob.findUnique({
      where: { txHash },
    });
    if (!job || job.status !== 'PENDING') return;

    // Detect on-chain failure/revert for EVM-family and TRON chains.
    const chain = job.chain as string | null;
    if (chain && chain !== 'BTC') {
      if (this.config.isEvmChain(asChain(chain))) {
        const receipt = await this.chainClient.getEvmReceipt(txHash);
        if (receipt && receipt.status === 0) {
          await this.finalize(job, 'FAILED', {
            lastError: 'Transaction reverted on-chain',
            confirmedVia: 'webhook',
            failedAt: new Date().toISOString(),
          });
          return;
        }
      } else if (chain === 'TRON') {
        const receipt = await this.chainClient.getTronReceipt(txHash);
        if (receipt && !receipt.confirmed) {
          await this.finalize(job, 'FAILED', {
            lastError: 'Transaction reverted on-chain',
            confirmedVia: 'webhook',
            failedAt: new Date().toISOString(),
          });
          return;
        }
      }
    }

    // Store the webhook confirmation — the cron fallback will finalize
    // when enough confirmations accumulate
    const currentMeta = (job.metadata ?? {}) as Record<string, unknown>;
    await this.prisma.withdrawalJob.update({
      where: { id: job.id },
      data: {
        metadata: {
          ...currentMeta,
          webhookConfirmed: true,
          webhookConfirmations: requiredConfirmations,
          lastWebhookAt: new Date().toISOString(),
        },
      },
    });

    // If already at enough confirmations, finalize immediately
    await this.finalize(job, 'CONFIRMED', {
      confirmations: requiredConfirmations,
      confirmedVia: 'webhook',
      confirmedAt: new Date().toISOString(),
    });
  }

  // ─── Polling Fallback (Cron) ───────────────────────────────────────────

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      const due = await this.prisma.withdrawalJob.findMany({
        where: { status: 'PENDING', nextPollAt: { lte: new Date() } },
        take: 20,
        orderBy: { nextPollAt: 'asc' },
      });

      for (const job of due) {
        try {
          await this.poll(job);
        } catch (error) {
          const err = error as ErrorLike;
          this.logger.error(
            `Failed to poll withdrawal ${job.txHash}: ${err.message}`,
          );
        }
      }
    } catch (error) {
      const err = error as ErrorLike;
      this.logger.error(`Withdrawal queue processing error: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Polls the chain for a single job. On CONFIRMED the linked WalletTransaction
   * is marked COMPLETED; on FAILED it is marked FAILED for admin retry.
   */
  private async poll(job: WithdrawalJob) {
    const chain = (job.chain as string) || 'BTC';

    let confirmed = false;
    let failed = false;
    let confirmations = 0;
    let pollError: string | null = null;

    if (chain === 'BTC') {
      const tip = await this.chainClient.getBtcTipHeight();
      const status = await this.chainClient.getBtcTxStatus(job.txHash);
      if (status.error) {
        pollError = status.error;
      } else if (status.confirmed) {
        confirmations = status.blockHeight ? tip - status.blockHeight + 1 : 1;
        confirmed = confirmations >= this.config.btcConfirmations;
      }
    } else {
      const chainConfirmations = this.config.confirmationsFor(asChain(chain));
      if (this.config.isEvmChain(asChain(chain))) {
        const receipt = await this.chainClient.getEvmReceipt(job.txHash);
        if (receipt) {
          if (receipt.status === 0) {
            failed = true;
          } else {
            const latest = await this.chainClient.getLatestEvmBlock();
            confirmations = latest - receipt.blockNumber + 1;
            confirmed = confirmations >= chainConfirmations;
          }
        } else {
          pollError = 'transaction not found yet';
        }
      } else if (chain === 'SOLANA') {
        const sigs = await this.chainClient.getSolanaSignatureStatuses(job.txHash);
        if (sigs !== null) {
          confirmations = sigs;
          confirmed = confirmations >= chainConfirmations;
        } else {
          pollError = 'transaction not found yet';
        }
      } else if (chain === 'TRON') {
        const receipt = await this.chainClient.getTronReceipt(job.txHash);
        if (receipt) {
          if (receipt.confirmed) {
            confirmations = 1;
            confirmed = confirmations >= chainConfirmations;
          } else {
            failed = true;
          }
        } else {
          pollError = 'transaction not found yet';
        }
      } else {
        pollError = `unsupported chain for polling: ${chain}`;
      }
    }

    if (confirmed) {
      await this.finalize(job, 'CONFIRMED', {
        confirmations,
        confirmedVia: 'polling',
        confirmedAt: new Date().toISOString(),
      });
      return;
    }

    if (failed) {
      await this.finalize(job, 'FAILED', {
        lastError: 'Transaction reverted on-chain',
        confirmedVia: 'polling',
        failedAt: new Date().toISOString(),
      });
      return;
    }

    const attempts = job.attempts + 1;
    const exhausted = attempts >= MAX_ATTEMPTS;
    const backoffSec = Math.min(
      20 * 2 ** Math.min(attempts, 8),
      MAX_BACKOFF_SEC,
    );

    if (exhausted) {
      await this.finalize(job, 'FAILED', {
        lastError: 'Withdrawal not confirmed within the polling window',
        pollError: pollError || null,
        failedAt: new Date().toISOString(),
      });
      return;
    }

    await this.prisma.withdrawalJob.update({
      where: { id: job.id },
      data: { attempts, nextPollAt: new Date(Date.now() + backoffSec * 1000) },
    });
  }

  private async finalize(
    job: Pick<WithdrawalJob, 'id' | 'txHash' | 'metadata'>,
    status: string,
    extraMetadata: Record<string, unknown>,
  ) {
    await this.prisma.withdrawalJob.update({
      where: { id: job.id },
      data: {
        status,
        metadata: {
          ...((job.metadata ?? {}) as Record<string, unknown>),
          ...extraMetadata,
        } as Prisma.InputJsonValue,
      },
    });

    const transaction = await this.prisma.walletTransaction.findUnique({
      where: { reference: job.txHash },
    });
    const transactionStatus = status === 'CONFIRMED' ? 'COMPLETED' : 'FAILED';
    if (transaction && transaction.status !== transactionStatus) {
      await this.walletService.updateTransactionStatus(
        transaction.id,
        transactionStatus,
        extraMetadata,
      );

      // Set resolvedAt when withdrawal is confirmed on-chain
      if (status === 'CONFIRMED') {
        await this.prisma.walletTransaction.update({
          where: { id: transaction.id },
          data: { resolvedAt: new Date() },
        });
      }

      const via =
        typeof extraMetadata.confirmedVia === 'string'
          ? extraMetadata.confirmedVia
          : 'unknown';
      this.logger.log(
        `Withdrawal ${job.txHash} ${status === 'CONFIRMED' ? 'confirmed' : 'failed'} (via ${via})`,
      );
    }
  }
}
