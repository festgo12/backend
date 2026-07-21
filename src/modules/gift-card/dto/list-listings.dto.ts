import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { GiftCardBrand, GiftCardListingStatus, GiftCardOrderStatus } from '@src/generated/client';

export class ListGiftCardListingsDto {
  @IsOptional()
  @IsEnum(GiftCardBrand)
  brand?: GiftCardBrand;

  @IsOptional()
  @IsEnum(GiftCardListingStatus)
  status?: GiftCardListingStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

export class ListGiftCardOrdersDto {
  @IsOptional()
  @IsEnum(GiftCardOrderStatus)
  status?: GiftCardOrderStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
