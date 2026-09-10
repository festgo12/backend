import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';

// ─── Giftbit API shape types ───────────────────────────────────────────────
export type GiftbitEnvironment = 'testbed' | 'production';

export interface GiftbitInfo {
  code: string;
  name: string;
  message: string;
}

export interface GiftbitError {
  status: number;
  error: { code: string; name: string; message: string };
}

export interface GiftbitBrand {
  brand_code: string;
  name: string;
  image_url: string;
  disclaimer?: string;
}

export interface GiftbitBrandPage {
  brands: GiftbitBrand[];
  number_of_results: number;
  total_count: number;
  limit: number;
  offset: number;
  info: GiftbitInfo;
}

export interface GiftbitBrandDetail {
  brand_code: string;
  name: string;
  image_url: string;
  variable_price: boolean;
  allowed_prices_in_cents?: number[];
  min_price_in_cents?: number;
  max_price_in_cents?: number;
  fund_currencyisocode: string;
  info: GiftbitInfo;
}

export interface GiftbitEmbeddedRequest {
  brand_code: string;
  price_in_cents: number;
  id: string;
}

export interface GiftbitEmbeddedResponse {
  info: GiftbitInfo;
  status: number;
  campaign: {
    uuid: string;
    brand_code: string;
    price_in_cents: number;
    fees?: {
      subtotal_in_cents: number;
      tax_in_cents: number;
      total_in_cents: number;
    };
  };
  id: string;
  gift_link: string;
}

export interface GiftbitGift {
  uuid: string;
  campaign_uuid: string;
  delivery_status: string;
  status: string;
  campaign_id: string;
  price_in_cents: number;
  brand_code: string;
  created_date: string;
  delivery_date?: string;
}

export interface GiftbitGetGiftResponse {
  gift: GiftbitGift | null;
  info: GiftbitInfo;
  status: number;
}

export interface GiftbitGiftPage {
  gifts: GiftbitGift[];
  number_of_results: number;
  total_count: number;
  limit: number;
  offset: number;
  info: GiftbitInfo;
  status: number;
}

export interface GiftbitFundsByCurrency {
  available_in_cents: number;
  pending_in_cents: number;
  reserved_in_cents: number;
}

export interface GiftbitFundsResponse {
  info: GiftbitInfo;
  fundsbycurrency: Record<string, GiftbitFundsByCurrency>;
}

export const GIFTBIT_INFO_FUNDS_REQUIRED =
  'INFO_CAMPAIGN_CREATED_FUNDS_REQUIRED';
export const GIFTBIT_INFO_FUNDS_PENDING = 'INFO_CAMPAIGN_CREATED_FUNDS_PENDING';

/**
 * Thin typed wrapper around the Giftbit Gift Card API (v1).
 *
 * - Auth: static `Authorization: Bearer <token>` per environment, no OAuth
 *   token exchange or expiry handling required.
 * - Environment: `GIFTBIT_ENV=testbed|production`. Each environment uses its
 *   own token (`GIFTBIT_TESTBED_API_TOKEN` / `GIFTBIT_PRODUCTION_API_TOKEN`).
 * - Transient HTTP 429s are retried with exponential backoff honoring
 *   `Retry-After`.
 * - `POST /embedded` is idempotent on the client-supplied `id`, so callers
 *   may safely resend the same order id.
 */
@Injectable()
export class GiftbitClient {
  private readonly logger = new Logger(GiftbitClient.name);

  private readonly environment: GiftbitEnvironment;
  private readonly baseUrl: string;
  private readonly token: string;

  private static readonly BASE_URLS: Record<GiftbitEnvironment, string> = {
    testbed: 'https://api-testbed.giftbit.com/papi/v1',
    production: 'https://api.giftbit.com/papi/v1',
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const env = this.configService.get<string>('GIFTBIT_ENV') || 'testbed';
    this.environment = env === 'production' ? 'production' : 'testbed';
    this.baseUrl = GiftbitClient.BASE_URLS[this.environment];
    this.token =
      this.configService.get<string>(
        this.environment === 'testbed'
          ? 'GIFTBIT_TESTBED_API_TOKEN'
          : 'GIFTBIT_PRODUCTION_API_TOKEN',
      ) || '';
  }

  isConfigured(): boolean {
    return Boolean(this.token);
  }

  getEnvironment(): GiftbitEnvironment {
    return this.environment;
  }

