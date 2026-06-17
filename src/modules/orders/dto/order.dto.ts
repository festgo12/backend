import { IsUUID, IsNumber, IsPositive, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  adId: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  fiatAmount?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  cryptoAmount?: number;
}

export class OrderResponseDto {
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
