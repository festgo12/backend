import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, retry, timer } from 'rxjs';
import { Currency, LedgerType } from '@src/generated/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TatumWalletService } from './tatum-wallet.service';

@Injectable()
export class TatumWithdrawalService {
  private readonly logger = new Logger(TatumWithdrawalService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tatum.io/v3';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly tatumWallet: TatumWalletService,
  ) {
    this.apiKey = this.configService.get<string>('TATUM_API_KEY') || '';
  }

  /**
   * Processes a withdrawal request.
   */
  async processWithdrawal(params: {
    walletId: string;
    amount: number;
    destinationAddress: string;
    currency: Currency;
  }) {
    const { walletId, amount, destinationAddress, currency } = params;

    // 1. Verify balance and reserve funds (handled by walletService usually)
    // But here we initiate the blockchain transfer
    
    try {
      this.logger.log(`Initiating withdrawal: ${amount} ${currency} to ${destinationAddress}`);

      // 2. Map to Tatum parameters
      const chain = this.mapCurrencyToChain(currency);
      const body = await this.buildTransferBody(currency, destinationAddress, amount.toString());

      // 3. Send Transaction
      const response = await lastValueFrom(
        this.httpService.post(
          `${this.baseUrl}/${chain}/transaction`,
          body,
          { headers: { 'x-api-key': this.apiKey } },
        ).pipe(
          retry({
            count: 2,
            delay: (error, retryCount) => timer(retryCount * 2000),
          }),
        ),
      );

      const txId = response.data.txId;

      // 4. Update transaction status in DB
      await this.prisma.walletTransaction.create({
        data: {
          walletId,
          type: LedgerType.WITHDRAWAL,
          amount: amount,
          status: 'PENDING',
          reference: txId,
          metadata: { 
            destination: destinationAddress,
            blockchain: chain,
            tatumResponse: response.data 
          },
        },
      });

      return { txId, status: 'PENDING' };
    } catch (error) {
      this.logger.error(`Withdrawal failed: ${error.message}`);
      throw error;
    }
  }

  private mapCurrencyToChain(currency: Currency): string {
    switch (currency) {
      case Currency.BTC: return 'bitcoin';
      case Currency.ETH:
      case Currency.USDT:
      case Currency.USDC: return 'ethereum';
      default: throw new Error(`Unsupported withdrawal currency: ${currency}`);
    }
  }

  private async buildTransferBody(currency: Currency, to: string, amount: string) {
    // In production, we'd get the mnemonic/key from a secure vault or HSM
    const mnemonic = this.configService.get<string>(`TATUM_${currency}_MNEMONIC`);
    
    switch (currency) {
      case Currency.BTC:
        return {
          fromAddress: [{ address: 'SENDER_ADDR_PLACEHOLDER', signatureId: 'KMS_ID_PLACEHOLDER' }], // Or direct mnemonic
          to: [{ address: to, value: parseFloat(amount) }],
        };
      case Currency.ETH:
        return {
          to,
          currency: 'ETH',
          amount,
          fromPrivateKey: 'PRIVATE_KEY_FROM_VAULT',
        };
      case Currency.USDT:
      case Currency.USDC:
        return {
          to,
          currency,
          amount,
          fromPrivateKey: 'PRIVATE_KEY_FROM_VAULT',
          fee: { gasLimit: '100000', gasPrice: '20' },
        };
      default:
        throw new Error(`Transfer body not implemented for ${currency}`);
    }
  }
}
