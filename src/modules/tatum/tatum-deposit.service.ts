import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { LedgerType } from '@src/generated/client';

@Injectable()
export class TatumDepositService {
  private readonly logger = new Logger(TatumDepositService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Processes an incoming deposit notification from a webhook.
   */
  async handleDepositNotification(payload: {
    address: String;
    amount: string;
    asset: string;
    txId: string;
    reference?: string;
  }) {
    const { address, amount, asset, txId } = payload;
    
    this.logger.log(`Processing deposit: ${amount} ${asset} to ${address} (TX: ${txId})`);

    // 1. Find the wallet associated with this address
    const wallet = await this.prisma.wallet.findUnique({
      where: { address: address as string },
      include: { user: true },
    });

    if (!wallet) {
      this.logger.warn(`No wallet found for address ${address}. Ignoring deposit.`);
      return;
    }

    // 2. Check if transaction already processed (idempotency)
    const existingTx = await this.prisma.walletTransaction.findUnique({
      where: { reference: txId },
    });

    if (existingTx) {
      this.logger.log(`Transaction ${txId} already processed. Skipping.`);
      return;
    }

    // 3. Create transaction and update balance
    await this.walletService.createTransaction({
      walletId: wallet.id,
      type: LedgerType.DEPOSIT,
      amount: parseFloat(amount),
      reference: txId,
      metadata: { 
        source: 'TATUM_WEBHOOK',
        blockTxId: txId,
        asset: asset,
        address: address,
      },
    });

    this.logger.log(`Successfully credited ${amount} ${asset} to user ${wallet.userId}`);
  }

  /**
   * Periodically syncs balance for critical wallets (Fallback mechanism).
   */
  async syncBalanceWithBlockchain(walletId: string) {
    // This would involve calling Tatum's address balance endpoint
    // and comparing it with local balance.
    // TODO: Implement in Phase 2
  }
}
