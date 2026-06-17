import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, retry, timer } from 'rxjs';
import { Currency } from '@prisma/client';

@Injectable()
export class TatumWalletService {
  private readonly logger = new Logger(TatumWalletService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tatum.io/v3';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('TATUM_API_KEY') || '';
  }

  private get headers() {
    return { 'x-api-key': this.apiKey };
  }

  /**
   * Generates a new wallet (mnemonic, xpub) for a specific blockchain.
   */
  async generateWallet(asset: Currency): Promise<{ mnemonic: string; xpub: string }> {
    const chain = this.mapCurrencyToChain(asset);
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.baseUrl}/${chain}/wallet`, { headers: this.headers }).pipe(
          retry({
            count: 3,
            delay: (error, retryCount) => timer(retryCount * 1000),
          }),
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to generate wallet for ${asset}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generates a deposit address from an xpub and index.
   */
  async generateAddress(asset: Currency, xpub: string, index: number): Promise<string> {
    const chain = this.mapCurrencyToChain(asset);
    try {
      // For ETH/ERC20, the endpoint is slightly different or shared
      const url = asset === Currency.BTC 
        ? `${this.baseUrl}/bitcoin/address/${xpub}/${index}`
        : `${this.baseUrl}/ethereum/address/${xpub}/${index}`;
      
      const response = await lastValueFrom(
        this.httpService.get(url, { headers: this.headers }).pipe(
          retry({
            count: 3,
            delay: (error, retryCount) => timer(retryCount * 1000),
          }),
        ),
      );
      return response.data.address;
    } catch (error) {
      this.logger.error(`Failed to generate address for ${asset}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generates a private key for a mnemonic and index (needed for withdrawals).
   */
  async generatePrivateKey(asset: Currency, mnemonic: string, index: number): Promise<string> {
    const chain = this.mapCurrencyToChain(asset);
    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${this.baseUrl}/${chain}/wallet/priv`,
          { index, mnemonic },
          { headers: this.headers },
        ),
      );
      return response.data.key;
    } catch (error) {
      this.logger.error(`Failed to generate private key for ${asset}: ${error.message}`);
      throw error;
    }
  }

  private mapCurrencyToChain(currency: Currency): string {
    switch (currency) {
      case Currency.BTC: return 'bitcoin';
      case Currency.ETH:
      case Currency.USDT:
      case Currency.USDC: return 'ethereum'; // USDT/USDC are ERC20 on Ethereum for this impl
      default: throw new Error(`Unsupported currency for Tatum: ${currency}`);
    }
  }
}
