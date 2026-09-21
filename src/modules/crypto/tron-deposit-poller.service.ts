import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../../core/database/prisma.service';
import { CryptoConfigService } from './crypto-config.service';
import { DepositAddressRegistry } from './deposit-address-registry.service';
import { WebhookProcessorService } from './webhook-processor.service';
import { ChainClientService } from './chain-client.service';
import type { NormalizedCryptoEvent } from './webhook-processor.service';
import { Currency } from '@src/generated/client';

interface ErrorLike {
  message?: string;
}

/**
 * Scheduled TRON TRC-20 deposit poller.
 *
 * TRON does not use push webhooks (it is polled per the plan). Alchemy serves
 * TRON through an EVM-compatible JSON-RPC facade, so on a cron schedule this
 * poller queries `eth_getLogs` for TRC-20 `Transfer(address,address,uint256)`
 * events on each configured stablecoin contract, filtered to the platform's
 * deposit addresses (topic2 OR-list), converts recipients back to base58check
 * T-addresses, and hands inbound transfers to WebhookProcessorService for
 * idempotent deposit crediting (dedup on
 * `WalletTransaction.reference = txHash`). A ChainCursor row for 'TRON'
 * tracks breadth-first progress by block number.
 */
@Injectable()
export class TronDepositPollerService implements OnModuleInit {
  private readonly logger = new Logger(TronDepositPollerService.name);
  private isRunning = false;

  private static readonly JOB_NAME = 'tron_deposit_poller';

  constructor(
    private readonly chainClient: ChainClientService,
    private readonly config: CryptoConfigService,
    private readonly depositRegistry: DepositAddressRegistry,
    private readonly prisma: PrismaService,
    private readonly webhookProcessor: WebhookProcessorService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const cronExpression = this.config.tronPollCronSchedule;
    const job = new CronJob(cronExpression, () => {
      void this.pollTronDeposits();
    });
    this.schedulerRegistry.addCronJob(TronDepositPollerService.JOB_NAME, job);
    job.start();
    this.logger.log(`TRON deposit poller cron scheduled: ${cronExpression}`);
  }

  /** Single poll cycle: query TRC-20 Transfer logs and process inbound deposits. */
  async pollTronDeposits(): Promise<void> {
    if (this.isRunning) {
      this.logger.debug('TRON poll already in progress; skipping');
      return;
    }
    this.isRunning = true;
    try {
      const addresses = this.depositRegistry.addressesForChain('TRON');
      if (addresses.length === 0) {
        this.logger.debug('No active TRON deposit addresses to poll');
        return;
      }

      const active = new Set(addresses);
      const cursor = await this.getCursorBlock();

      for (const currency of [Currency.USDT, Currency.USDC]) {
        const contract = this.config.getStablecoinContractFor(
          'TRON',
          currency,
        );
        if (!contract) continue;
        let logs;
        try {
          logs = await this.chainClient.fetchTronTransferLogs(
            contract,
            addresses,
            200,
            cursor.lastBlock,
          );
        } catch (error) {
          const err = error as ErrorLike;
          this.logger.warn(
            `TRON TRC-20 log query failed for ${currency}: ${err.message}`,
          );
          continue;
        }
        for (const log of logs) {
          if (!active.has(log.to)) continue;
          const event = this.normalize(log, currency);
          if (!event) continue;
          await this.webhookProcessor.processEvent(event);
        }
        // Advance cursor past the newest block seen for this token.
        const lastBlock = logs.reduce(
          (max, l) => Math.max(max, l.blockNumber),
          cursor.lastBlock,
        );
        if (lastBlock > cursor.lastBlock) {
          await this.prisma.chainCursor.upsert({
            where: { chain: 'TRON' },
            update: { lastBlock },
            create: { chain: 'TRON', lastBlock },
          });
        }
      }
    } catch (error) {
      const err = error as ErrorLike;
      this.logger.error(`TRON deposit poll failed: ${err.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /** Reads the persisted TRON poll cursor (block number) or defaults to recent history. */
  private async getCursorBlock(): Promise<{ lastBlock: number }> {
    const row = await this.prisma.chainCursor.findUnique({
      where: { chain: 'TRON' },
    });
    if (row && row.lastBlock > 0) {
      return { lastBlock: row.lastBlock };
    }
    // Default: start from a recent window on the first run (fetchTronTransferLogs
    // also caps the span via TRON_LOG_BLOCK_SPAN when 'latest'-relative).
    return { lastBlock: 0 };
  }

  /** Converts a decoded TRC-20 Transfer log into a normalized deposit event. */
  private normalize(
    log: {
      txHash: string;
      amount: number;
      from: string;
      to: string;
      blockNumber: number;
    },
    currency: Currency,
  ): NormalizedCryptoEvent | null {
    if (!log.txHash) return null;
    if (!Number.isFinite(log.amount) || log.amount <= 0) return null;
    return {
      provider: 'tron_poller',
      chain: 'TRON',
      family: 'TRON',
      direction: 'INBOUND',
      txHash: log.txHash,
      fromAddress: log.from || '',
      toAddress: log.to || '',
      asset: currency,
      amount: log.amount,
      blockNumber: log.blockNumber,
      logIndex: undefined,
    };
  }
}
