import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Cron } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';
import { Currency } from '@src/generated/client';

interface CachedRates {
  ngn: Record<string, number>;
  usd: Record<string, number>;
  lastUpdated: Date;
}

/**
 * Live crypto-to-NGN exchange rates from CoinGecko, cached in memory and
 * refreshed on startup and every 6 hours.
 */
@Injectable()
export class ExchangeRateService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ExchangeRateService.name);

  private cache: CachedRates = {
    ngn: {},
    usd: {},
    lastUpdated: new Date(0),
  };

  // Fallback rates used when API is unreachable
  private readonly FALLBACK_RATES: Record<Currency, number> = {
    NGN: 1.0,
    USDT: 1550.0,
    USDC: 1545.0,
    BTC: 96000000.0,
    ETH: 5400000.0,
  };

  // CoinGecko coin IDs for each currency
  private readonly COINGECKO_MAP: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    USDT: 'tether',
    USDC: 'usd-coin',
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Fetch rates on startup.
   */
  async onApplicationBootstrap() {
    await this.refreshRates();
  }

  /**
   * Scheduled job: refresh rates every 6 hours.
   */
  @Cron('0 */6 * * *')
  async handleCronRefresh() {
    this.logger.log('Scheduled exchange rate refresh triggered');
    await this.refreshRates();
  }

  /**
   * Fetches live exchange rates from CoinGecko and caches them.
   * Falls back to hardcoded rates if the API fails.
   */
  async refreshRates(): Promise<Record<string, number>> {
    try {
      const coinIds = Object.values(this.COINGECKO_MAP).join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=ngn,usd`;

      const response = await lastValueFrom(
        this.httpService.get(url, {
          timeout: 10000,
          headers: { Accept: 'application/json' },
        }),
      );

      const data = response.data as Record<
        string,
        { ngn?: number; usd?: number }
      >;
      const ngn: Record<string, number> = { NGN: 1.0 };
      const usd: Record<string, number> = { NGN: 1.0 };

      for (const [currency, coinId] of Object.entries(this.COINGECKO_MAP)) {
        const ngnPrice = data[coinId]?.ngn;
        const usdPrice = data[coinId]?.usd;
        if (ngnPrice && typeof ngnPrice === 'number' && ngnPrice > 0) {
          ngn[currency] = ngnPrice;
        } else {
          ngn[currency] = this.FALLBACK_RATES[currency as Currency] || 0;
          this.logger.warn(
            `Using fallback NGN rate for ${currency}: ${ngn[currency]}`,
          );
        }
        if (usdPrice && typeof usdPrice === 'number' && usdPrice > 0) {
          usd[currency] = usdPrice;
        } else {
          usd[currency] = this.FALLBACK_RATES[currency as Currency]
            ? this.FALLBACK_RATES[currency as Currency] / 1550
            : 0;
          this.logger.warn(
            `Using fallback USD rate for ${currency}: ${usd[currency]}`,
          );
        }
      }

      this.cache = { ngn, usd, lastUpdated: new Date() };
      this.logger.log(
        `Exchange rates updated: BTC=$${usd.BTC} / ₦${ngn.BTC}, ETH=$${usd.ETH} / ₦${ngn.ETH}`,
      );
      return ngn;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch exchange rates from CoinGecko: ${message}`,
      );
      // Use fallback rates
      const ngnFallback: Record<string, number> = {};
      const usdFallback: Record<string, number> = {};
      for (const [currency, rate] of Object.entries(this.FALLBACK_RATES)) {
        ngnFallback[currency] = rate;
        usdFallback[currency] = rate / 1550;
      }
      this.cache = {
        ngn: ngnFallback,
        usd: usdFallback,
        lastUpdated: new Date(),
      };
      return ngnFallback;
    }
  }

  /**
   * Returns the cached NGN rate for a specific currency.
   */
  getRate(currency: Currency): number {
    return this.cache.ngn[currency] || this.FALLBACK_RATES[currency] || 0;
  }

  /**
   * Returns the cached USD rate for a specific currency.
   */
  getUsdRate(currency: Currency): number {
    return this.cache.usd[currency] || 0;
  }

  /**
   * Returns all cached NGN rates.
   */
  getAllRates(): Record<string, number> {
    return { ...this.cache.ngn };
  }

  /**
   * Returns the last update timestamp.
   */
  getLastUpdated(): Date {
    return this.cache.lastUpdated;
  }

  /**
   * Converts an amount from crypto to NGN.
   */
  convertToNgn(amount: number, currency: Currency): number {
    const rate = this.getRate(currency);
    return amount * rate;
  }

  /**
   * Converts an amount from crypto to USD.
   */
  convertToUsd(amount: number, currency: Currency): number {
    const rate = this.getUsdRate(currency);
    return amount * rate;
  }

  /**
   * Returns metadata about the rate cache for admin display.
   */
  getRateInfo(): {
    rates: Record<string, number>;
    usdRates: Record<string, number>;
    lastUpdated: Date;
    ageMinutes: number;
    source: string;
  } {
    const ageMs = Date.now() - this.cache.lastUpdated.getTime();
    return {
      rates: this.getAllRates(),
      usdRates: { ...this.cache.usd },
      lastUpdated: this.cache.lastUpdated,
      ageMinutes: Math.round(ageMs / 60000),
      source: ageMs < 300000 ? 'CoinGecko (live)' : 'CoinGecko (cached)',
    };
  }
}
