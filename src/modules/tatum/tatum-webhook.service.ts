import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import * as crypto from 'crypto';

@Injectable()
export class TatumWebhookService {
  private readonly logger = new Logger(TatumWebhookService.name);
  private readonly hmacSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {
    this.hmacSecret = this.configService.get<string>('TATUM_WEBHOOK_SECRET') || '';
  }

  /**
   * Verifies the HMAC signature from Tatum.
   */
  verifySignature(payload: any, signature: string): boolean {
    if (!this.hmacSecret || !signature) {
      // In development, we might skip signature check if secret not provided
      if (this.configService.get('NODE_ENV') !== 'production') return true;
      return false;
    }

    const hmac = crypto.createHmac('sha256', this.hmacSecret);
    const body = JSON.stringify(payload);
    const digest = hmac.update(body).digest('hex');

    return digest === signature;
  }

  /**
   * Marks a pending transaction as completed.
   */
  async markTransactionAsCompleted(txId: string) {
    try {
      const transaction = await this.prisma.walletTransaction.findUnique({
        where: { reference: txId },
      });

      if (!transaction) {
        this.logger.warn(`Transaction with reference ${txId} not found.`);
        return;
      }

      await this.walletService.updateTransactionStatus(transaction.id, 'COMPLETED');
      this.logger.log(`Transaction ${txId} marked as COMPLETED and balance synced.`);
    } catch (error) {
      this.logger.error(`Failed to mark transaction ${txId} as completed: ${error.message}`);
    }
  }
}
