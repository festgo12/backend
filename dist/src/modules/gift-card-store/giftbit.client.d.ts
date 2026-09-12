import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
export type GiftbitEnvironment = 'testbed' | 'production';
export interface GiftbitInfo {
    code: string;
    name: string;
    message: string;
}
export interface GiftbitError {
    status: number;
    error: {
        code: string;
        name: string;
        message: string;
    };
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
export declare const GIFTBIT_INFO_FUNDS_REQUIRED = "INFO_CAMPAIGN_CREATED_FUNDS_REQUIRED";
export declare const GIFTBIT_INFO_FUNDS_PENDING = "INFO_CAMPAIGN_CREATED_FUNDS_PENDING";
export declare class GiftbitClient {
    private readonly configService;
    private readonly httpService;
    private readonly logger;
    private readonly environment;
    private readonly baseUrl;
    private readonly token;
    private static readonly BASE_URLS;
    constructor(configService: ConfigService, httpService: HttpService);
    isConfigured(): boolean;
    getEnvironment(): GiftbitEnvironment;
    private request;
    private sleep;
    ping(): Promise<{
        username?: string;
        displayname?: string;
    }>;
    listBrands(params: {
        currencyisocode?: string;
        embeddable?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<GiftbitBrandPage>;
    getBrand(brandCode: string): Promise<GiftbitBrandDetail>;
    createEmbedded(payload: GiftbitEmbeddedRequest): Promise<GiftbitEmbeddedResponse>;
    getGift(uuid: string): Promise<GiftbitGetGiftResponse>;
    listGifts(params: {
        campaignUuid?: string;
        campaignId?: string;
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<GiftbitGiftPage>;
    getFunds(): Promise<GiftbitFundsResponse>;
}
