import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { CryptoConfigService } from './crypto-config.service';
import { LedgerType } from '@src/generated/client';

export interface EvmDepositProcessorStatus {
  enabled: boolean;
  pendingCount: number;
}

/**
 * Lightweight EVM deposit processor. All deposit detection is now handled by
 * the webhook-based WebhookProcessorService (Alchemy Address Activity). This
 * service provides status info and manages PENDING→COMPLETED finalization for
 * deposits that were recorded before reaching confirmation depth.
 */
@Injectable()
export class EvmDepositProcessorService {
  private readonly logger = new Logger(EvmDepositProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly config: CryptoConfigService,
  ) {}

  async getStatus(): Promise<EvmDepositProcessorStatus> {
    const pendingCount = await this.prisma.walletTransaction.count({
      where: {
        type: LedgerType.DEPOSIT,
        status: 'PENDING',
        metadata: { path: ['listener'], equals: 'EVM_WEBHOOK' },
      },
    });
    return {
      enabled: true,
      pendingCount,
    };
  }

  /**
   * Finalizes PENDING EVM deposits whose block has reached confirmation depth.
   * Called periodically as a safety net; the primary path is instant credit
   * via WebhookProcessorService when enough confirmations are present.
   */
  async finalizePendingDeposits(maxBlock: number): Promise<void> {
    if (maxBlock < 1) return;
    const pending = await this.prisma.walletTransaction.findMany({
      where: {
        type: LedgerType.DEPOSIT,
        status: 'PENDING',
        metadata: { path: ['listener'], equals: 'EVM_WEBHOOK' },
      },
      take: 200,
    });

    for (const tx of pending) {
      const meta = (tx.metadata ?? {}) as Record<string, unknown>;
      const blockNumber =
        typeof meta.blockNumber === 'number' ? meta.blockNumber : NaN;
      if (!Number.isFinite(blockNumber) || blockNumber > maxBlock) continue;

      const required = this.config.evmConfirmations;
      const confirmations = maxBlock - blockNumber + 1;
      if (confirmations < required) continue;

      await this.walletService.updateTransactionStatus(tx.id, 'COMPLETED', {
        confirmations,
        completedAt: new Date().toISOString(),
      });
      this.logger.log(
        `EVM deposit finalized: ${tx.amount.toNumber()} ${(meta.asset as string) ?? ''} wallet ${tx.walletId} (TX: ${tx.reference})`,
      );
    }
  }
}
