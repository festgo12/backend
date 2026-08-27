export declare enum DisputeSubjectType {
    ORDER = "ORDER",
    DEPOSIT = "DEPOSIT",
    WITHDRAWAL = "WITHDRAWAL",
    OTHER = "OTHER"
}
export declare class CreateDisputeDto {
    orderId?: string;
    subjectType?: DisputeSubjectType;
    reference?: string;
    reason: string;
    description?: string;
}
