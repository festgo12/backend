import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, retry, timer } from 'rxjs';
import { Currency } from '@src/generated/client';

@Injectable()
export class TatumWalletService {
  private readonly logger = new Logger(TatumWalletService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tatum.io/v4';

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
   * Resolves the correct XPub to use, preferring configured env variables
   */
  async getOrGenerateXpub(asset: Currency): Promise<string> {
    // 1. First, check if the XPub is explicitly configured in .env
    const envXpubKey = `TATUM_${asset}_XPUB`;
    const configuredXpub = this.configService.get<string>(envXpubKey);

    if (configuredXpub) {
      return configuredXpub;
    }

    // 2. Fallback to generating a dynamic wallet if not configured in env
    this.logger.log(`No explicit XPub found for ${asset} in environment. Generating a new key pair via Tatum...`);
    const dynamicWallet = await this.generateWallet(asset);
    return dynamicWallet.xpub;
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
    } catch (error: any) {
      this.logger.error(`Failed to generate wallet for ${asset}: ${error.response?.data?.message || error.message}`);
      throw new InternalServerErrorException(`Could not generate wallet infrastructure for ${asset}`);
    }
  }

  /**
   * Generates a deposit address from an xpub and index.
   */
  async generateAddress(asset: Currency, xpub: string, index: number): Promise<string> {
    const chain = this.mapCurrencyToChain(asset);
    try {
      // ✅ FIX: Tatum uses /v3/{chain}/address/{xpub}/{index} for base chains.
      // Since USDT/USDC are ERC20 tokens on Ethereum, their deposit addresses 
      // are derived exactly like a native Ethereum address.
      const url = `${this.baseUrl}/${chain}/address/${xpub}/${index}`;

      const response = await lastValueFrom(
        this.httpService.get(url, { headers: this.headers }).pipe(
          retry({
            count: 3,
            delay: (error, retryCount) => timer(retryCount * 1000),
          }),
        ),
      );

      if (!response.data || !response.data.address) {
        throw new Error('Address missing from Tatum response body');
      }

      return response.data.address;
    } catch (error: any) {
      this.logger.error(`Failed to generate address for ${asset}: ${error.response?.data?.message || error.message}`);
      throw new BadRequestException(`Failed to generate deposit address for ${asset}. Ensure XPub is valid.`);
    }
  }

  /**
   * Generates a private key for a mnemonic and index (needed for processing withdrawals).
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
    } catch (error: any) {
      this.logger.error(`Failed to generate private key for ${asset}: ${error.response?.data?.message || error.message}`);
      throw new InternalServerErrorException(`Secure key generation failed for asset ${asset}`);
    }
  }

  /**
   * Maps client currency definitions to baseline Tatum network layers
   */
  mapCurrencyToChain(currency: Currency): string {
    switch (currency) {
      case Currency.BTC:
        return 'bitcoin';
      case Currency.ETH:
      case Currency.USDT:
      case Currency.USDC:
        return 'ethereum'; // ✅ ERC20 stablecoins utilize the underlying Ethereum engine
      default:
        throw new BadRequestException(`Unsupported crypto wallet network type: ${currency}`);
    }
  }
}