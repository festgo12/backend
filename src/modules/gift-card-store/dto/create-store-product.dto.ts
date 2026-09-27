import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GiftCardDenominationType } from '@src/generated/client';

export class CreateStoreProductDto {
  /**
   * Must be a real Giftbit brand code (e.g. from the synced catalog) —
   * customer purchases are fulfilled by Giftbit, so made-up codes will
   * create products that cannot be delivered.
   */
  @IsString()
  @MaxLength(100)
  providerProductId: string;

  @IsString()
  @MaxLength(150)
  productName: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  countryCode?: string = 'US';

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencyCode?: string = 'USD';

  @IsEnum(GiftCardDenominationType)
  denominationType: GiftCardDenominationType;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsNumber({}, { each: true })
  @Min(0.01, { each: true })
  fixedDenominations?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  minDenomination?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  maxDenomination?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  senderFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  markupPercent?: number;

  @IsOptional()
  @IsObject()
  providerResponse?: Record<string, unknown>;
}
