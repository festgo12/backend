import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { LedgerType, Currency } from '@src/generated/client';
import { TatumWalletService } from './tatum-wallet.service';
import { TatumRiskService } from './tatum-risk.service';
import { TatumWebhookService } from './tatum-webhook.service';

export const STABLECOIN_CONTRACTS: Record<string, string> = {
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
};

export const STABLECOIN_CONTRACTS_TESTNET: Record<string, string> = {
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
};

export const CRYPTO_CURRENCIES: Currency[] = [
  Currency.BTC,
  Currency.ETH,
  Currency.USDT,
  Currency.USDC,
];

/**
 * Resolves the ERC-20 contract for a stablecoin. An explicit env override
 * (`TATUM_<CURRENCY>_CONTRACT`) always wins; otherwise the network-appropriate
 * default is returned. Returns null when no contract is configured for the
 * active network (e.g. USDT on testnet, which has no official contract).
 */
export function getStablecoinContract(
  currency: string,
  configService: ConfigService,
): string | null {
  const override = configService.get<string>(`TATUM_${currency}_CONTRACT`);
  if (override) return override;

  const network = (
    configService.get<string>('TATUM_NETWORK', 'mainnet') || 'mainnet'
  ).toLowerCase();
  if (network === 'testnet') {
    return STABLECOIN_CONTRACTS_TESTNET[currency] || null;
  }
  return STABLECOIN_CONTRACTS[currency] || null;
}

@Injectable()
export class TatumDepositService {
  private readonly logger = new Logger(TatumDepositService.name);
  private readonly apiKey: string;
  private readonly dataBaseUrl = 'https://api.tatum.io/v4';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly tatumWallet: TatumWalletService,
    private readonly riskService: TatumRiskService,
    private readonly webhookService: TatumWebhookService,
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

    this.logger.log(
      `Processing deposit: ${amount} ${asset} to ${address} (TX: ${txId})`,
    );

    // 1. Find the wallet associated with this address
    const wallet = await this.prisma.wallet.findUnique({
      where: { address: address },
      include: { user: true },
    });