  private async request<T>(
    method: 'get' | 'post',
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error(
        'Giftbit is not configured. Set GIFTBIT_ENV and the corresponding GIFTBIT_*_API_TOKEN.',
      );
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    let attempts = 0;
    const maxAttempts = 4;
    let pendingDelayMs = 1000;

    while (attempts < maxAttempts) {
      attempts += 1;
      try {
        const response: AxiosResponse<T> =
          method === 'get'
            ? await lastValueFrom(
                this.httpService.get(`${this.baseUrl}${path}`, { headers }),
              )
            : await lastValueFrom(
                this.httpService.post(`${this.baseUrl}${path}`, body, {
                  headers,
                }),
              );
        return response.data;
      } catch (error) {
        const err = error as AxiosError<GiftbitError>;
        const status = err.response?.status;

        if (status === 429 && attempts < maxAttempts) {
          const retryAfter = Number(
            err.response?.headers?.['retry-after'] || pendingDelayMs / 1000,
          );
          const delayMs =
            Number.isFinite(retryAfter) && retryAfter > 0
              ? retryAfter * 1000
              : pendingDelayMs;
          pendingDelayMs *= 2;
          this.logger.warn(
            `Giftbit rate limited (429), retrying ${path} in ${delayMs}ms (attempt ${attempts}/${maxAttempts})`,
          );
          await this.sleep(delayMs);
          continue;
        }

        const message =
          err.response?.data?.error?.message ||
          err.response?.data?.error?.code ||
          err.message ||
          'Unknown Giftbit error';
        this.logger.error(
          `Giftbit ${method.toUpperCase()} ${path} failed: ${message}`,
          err.stack,
        );
        throw new Error(`Giftbit request failed: ${message}`);
      }
    }

    throw new Error(`Giftbit request failed: max retries exceeded for ${path}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health/auth check for the current environment token.
   */
  async ping(): Promise<{ username?: string; displayname?: string }> {
    return this.request('get', '/ping');
  }

  /**
   * Lists embeddable, USD-denominated brands (paginated).
   */
  async listBrands(params: {
    currencyisocode?: string;
    embeddable?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<GiftbitBrandPage> {
    const { currencyisocode, embeddable, limit = 100, offset = 0 } = params;
    const qs = [`limit=${limit}`, `offset=${offset}`];
    if (currencyisocode) qs.push(`currencyisocode=${currencyisocode}`);
    if (embeddable !== undefined && embeddable !== null) {
      qs.push(`embeddable=${embeddable ? 'true' : 'false'}`);
    }
    return this.request('get', `/brands?${qs.join('&')}`);
  }

  /**
   * Retrieves detailed info for a single brand (denomination rules).
   */
  async getBrand(brandCode: string): Promise<GiftbitBrandDetail> {
    return this.request('get', `/brands/${encodeURIComponent(brandCode)}`);
  }

  /**
   * Creates a single embedded reward. Idempotent on `id`.
   */
  async createEmbedded(
    payload: GiftbitEmbeddedRequest,
  ): Promise<GiftbitEmbeddedResponse> {
    return this.request('post', '/embedded', payload);
  }

  /**
   * Retrieves a single reward by its Giftbit uuid.
   */
  async getGift(uuid: string): Promise<GiftbitGetGiftResponse> {
    return this.request('get', `/gifts/${encodeURIComponent(uuid)}`);
  }

  /**
   * Lists rewards, optionally filtered by their Giftbit order uuid
   * (`campaign_uuid`) or the client-supplied order id (`campaign_id`).
   */
  async listGifts(params: {
    campaignUuid?: string;
    campaignId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<GiftbitGiftPage> {
    const { campaignUuid, campaignId, status, limit = 20, offset = 0 } = params;
    const qs = [`limit=${limit}`, `offset=${offset}`];
    if (campaignUuid)
      qs.push(`campaign_uuid=${encodeURIComponent(campaignUuid)}`);
    if (campaignId) qs.push(`campaign_id=${encodeURIComponent(campaignId)}`);
    if (status) qs.push(`status=${encodeURIComponent(status)}`);
    return this.request('get', `/gifts?${qs.join('&')}`);
  }

  /**
   * Current account funding overview per currency.
   */
  async getFunds(): Promise<GiftbitFundsResponse> {
    return this.request('get', '/funds');
  }
}
