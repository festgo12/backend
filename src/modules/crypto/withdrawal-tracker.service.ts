import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { ChainClientService } from './chain-client.service';
import { CryptoConfigService } from './crypto-config.service';
import { Currency, Prisma, WithdrawalJob } from '@src/generated/client';

const MAX_ATTEMPTS = 60;
const MAX_BACKOFF_SEC = 600;

interface ErrorLike {
  message?: string;
}

/**
 * Database-backed withdrawal confirmation queue (mirrors the notifications
 * queue pattern). A WithdrawalJob row is created when a local (Alchemy)
 * withdrawal is broadcast; a cron worker polls the chain until the
 * transaction is CONFIRMED or FAILED and then finalises the corresponding
 * WalletTransaction (which creates the ledger debit on COMPLETED).
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
    amount: number;
    destination: string;
    metadata?: Record<string, unknown>;
  }) {
    const { txHash, walletId, currency, amount, destination, metadata } =
      params;
    return this.prisma.withdrawalJob.create({
      data: {
        txHash,
        walletId,
        currency,
        amount,
        destination,
        metadata: (metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async processQueue() {
    if (!this.config.isAlchemy || this.isProcessing) return;
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
   * Polls the chain for a single job and updates its status. On CONFIRMED the
   * linked WalletTransaction is marked COMPLETED (creating the ledger debit);
   * on FAILED the transaction is marked FAILED for admin retry.
   */
  private async poll(job: WithdrawalJob) {
    const currency = job.currency;

    let confirmed = false;
    let failed = false;
    let confirmations = 0;
    let pollError: string | null = null;

    if (currency === Currency.BTC) {
      const tip = await this.chainClient.getBtcTipHeight();
      const status = await this.chainClient.getBtcTx(job.txHash);
      if (status.error) {
        pollError = status.error;
      } else if (status.confirmed) {
        confirmations = status.blockHeight ? tip - status.blockHeight + 1 : 1;
        confirmed = confirmations >= this.config.btcConfirmations;
      }
    } else {
      const receipt = await this.chainClient.getEvmReceipt(job.txHash);
      if (receipt) {
        if (receipt.status === 0) {
          failed = true;
        } else {
          const latest = await this.chainClient.getLatestEvmBlock();
          confirmations = latest - receipt.blockNumber + 1;
          confirmed = confirmations >= this.config.evmConfirmations;
        }
      } else {
        pollError = 'transaction not found yet';
      }
    }

    if (confirmed) {
      await this.finalize(job, 'CONFIRMED', {
        confirmations,
        confirmedAt: new Date().toISOString(),
      });
      return;
    }

    if (failed) {
      await this.finalize(job, 'FAILED', {
        lastError: 'Transaction reverted on-chain',
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
      this.logger.log(
        `Withdrawal ${job.txHash} ${status === 'CONFIRMED' ? 'confirmed' : 'failed'}`,
      );
    }
  }
}
