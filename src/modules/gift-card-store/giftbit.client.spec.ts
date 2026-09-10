import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { GiftbitClient } from './giftbit.client';

describe('GiftbitClient', () => {
  let client: GiftbitClient;
  let http: { get: jest.Mock; post: jest.Mock };

  const fakeConfig = (overrides: Record<string, string> = {}) => ({
    get: jest.fn((key: string) => overrides[key]),
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    http = { get: jest.fn(), post: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GiftbitClient,
        {
          provide: ConfigService,
          useValue: fakeConfig({
            GIFTBIT_ENV: 'testbed',
            GIFTBIT_TESTBED_API_TOKEN: 'testbed-token',
            GIFTBIT_PRODUCTION_API_TOKEN: 'prod-token',
          }),
        },
        { provide: HttpService, useValue: http },
      ],
    }).compile();

    client = module.get<GiftbitClient>(GiftbitClient);
    http = module.get<{ get: jest.Mock; post: jest.Mock }>(HttpService);
  });

  it('defaults to testbed and reports isConfigured', () => {
    expect(client.getEnvironment()).toBe('testbed');
    expect(client.isConfigured()).toBe(true);
  });

  it('flips to production when GIFTBIT_ENV=production', async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GiftbitClient,
        {
          provide: ConfigService,
          useValue: fakeConfig({
            GIFTBIT_ENV: 'production',
            GIFTBIT_PRODUCTION_API_TOKEN: 'prod-token',
          }),
        },
        { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
      ],
    }).compile();

    const prodClient = module.get<GiftbitClient>(GiftbitClient);
    expect(prodClient.getEnvironment()).toBe('production');
  });

  it('is not configured when the token for the active env is missing', async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GiftbitClient,
        { provide: ConfigService, useValue: fakeConfig({}) },
        { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
      ],
    }).compile();

    const unconfigured = module.get<GiftbitClient>(GiftbitClient);
    expect(unconfigured.isConfigured()).toBe(false);
  });

  it('lists brands with USD/embeddable query params', async () => {
    let requestConfig: unknown;
    http.get.mockImplementation((...args: unknown[]) => {
      requestConfig = args[1];
      return of({
        data: {
          brands: [
            { brand_code: 'AMZNCOM', name: 'Amazon.com', image_url: 'x.png' },
          ],
          total_count: 1,
          info: { code: 'INFO_BRANDS_RETRIEVED', name: 'ok', message: 'ok' },
        },
      });
    });

    const page = await client.listBrands({
      currencyisocode: 'USD',
      embeddable: true,
      limit: 100,
      offset: 0,
    });

    expect(http.get).toHaveBeenCalledWith(
      'https://api-testbed.giftbit.com/papi/v1/brands?limit=100&offset=0&currencyisocode=USD&embeddable=true',
      expect.anything(),
    );
    const headers = (requestConfig as { headers: { Authorization: string } })
      .headers;
    expect(headers.Authorization).toBe('Bearer testbed-token');
    expect(page.brands[0].brand_code).toBe('AMZNCOM');
  });

  it('creates an embedded reward with the supplied idempotency id', async () => {
    http.post.mockReturnValue(
      of({
        data: {
          info: {
            code: 'INFO_CAMPAIGN_CREATED',
            name: 'Created',
            message: 'ok',
          },
          status: 200,
          campaign: {
            uuid: 'campaign-uuid-1',
            brand_code: 'AMZNCOM',
            price_in_cents: 2500,
          },
          id: 'order-1',
          gift_link:
            'https://testbedapp.giftbit.com/embeddedRewards/index/gift-uuid-1',
        },
      }),
    );

    const res = await client.createEmbedded({
      brand_code: 'AMZNCOM',
      price_in_cents: 2500,
      id: 'order-1',
    });

    expect(http.post).toHaveBeenCalledWith(
      'https://api-testbed.giftbit.com/papi/v1/embedded',
      { brand_code: 'AMZNCOM', price_in_cents: 2500, id: 'order-1' },
      expect.anything(),
    );
    expect(res.gift_link).toContain('gift-uuid-1');
  });

  it('retries a 429 and succeeds on the next attempt', async () => {
    const errHead = { 'retry-after': '0' };
    http.get
      .mockReturnValueOnce(
        throwError(() => makeAxiosError(429, undefined, errHead)),
      )
      .mockReturnValueOnce(
        of({
          data: {
            gift: { uuid: 'abc', status: 'SENT_AND_REDEEMABLE' },
            info: { code: 'INFO_GIFTS', name: 'ok', message: 'ok' },
            status: 200,
          },
        }),
      );

    const res = await client.getGift('abc');
    expect(res.gift?.uuid).toBe('abc');
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('maps Giftbit error bodies into a thrown message', async () => {
    http.post.mockReturnValue(
      throwError(() =>
        makeAxiosError(422, {
          error: {
            code: 'ERROR_CAMPAIGN_INVALID_BRAND',
            name: 'Invalid Brand',
            message: 'The brand_code provided is not valid',
          },
          status: 422,
        }),
      ),
    );

    await expect(
      client.createEmbedded({
        brand_code: 'NOPE',
        price_in_cents: 100,
        id: 'x',
      }),
    ).rejects.toThrow(
      'Giftbit request failed: The brand_code provided is not valid',
    );
  });

  it('returns USD fund balances from /funds', async () => {
    http.get.mockReturnValue(
      of({
        data: {
          info: { code: 'INFO_FUNDS', name: 'ok', message: 'ok' },
          fundsbycurrency: {
            USD: {
              available_in_cents: 100000,
              pending_in_cents: 0,
              reserved_in_cents: 5000,
            },
          },
        },
      }),
    );

    const funds = await client.getFunds();
    expect(funds.fundsbycurrency.USD.available_in_cents).toBe(100000);
  });

  function makeAxiosError(
    status: number,
    body?: unknown,
    headers: Record<string, string> = {},
  ): AxiosError {
    const response: Partial<AxiosResponse> = {
      status,
      data: body,
      headers,
      config: {} as InternalAxiosRequestConfig,
    };
    return Object.assign(new AxiosError('Request failed'), { response });
  }
});
