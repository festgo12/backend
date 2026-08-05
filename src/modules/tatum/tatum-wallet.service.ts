import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, retry, timer } from 'rxjs';
import { Currency } from '@src/generated/client';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class TatumWalletService {
  private readonly logger = new Logger(TatumWalletService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tatum.io/v3';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('TATUM_API_KEY') || '';
  }

  private get headers() {
    return { 'x-api-key': this.apiKey };
  }

  /**
   * Resolves the correct XPub to use, preferring configured env variables,
   * then a cached generated xpub (persisted in PlatformSetting) so that
   * generated addresses stay stable across restarts.
   */
  async getOrGenerateXpub(asset: Currency): Promise<string> {
    // 1. First, check if the XPub is explicitly configured in .env
    const envXpubKey = `TATUM_${asset}_XPUB`;
    const configuredXpub = this.configService.get<string>(envXpubKey);

    if (configuredXpub) {
      return configuredXpub;
    }

    // 2. Fallback to a cached generated xpub (stable across restarts)
    const cacheKey = `xpub:${asset}`;
    const cached = await this.prisma.platformSetting.findUnique({
      where: { key: cacheKey },
    });

    if (cached) {
      return cached.value;
    }

    // 3. Generate a new wallet and persist the xpub for future calls
    this.logger.log(
      `No explicit XPub found for ${asset} in environment. Generating and caching a stable key pair via Tatum...`,
    );
    const dynamicWallet = await this.generateWallet(asset);

    await this.prisma.platformSetting.upsert({
      where: { key: cacheKey },
      update: { value: dynamicWallet.xpub },
      create: { key: cacheKey, value: dynamicWallet.xpub },
    });

    return dynamicWallet.xpub;
  }

  /**
   * Deterministically maps a wallet id to a stable derivation index.
   * Must match the index used to assign the wallet's deposit address.
   */
  getAddressIndex(walletId: string): number {
    let h = 0;
    for (let i = 0; i < walletId.length; i++) {
      h = (Math.imul(31, h) + walletId.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % 1000000;
  }

  /**
   * Generates a new wallet (mnemonic, xpub) for a specific blockchain.
   */
  async generateWallet(
    asset: Currency,
  ): Promise<{ mnemonic: string; xpub: string }> {
    const chain = this.mapCurrencyToChain(asset);
    try {
      const response = await lastValueFrom(
        this.httpService
          .get(`${this.baseUrl}/${chain}/wallet`, { headers: this.headers })
          .pipe(
            retry({
              count: 3,
              delay: (error, retryCount) => timer(retryCount * 1000),
            }),
          ),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to generate wallet for ${asset}: ${error.response?.data?.message || error.message}`,
      );
      throw new InternalServerErrorException(
        `Could not generate wallet infrastructure for ${asset}`,
      );
    }
  }

  /**
   * Generates a deposit address from an xpub and index.
   */
  async generateAddress(
    asset: Currency,
    xpub: string,
    index: number,
  ): Promise<string> {
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
      this.logger.error(
        `Failed to generate address for ${asset}: ${error.response?.data?.message || error.message}`,
      );
      throw new BadRequestException(
        `Failed to generate deposit address for ${asset}. Ensure XPub is valid.`,
      );
    }
  }

  /**
   * Generates a private key for a mnemonic and index (needed for processing withdrawals).
   */
  async generatePrivateKey(
    asset: Currency,
    mnemonic: string,
    index: number,
  ): Promise<string> {
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
      this.logger.error(
        `Failed to generate private key for ${asset}: ${error.response?.data?.message || error.message}`,
      );
      throw new InternalServerErrorException(
        `Secure key generation failed for asset ${asset}`,
      );
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
        throw new BadRequestException(
          `Unsupported crypto wallet network type: ${currency}`,
        );
    }
  }

  /**
   * Maps a currency to the Tatum v4 Blockchains Data API chain identifier
   * (e.g. `ethereum-sepolia`, `bitcoin-testnet`), driven by TATUM_NETWORK.
   */
  mapCurrencyToV4Chain(currency: Currency): string {
    const network = (
      this.configService.get<string>('TATUM_NETWORK', 'mainnet') || 'mainnet'
    ).toLowerCase();
    const base = this.mapCurrencyToChain(currency);
    if (network === 'testnet') {
      return base === 'ethereum' ? 'ethereum-sepolia' : `${base}-testnet`;
    }
    return `${base}-mainnet`;
  }
}
