import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { CryptoConfigService } from './crypto-config.service';
import { Currency, LedgerType } from '@src/generated/client';

interface ErrorLike {
  message?: string;
  code?: string;
}

/**
 * Lightweight BTC deposit processor. All deposit detection is now handled by
 * the webhook-based WebhookProcessorService (QuickNode Streams). This service
 * is retained as a minimal helper for status checks and any direct deposit
 * recording that may be needed outside the webhook path.
 */
@Injectable()
export class BtcDepositProcessorService {
  private readonly logger = new Logger(BtcDepositProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly config: CryptoConfigService,
  ) {}

  async getPendingCount(): Promise<number> {
    return this.prisma.walletTransaction.count({
      where: {
        type: LedgerType.DEPOSIT,
        status: 'PENDING',
        metadata: { path: ['listener'], equals: 'BTC_WEBHOOK' },
      },
    });
  }

  /**
   * Records a confirmed BTC deposit for a wallet. Idempotent on txHash.
   * Called by WebhookProcessorService; retained for external use.
   */
  async creditDeposit(params: {
    address: string;
    currency: Currency;
    amount: number;
    txHash: string;
    sourceAddress: string | null;
    confirmations: number;
    walletId: string;
  }): Promise<void> {
    const { amount, txHash, sourceAddress, confirmations, walletId } = params;

    const existing = await this.prisma.walletTransaction.findUnique({
      where: { reference: txHash },
    });
    if (existing) return;

    try {
      await this.walletService.createTransaction({
        walletId,
        type: LedgerType.DEPOSIT,
        amount,
        reference: txHash,
        status: 'COMPLETED',
        metadata: {
          source: 'QN_STREAMS',
          listener: 'BTC_WEBHOOK',
          blockTxId: txHash,
          asset: Currency.BTC,
          address: params.address,
          sourceAddress,
          confirmations,
          receivedAt: new Date().toISOString(),
        },
      });
      this.logger.log(
        `BTC deposit credited: ${amount} BTC to wallet ${walletId} (TX: ${txHash})`,
      );
    } catch (error) {
      const err = error as ErrorLike;
      if (err.code === 'P2002') {
        this.logger.debug(
          `BTC deposit ${txHash} already recorded for wallet ${walletId}; skipping`,
        );
      } else {
        this.logger.error(
          `Failed to credit BTC deposit ${txHash} to wallet ${walletId}: ${err.message}`,
        );
      }
    }
  }
}
