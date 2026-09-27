import { GiftCardDenominationType } from '@src/generated/client';
export declare class UpdateStoreProductDto {
    enabled?: boolean;
    markupPercent?: number;
    productName?: string;
    countryCode?: string;
    denominationType?: GiftCardDenominationType;
    fixedDenominations?: number[];
    minDenomination?: number;
    maxDenomination?: number;
    senderFee?: number;
}
