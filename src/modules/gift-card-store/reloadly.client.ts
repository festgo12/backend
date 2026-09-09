import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

interface ReloadlyToken {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

// ─── Reloadly API shape types ──────────────────────────────────────────────
export interface ReloadlyPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  numberOfElements: number;
}

export interface ReloadlyBrand {
  id: number;
  name: string;
  logoUrls?: unknown;
  backgroundColor?: string;
}

export interface ReloadlyProduct {
  productId?: number;
  productName?: string;
  countryCode?: string;
  denominationType?: string;
  senderCurrencyCode?: string;
  receiverCurrencyCode?: string;
  minRecipientDenomination?: number;
  maxRecipientDenomination?: number;
  fixedRecipientDenominations?: Array<number | string>;
  senderFee?: number;
  discountPercentage?: number;
  brand?: { id: number; name: string };
}

export interface ReloadlyGiftCard {
  code?: string;
  pin?: string;
  countryCode?: string;
  productId?: number;
  transactionId?: string;
  cardNumber?: string;
}

export interface ReloadlyOrder {
  transactionId?: string;
  customIdentifier?: string;
  status?: string;
  productId?: number;
  quantity?: number;
  unitPrice?: number;
  [key: string]: unknown;
}

export interface ReloadlyCards {
  transactionId?: string;
  giftCard?: ReloadlyGiftCard;
}

export interface ReloadlyWebhookData {
  transactionId?: string;
  customIdentifier?: string;
  reference?: string;
  status?: string;
  message?: string;
  errorCode?: string;
  giftCard?: ReloadlyGiftCard;
}

export interface ReloadlyWebhook {
  data?: ReloadlyWebhookData;
}

/**
 * Thin typed wrapper around the Reloadly Gift Cards API.
 *
 * - Auth: OAuth2 client-credentials against auth.reloadly.com. The token is
 *   cached in-memory and refreshed shortly before it expires.
 * - Base URL flips between the sandbox and production gift-cards endpoints.
 */
@Injectable()
export class ReloadlyClient {
  private readonly logger = new Logger(ReloadlyClient.name);

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly sandbox: boolean;
  private readonly authBaseUrl = 'https://auth.reloadly.com';
  private readonly apiBaseUrl: string;

  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('RELOADLY_CLIENT_ID') || '';
    this.clientSecret =
      this.configService.get<string>('RELOADLY_CLIENT_SECRET') || '';
    this.sandbox =
      this.configService.get<string>('RELOADLY_SANDBOX') !== 'false';
    this.apiBaseUrl = this.sandbox
      ? 'https://giftcards-sandbox.reloadly.com'
      : 'https://giftcards.reloadly.com';
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  private get audience(): string {
    // Audience uses the host without the scheme.
    return this.sandbox
      ? 'giftcards-sandbox.reloadly.com'
      : 'giftcards.reloadly.com';
  }

  /**
   * Returns a valid bearer token, requesting a fresh one when expired.
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiresAt > now + 60_000) {
      return this.accessToken;
    }

    const response: AxiosResponse<ReloadlyToken> = await lastValueFrom(
      this.httpService.post(
        `${this.authBaseUrl}/oauth/token`,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
          audience: this.audience,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      ),
    );

    const data = response.data;
    this.accessToken = data.access_token;
    // Refresh 2 minutes before the provider TTL elapses.
    this.tokenExpiresAt = now + (data.expires_in - 120) * 1000;
    this.logger.log('Reloadly access token acquired');
    return this.accessToken;
  }

  private async request<T>(
    method: 'get' | 'post',
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error(
        'Reloadly is not configured. Set RELOADLY_CLIENT_ID and RELOADLY_CLIENT_SECRET.',
      );
    }

    const token = await this.getAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/com.reloadly.giftcards-v1+json',
      'Content-Type': 'application/json',
    };

    try {
      const response: AxiosResponse<T> =
        method === 'get'
          ? await lastValueFrom(
              this.httpService.get(`${this.apiBaseUrl}${path}`, { headers }),
            )
          : await lastValueFrom(
              this.httpService.post(`${this.apiBaseUrl}${path}`, body, {
                headers,
              }),
            );
      return response.data;
    } catch (error) {
      const err = error as {
        message?: string;
        stack?: string;
        response?: {
          status?: number;
          data?: { message?: string; error?: string };
        };
      };
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Unknown Reloadly error';
      this.logger.error(
        `Reloadly ${method.toUpperCase()} ${path} failed: ${message}`,
        err.stack,
      );
      throw new Error(`Reloadly request failed: ${message}`);
    }
  }

  /**
   * Lists gift card brands.
   */
  async getBrands(page = 0, size = 100): Promise<ReloadlyPage<ReloadlyBrand>> {
    return this.request('get', `/brands?page=${page}&size=${size}`);
  }

  /**
   * Lists gift card products. `countryCode` may be omitted to fetch all.
   */
  async getProducts(params: {
    countryCode?: string;
    page?: number;
    size?: number;
    includeRange?: boolean;
    productName?: string;
  }): Promise<ReloadlyPage<ReloadlyProduct>> {
    const {
      countryCode,
      page = 0,
      size = 100,
      includeRange = true,
      productName,
    } = params;
    const qs = [
      `page=${page}`,
      `size=${size}`,
      `includeRange=${includeRange ? 'true' : 'false'}`,
    ];
    if (countryCode) qs.push(`countryCode=${countryCode}`);
    if (productName) qs.push(`productName=${encodeURIComponent(productName)}`);
    return this.request('get', `/products?${qs.join('&')}`);
  }

  /**
   * Fetches a single product by its Reloadly product id.
   */
  async getProduct(productId: number): Promise<ReloadlyProduct> {
    return this.request('get', `/products/${productId}`);
  }

  /**
   * Places an order for a gift card.
   */
  async createOrder(payload: {
    productId: number;
    quantity: number;
    unitPrice: number;
    customIdentifier: string;
    recipientEmail: string;
    senderName?: string;
    countryCode: string;
    promoCode?: string;
    customAttributes?: Record<string, string>;
  }): Promise<ReloadlyOrder> {
    return this.request('post', '/orders', payload);
  }

  /**
   * Fetches the status of an order transaction.
   */
  async getTransaction(transactionId: string): Promise<ReloadlyOrder> {
    return this.request('get', `/orders/transactions/${transactionId}`);
  }

  /**
   * Fetches the redeem code(s)/PIN(s) for a completed transaction.
   */
  async getCards(transactionId: string): Promise<ReloadlyCards> {
    return this.request('get', `/orders/transactions/${transactionId}/cards`);
  }
}
