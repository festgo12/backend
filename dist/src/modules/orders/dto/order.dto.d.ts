export declare class CreateOrderDto {
    adId: string;
    fiatAmount?: number;
    cryptoAmount?: number;
}
export declare class OrderResponseDto {
    id: string;
    adId: string;
    buyerId: string;
    sellerId: string;
    status: string;
    fiatAmount: number;
    cryptoAmount: number;
    feeAmount: number;
    expiresAt: Date;
    createdAt: Date;
}
