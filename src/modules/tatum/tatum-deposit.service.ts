import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { LedgerType } from '@src/generated/client';
import { TatumWalletService } from './tatum-wallet.service';
import { TatumRiskService } from './tatum-risk.service';

@Injectable()
export class TatumDepositService {
  private readonly logger = new Logger(TatumDepositService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tatum.io/v3';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly tatumWallet: TatumWalletService,
    private readonly riskService: TatumRiskService,
  ) {
    this.apiKey = this.configService.get<string>('TATUM_API_KEY') || '';
  }

  /**
   * Processes an incoming deposit notification from a webhook.
   * Includes risk screening on the source address.
   */
  async handleDepositNotification(payload: {
    address: string;
    amount: string;
    asset: string;
    txId: string;
    reference?: string;
    sourceAddress?: string;
  }) {
    const { address, amount, asset, txId, sourceAddress } = payload;

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

    // 2. Check idempotency
    const existingTx = await this.prisma.walletTransaction.findUnique({
      where: { reference: txId },
    });

    if (existingTx) {
      this.logger.log(`Transaction ${txId} already processed. Skipping.`);
      return;
    }

    // 3. Risk screening on source address (if provided)
    if (sourceAddress) {
      try {
        const riskResult = await this.riskService.screenDeposit({
          walletId: wallet.id,
          amount: parseFloat(amount),
          sourceAddress,
          currency: asset,
        });

        if (!riskResult.safe) {
          this.logger.warn(
            `Deposit flagged by risk screening: ${amount} ${asset} from ${sourceAddress}. ` +
            `Score: ${riskResult.riskScore}, Reasons: ${riskResult.reasons.join('; ')}. ` +
            `Recording as FLAGGED for manual review.`
          );

          // Still record the deposit but mark it for manual review
          await this.walletService.createTransaction({
            walletId: wallet.id,
            type: LedgerType.DEPOSIT,
            amount: parseFloat(amount),
            reference: txId,
            status: 'PENDING',
            metadata: {
              source: 'TATUM_WEBHOOK',
              blockTxId: txId,
              asset,
              address,
              sourceAddress,
              riskFlagged: true,
              riskScore: riskResult.riskScore,
              riskReasons: riskResult.reasons,
              receivedAt: new Date().toISOString(),
            },
          });

          this.logger.log(`Flagged deposit recorded (PENDING): ${amount} ${asset} from ${sourceAddress} - requires review`);
          return;
        }
      } catch (error: any) {
        this.logger.error(`Risk screening error during deposit: ${error.message}. Proceeding with deposit.`);
      }
    }

    // 4. Create PENDING deposit transaction
    await this.walletService.createTransaction({
      walletId: wallet.id,
      type: LedgerType.DEPOSIT,
      amount: parseFloat(amount),
      reference: txId,
      metadata: {
        source: 'TATUM_WEBHOOK',
        blockTxId: txId,
        asset,
        address,
        sourceAddress: sourceAddress || null,
        receivedAt: new Date().toISOString(),
      },
    });

    this.logger.log(`Deposit recorded (PENDING): ${amount} ${asset} to user ${wallet.userId}`);
  }

  /**
   * Syncs a wallet's local balance with on-chain balance from Tatum.
   */
  async syncBalanceWithBlockchain(walletId: string): Promise<{
    synced: boolean;
    onChainBalance: number;
    localBalance: number;
    discrepancy: number;
  }> {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet || !wallet.address) {
      this.logger.warn(`Cannot sync wallet ${walletId}: not found or no address`);
      return { synced: false, onChainBalance: 0, localBalance: 0, discrepancy: 0 };
    }

    const chain = this.tatumWallet.mapCurrencyToChain(wallet.currency);

    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/${chain}/balance/${wallet.address}`, {
          headers: { 'x-api-key': this.apiKey },
        }),
      );

      const onChainBalance = parseFloat(response.data?.balance || '0');
      const localBalance = wallet.balance.toNumber();
      const discrepancy = Math.abs(onChainBalance - localBalance);

      if (discrepancy > 0.00000001) {
        this.logger.warn(
          `Balance discrepancy for wallet ${walletId} (${wallet.currency}): ` +
          `on-chain=${onChainBalance}, local=${localBalance}, diff=${discrepancy}`
        );

        await this.prisma.balanceSnapshot.create({
          data: {
            walletId,
            balance: wallet.balance,
            ledgerId: null,
          },
        });
      }

      return { synced: true, onChainBalance, localBalance, discrepancy };
    } catch (error: any) {
      this.logger.error(`Failed to sync balance for wallet ${walletId}: ${error.message}`);
      return { synced: false, onChainBalance: 0, localBalance: wallet.balance.toNumber(), discrepancy: 0 };
    }
  }

  /**
   * Batch sync all crypto wallets with on-chain balances.
   */
  async syncAllWallets(): Promise<{ total: number; synced: number; discrepancies: number }> {
    const wallets = await this.prisma.wallet.findMany({
      where: {
        currency: { not: 'NGN' as any },
        address: { not: null },
      },
    });

    let synced = 0;
    let discrepancies = 0;

    for (const wallet of wallets) {
      const result = await this.syncBalanceWithBlockchain(wallet.id);
      if (result.synced) synced++;
      if (result.discrepancy > 0.00000001) discrepancies++;
    }

    this.logger.log(`Balance sync complete: ${synced}/${wallets.length} synced, ${discrepancies} discrepancies`);
    return { total: wallets.length, synced, discrepancies };
  }
}
