import { GiftCardBrand } from '@src/generated/client';
export declare class CreateGiftCardListingDto {
    brand: GiftCardBrand;
    cardCode: string;
    cardPin?: string;
    denomination: number;
    cardCurrency: string;
    exchangeRate: number;
    askingPriceNgn: number;
    evidenceUrls?: string[];
}
