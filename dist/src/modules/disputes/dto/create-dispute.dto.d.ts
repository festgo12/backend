export declare enum DisputeSubjectType {
    ORDER = "ORDER",
    DEPOSIT = "DEPOSIT",
    WITHDRAWAL = "WITHDRAWAL",
    OTHER = "OTHER",
    GIFT_CARD_STORE_ORDER = "GIFT_CARD_STORE_ORDER"
}
export declare class CreateDisputeDto {
    orderId?: string;
    storeOrderId?: string;
    subjectType?: DisputeSubjectType;
    reference?: string;
    reason: string;
    description?: string;
    _subjectLink?: string;
}
