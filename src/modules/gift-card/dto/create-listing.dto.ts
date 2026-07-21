import { IsEnum, IsString, IsNumber, IsPositive, IsOptional, IsArray, MaxLength, Min } from 'class-validator';
import { GiftCardBrand } from '@src/generated/client';

export class CreateGiftCardListingDto {
  @IsEnum(GiftCardBrand)
  brand: GiftCardBrand;

  @IsString()
  @MaxLength(500)
  cardCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  cardPin?: string;

  @IsNumber()
  @IsPositive()
  @Min(1)
  denomination: number;

  @IsString()
  @MaxLength(3)
  cardCurrency: string;

  @IsNumber()
  @IsPositive()
  exchangeRate: number;

  @IsNumber()
  @IsPositive()
  askingPriceNgn: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];
}