    if (!wallet) {
      this.logger.warn(
        `No wallet found for address ${address}. Ignoring deposit.`,
      );
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
              `Recording as FLAGGED for manual review.`,
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

          this.logger.log(
            `Flagged deposit recorded (PENDING): ${amount} ${asset} from ${sourceAddress} - requires review`,
          );
          return;
        }
      } catch (error: any) {
        this.logger.error(
          `Risk screening error during deposit: ${error.message}. Proceeding with deposit.`,
        );
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

    this.logger.log(
      `Deposit recorded (PENDING): ${amount} ${asset} to user ${wallet.userId}`,
    );
  }

  /**
   * Token-aware on-chain confirmation lookup for a transaction.
   */
  private async fetchConfirmations(
    asset: string,
    txId: string,
  ): Promise<number> {
    const currency = asset.toUpperCase() as Currency;
    if (!Object.values(Currency).includes(currency)) {
      return 0;
    }
    if (!CRYPTO_CURRENCIES.includes(currency)) {
      return 0;
    }
    const v4Chain = this.tatumWallet.mapCurrencyToV4Chain(currency);

    try {
      const response = await lastValueFrom(
        this.httpService.get(
          `${this.dataBaseUrl}/data/blockchains/transaction`,
          {
            params: { chain: v4Chain, hash: txId },
            headers: { 'x-api-key': this.apiKey },
          },
        ),
      );

      // Unified v4 responses (EVM and UTXO) expose the containing block height.
      const blockNumber = Number(response.data?.blockNumber || 0);
      if (!blockNumber) return 0;

      const info = await lastValueFrom(
        this.httpService.get(
          `${this.dataBaseUrl}/data/blockchains/block/current`,
          {
            params: { chain: v4Chain },
            headers: { 'x-api-key': this.apiKey },
          },
        ),
      );
      const latest = Number(info.data || 0);
      return latest >= blockNumber ? latest - blockNumber + 1 : 1;
    } catch (error: any) {
      this.logger.warn(
        `Failed to fetch confirmations for ${asset} tx ${txId}: ${error.response?.data?.message || error.message}`,
      );
      return 0;
    }
  }

  private getMinConfirmations(): number {
    return Number(this.configService.get<number>('TATUM_MIN_CONFIRMATIONS', 1));
  }

  /**
   * Confirms a PENDING deposit once it has enough on-chain confirmations.
   */
  async confirmDeposit(
    txId: string,
  ): Promise<{ confirmed: boolean; confirmations: number; reason?: string }> {
    const tx = await this.prisma.walletTransaction.findUnique({
      where: { reference: txId },
    });

    if (!tx) return { confirmed: false, confirmations: 0, reason: 'not_found' };
    if (tx.status === 'COMPLETED')
      return { confirmed: true, confirmations: 0, reason: 'already_completed' };
    if (tx.type !== LedgerType.DEPOSIT)
      return { confirmed: false, confirmations: 0, reason: 'not_a_deposit' };

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: tx.walletId },
    });
    if (!wallet)
      return { confirmed: false, confirmations: 0, reason: 'wallet_not_found' };

    // NGN (fiat) deposits are confirmed via Paystack webhooks, not on-chain.
    if (!CRYPTO_CURRENCIES.includes(wallet.currency)) {
      return { confirmed: false, confirmations: 0, reason: 'non_crypto_asset' };
    }

    const confirmations = await this.fetchConfirmations(wallet.currency, txId);
    if (confirmations >= this.getMinConfirmations()) {
      await this.walletService.updateTransactionStatus(tx.id, 'COMPLETED', {
        confirmations,
        confirmedAt: new Date().toISOString(),
      });
      this.logger.log(
        `Deposit ${txId} confirmed with ${confirmations} confirmations`,
      );
      return { confirmed: true, confirmations };
    }

    return { confirmed: false, confirmations };
  }

  /**
   * Scans all PENDING deposits and confirms those with sufficient confirmations.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async confirmPendingDeposits(): Promise<{
    scanned: number;
    confirmed: number;
  }> {
    const pending = await this.prisma.walletTransaction.findMany({
      where: {
        type: LedgerType.DEPOSIT,
        status: 'PENDING',
        wallet: {
          currency: {
            in: CRYPTO_CURRENCIES,
          },
        },
      },
      take: 100,
    });

    let confirmed = 0;
    for (const tx of pending) {
      try {
        const result = await this.confirmDeposit(tx.reference);
        if (result.confirmed) confirmed++;
      } catch (error: any) {
        this.logger.error(
          `Failed to confirm deposit ${tx.reference}: ${error.message}`,
        );
      }
    }

    if (pending.length > 0) {
      this.logger.log(
        `Deposit confirmation sweep: scanned ${pending.length}, confirmed ${confirmed}`,
      );
    }
    return { scanned: pending.length, confirmed };
  }

  /**
   * Confirms a PENDING withdrawal once it has enough on-chain confirmations.
   * Withdrawals are completed by polling rather than webhooks (outgoing
   * alerts only cover platform fee-wallet sweeps in Tatum v4).
   */
  async confirmWithdrawal(
    txId: string,
  ): Promise<{ confirmed: boolean; confirmations: number; reason?: string }> {
    const tx = await this.prisma.walletTransaction.findUnique({
      where: { reference: txId },
    });

    if (!tx) return { confirmed: false, confirmations: 0, reason: 'not_found' };
    if (tx.status === 'COMPLETED')
      return { confirmed: true, confirmations: 0, reason: 'already_completed' };
    if (tx.type !== LedgerType.WITHDRAWAL)
      return { confirmed: false, confirmations: 0, reason: 'not_a_withdrawal' };

    const wallet = await this.prisma.wallet.findUnique({
      where: { id: tx.walletId },
    });
    if (!wallet)
      return { confirmed: false, confirmations: 0, reason: 'wallet_not_found' };

    if (!CRYPTO_CURRENCIES.includes(wallet.currency)) {
      return { confirmed: false, confirmations: 0, reason: 'non_crypto_asset' };
    }

    const confirmations = await this.fetchConfirmations(wallet.currency, txId);
    if (confirmations >= this.getMinConfirmations()) {
      await this.webhookService.markTransactionAsCompleted(txId);
      this.logger.log(
        `Withdrawal ${txId} confirmed with ${confirmations} confirmations`,
      );
      return { confirmed: true, confirmations };
    }

    return { confirmed: false, confirmations };
  }

  /**
   * Scans all PENDING withdrawals and confirms those with sufficient
   * on-chain confirmations.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async confirmPendingWithdrawals(): Promise<{
    scanned: number;
    confirmed: number;
  }> {
    const pending = await this.prisma.walletTransaction.findMany({
      where: {
        type: LedgerType.WITHDRAWAL,
        status: 'PENDING',
        wallet: {
          currency: {
            in: CRYPTO_CURRENCIES,
          },
        },
      },
      take: 100,
    });

    let confirmed = 0;
    for (const tx of pending) {
      try {
        const result = await this.confirmWithdrawal(tx.reference);
        if (result.confirmed) confirmed++;
      } catch (error: any) {
        this.logger.error(
          `Failed to confirm withdrawal ${tx.reference}: ${error.message}`,
        );
      }
    }

    if (pending.length > 0) {
      this.logger.log(
        `Withdrawal confirmation sweep: scanned ${pending.length}, confirmed ${confirmed}`,
      );
    }
    return { scanned: pending.length, confirmed };
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
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
    if (!wallet || !wallet.address) {
      this.logger.warn(
        `Cannot sync wallet ${walletId}: not found or no address`,
      );
      return {
        synced: false,
        onChainBalance: 0,
        localBalance: 0,
        discrepancy: 0,
      };
    }

    const v4Chain = this.tatumWallet.mapCurrencyToV4Chain(wallet.currency);

    try {
      let onChainBalance: number;

      if (
        wallet.currency === Currency.USDT ||
        wallet.currency === Currency.USDC
      ) {
        const contract = getStablecoinContract(
          wallet.currency,
          this.configService,
        );
        if (!contract) {
          this.logger.warn(
            `No ${wallet.currency} contract configured for the active network. Skipping on-chain sync for wallet ${walletId}.`,
          );
          return {
            synced: false,
            onChainBalance: 0,
            localBalance: wallet.balance.toNumber(),
            discrepancy: 0,
          };
        }

        const response = await lastValueFrom(
          this.httpService.get(`${this.dataBaseUrl}/data/wallet/portfolio`, {
            params: {
              chain: v4Chain,
              addresses: wallet.address,
              tokenTypes: 'fungible',
            },
            headers: { 'x-api-key': this.apiKey },
          }),
        );
        const match = (response.data?.result || []).find(
          (r: any) =>
            r.tokenAddress &&
            String(r.tokenAddress).toLowerCase() === contract.toLowerCase(),
        );
        onChainBalance = parseFloat(match?.balance || '0');
      } else {
        const response = await lastValueFrom(
          this.httpService.get(`${this.dataBaseUrl}/data/blockchains/balance`, {
            params: { chain: v4Chain, address: wallet.address },
            headers: { 'x-api-key': this.apiKey },
          }),
        );
        onChainBalance = parseFloat(response.data?.balance || '0');
      }

      const localBalance = wallet.balance.toNumber();
      const discrepancy = Math.abs(onChainBalance - localBalance);

      if (discrepancy > 0.00000001) {
        this.logger.warn(
          `Balance discrepancy for wallet ${walletId} (${wallet.currency}): ` +
            `on-chain=${onChainBalance}, local=${localBalance}, diff=${discrepancy}`,
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
      this.logger.error(
        `Failed to sync balance for wallet ${walletId}: ${error.message}`,
      );
      return {
        synced: false,
        onChainBalance: 0,
        localBalance: wallet.balance.toNumber(),
        discrepancy: 0,
      };
    }
  }

  /**
   * Batch sync all crypto wallets with on-chain balances.
   */
  async syncAllWallets(): Promise<{
    total: number;
    synced: number;
    discrepancies: number;
  }> {
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

    this.logger.log(
      `Balance sync complete: ${synced}/${wallets.length} synced, ${discrepancies} discrepancies`,
    );
    return { total: wallets.length, synced, discrepancies };
  }
}
