import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class PurchaseStoreGiftCardDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @IsPositive()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity?: number = 1;

  @IsOptional()
  @IsString()
  promoCode?: string;
}
