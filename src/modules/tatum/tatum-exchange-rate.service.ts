import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lastValueFrom } from 'rxjs';
import { Currency } from '@src/generated/client';

interface CachedRates {
  rates: Record<string, number>;
  lastUpdated: Date;
}

@Injectable()
export class TatumExchangeRateService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TatumExchangeRateService.name);

  private cache: CachedRates = {
    rates: {},
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
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=ngn`;

      const response = await lastValueFrom(
        this.httpService.get(url, {
          timeout: 10000,
          headers: { Accept: 'application/json' },
        }),
      );

      const data = response.data;
      const rates: Record<string, number> = { NGN: 1.0 };

      for (const [currency, coinId] of Object.entries(this.COINGECKO_MAP)) {
        const price = data[coinId]?.ngn;
        if (price && typeof price === 'number' && price > 0) {
          rates[currency] = price;
        } else {
          rates[currency] = this.FALLBACK_RATES[currency as Currency] || 0;
          this.logger.warn(`Using fallback rate for ${currency}: ${rates[currency]}`);
        }
      }

      this.cache = { rates, lastUpdated: new Date() };
      this.logger.log(`Exchange rates updated: BTC=${rates.BTC}, ETH=${rates.ETH}, USDT=${rates.USDT}, USDC=${rates.USDC}`);
      return rates;
    } catch (error: any) {
      this.logger.error(`Failed to fetch exchange rates from CoinGecko: ${error.message}`);
      // Use fallback rates
      const fallback: Record<string, number> = {};
      for (const [currency, rate] of Object.entries(this.FALLBACK_RATES)) {
        fallback[currency] = rate;
      }
      this.cache = { rates: fallback, lastUpdated: new Date() };
      return fallback;
    }
  }

  /**
   * Returns the cached rate for a specific currency.
   */
  getRate(currency: Currency): number {
    return this.cache.rates[currency] || this.FALLBACK_RATES[currency] || 0;
  }

  /**
   * Returns all cached rates.
   */
  getAllRates(): Record<string, number> {
    return { ...this.cache.rates };
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
   * Returns metadata about the rate cache for admin display.
   */
  getRateInfo(): {
    rates: Record<string, number>;
    lastUpdated: Date;
    ageMinutes: number;
    source: string;
  } {
    const ageMs = Date.now() - this.cache.lastUpdated.getTime();
    return {
      rates: this.getAllRates(),
      lastUpdated: this.cache.lastUpdated,
      ageMinutes: Math.round(ageMs / 60000),
      source: ageMs < 300000 ? 'CoinGecko (live)' : 'CoinGecko (cached)',
    };
  }
}
