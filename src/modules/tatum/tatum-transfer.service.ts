import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, retry, timer } from 'rxjs';
import { Currency, LedgerType } from '@src/generated/client';
import { PrismaService } from '../../core/database/prisma.service';
import { TatumWalletService } from './tatum-wallet.service';

/**
 * Custodial on-chain transfer executor.
 * All funds live on platform-controlled addresses derived from the internal
 * xpub/mnemonic. This service builds token-aware transfer bodies and broadcasts
 * them to Tatum, returning the resulting blockchain txId.
 */
@Injectable()
export class TatumTransferService {
  private readonly logger = new Logger(TatumTransferService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tatum.io/v3';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly tatumWallet: TatumWalletService,
  ) {
    this.apiKey = this.configService.get<string>('TATUM_API_KEY') || '';
  }

  private get headers() {
    return { 'x-api-key': this.apiKey };
  }

  /**
   * Sends `amount` of `asset` from a platform-controlled source address to any
   * destination address. The source private key is derived from the configured
   * mnemonic at the given derivation index.
   */
  async transfer(params: {
    asset: Currency;
    fromAddress: string;
    fromIndex: number;
    to: string;
    amount: string;
  }): Promise<string> {
    const { asset, fromAddress, fromIndex, to, amount } = params;

    if (!fromAddress) {
      throw new BadRequestException(
        `Source address is required for ${asset} transfer`,
      );
    }
    if (!to) {
      throw new BadRequestException('Destination address is required');
    }

    const chain = this.tatumWallet.mapCurrencyToChain(asset);
    const body = await this.buildTransferBody(
      asset,
      fromAddress,
      fromIndex,
      to,
      amount,
    );

    try {
      const response = await lastValueFrom(
        this.httpService
          .post(`${this.baseUrl}/${chain}/transaction`, body, {
            headers: this.headers,
          })
          .pipe(
            retry({
              count: 2,
              delay: (error: any, retryCount) => {
                this.logger.warn(
                  `Transfer retry ${retryCount} for ${asset}: ${error.message}`,
                );
                return timer(retryCount * 2000);
              },
            }),
          ),
      );

      const txId = response.data?.txId;
      if (!txId) {
        throw new Error('No txId returned from Tatum');
      }

      this.logger.log(
        `Transfer broadcast: ${amount} ${asset} ${fromAddress} -> ${to} (TX: ${txId})`,
      );
      return txId;
    } catch (error: any) {
      const tatumMsg = error.response?.data?.message || error.message;
      this.logger.error(`Blockchain transfer failed for ${asset}: ${tatumMsg}`);
      throw new InternalServerErrorException(
        `Crypto transfer failed: ${tatumMsg}`,
      );
    }
  }

  /**
   * Builds the chain-specific transfer body using derived private keys.
   * Token-aware: BTC is native, USDT/USDC are ERC-20 on Ethereum.
   */
  private async buildTransferBody(
    asset: Currency,
    fromAddress: string,
    fromIndex: number,
    to: string,
    amount: string,
  ) {
    const mnemonic = this.configService.get<string>(`TATUM_${asset}_MNEMONIC`);
    if (!mnemonic) {
      throw new InternalServerErrorException(
        `Missing TATUM_${asset}_MNEMONIC environment variable`,
      );
    }

    const privateKey = await this.tatumWallet.generatePrivateKey(
      asset,
      mnemonic,
      fromIndex,
    );

    switch (asset) {
      case Currency.BTC:
        return {
          fromAddress: [
            {
              address: fromAddress,
              signatureId: privateKey,
            },
          ],
          to: [{ address: to, value: parseFloat(amount) }],
        };

      case Currency.ETH:
        return {
          to,
          currency: 'ETH',
          amount,
          fromPrivateKey: privateKey,
        };

      case Currency.USDT:
      case Currency.USDC:
        return {
          to,
          currency: asset,
          amount,
          fromPrivateKey: privateKey,
          fee: { gasLimit: '100000', gasPrice: '20' },
        };

      default:
        throw new BadRequestException(`Transfers not supported for ${asset}`);
    }
  }

  /**
   * Records an on-chain transfer for operational tracking. These rows are purely
   * for confirmation/audit (ledgerSettled: true) and never mutate internal balances.
   */
  async recordOnChainTransaction(params: {
    walletId: string;
    orderId: string;
    asset: Currency;
    txId: string;
    fromAddress: string;
    to: string;
    amount: string;
    type: string;
    status?: string;
  }) {
    const {
      walletId,
      orderId,
      asset,
      txId,
      fromAddress,
      to,
      amount,
      type,
      status,
    } = params;
    const entryType =
      type === 'fee' ? LedgerType.FEE : LedgerType.TRADE_SETTLEMENT;

    return this.prisma.walletTransaction.create({
      data: {
        walletId,
        type: entryType,
        amount,
        status: status || 'PENDING',
        reference: txId,
        metadata: {
          onChain: true,
          ledgerSettled: true,
          orderId,
          asset,
          fromAddress,
          to,
          broadcastAt: new Date().toISOString(),
        },
      },
    });
  }
}
