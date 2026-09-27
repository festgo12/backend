import { GiftCardDenominationType } from '@src/generated/client';
export declare class CreateStoreProductDto {
    providerProductId: string;
    productName: string;
    brandId?: string;
    countryCode?: string;
    currencyCode?: string;
    denominationType: GiftCardDenominationType;
    fixedDenominations?: number[];
    minDenomination?: number;
    maxDenomination?: number;
    senderFee?: number;
    markupPercent?: number;
    providerResponse?: Record<string, unknown>;
}
