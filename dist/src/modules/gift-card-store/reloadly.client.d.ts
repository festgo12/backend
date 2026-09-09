import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
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
    brand?: {
        id: number;
        name: string;
    };
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
export declare class ReloadlyClient {
    private readonly configService;
    private readonly httpService;
    private readonly logger;
    private readonly clientId;
    private readonly clientSecret;
    private readonly sandbox;
    private readonly authBaseUrl;
    private readonly apiBaseUrl;
    private accessToken;
    private tokenExpiresAt;
    constructor(configService: ConfigService, httpService: HttpService);
    isConfigured(): boolean;
    private get audience();
    getAccessToken(): Promise<string>;
    private request;
    getBrands(page?: number, size?: number): Promise<ReloadlyPage<ReloadlyBrand>>;
    getProducts(params: {
        countryCode?: string;
        page?: number;
        size?: number;
        includeRange?: boolean;
        productName?: string;
    }): Promise<ReloadlyPage<ReloadlyProduct>>;
    getProduct(productId: number): Promise<ReloadlyProduct>;
    createOrder(payload: {
        productId: number;
        quantity: number;
        unitPrice: number;
        customIdentifier: string;
        recipientEmail: string;
        senderName?: string;
        countryCode: string;
        promoCode?: string;
        customAttributes?: Record<string, string>;
    }): Promise<ReloadlyOrder>;
    getTransaction(transactionId: string): Promise<ReloadlyOrder>;
    getCards(transactionId: string): Promise<ReloadlyCards>;
}
