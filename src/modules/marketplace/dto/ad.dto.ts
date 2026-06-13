import { IsEnum, IsNumber, IsPositive, IsBoolean, IsOptional, Min } from 'class-validator';
import { Currency, AdType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateAdDto {
  @IsEnum(Currency)
  asset: Currency;

  @IsEnum(AdType)
  type: AdType;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  minLimit: number;

  @IsNumber()
  @IsPositive()
  maxLimit: number;

  @IsOptional()
  @IsBoolean()
  isSponsored?: boolean;
}

export class UpdateAdDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  minLimit?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxLimit?: number;

  @IsOptional()
  @IsBoolean()
  isSponsored?: boolean;

  @IsOptional()
  status?: string;
}

export class SearchAdsDto {
  @IsOptional()
  @IsEnum(Currency)
  asset?: Currency;

  @IsOptional()
  @IsEnum(AdType)
  type?: AdType;

  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsBoolean()
  isSponsored?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  sortBy?: 'price' | 'quantity' | 'createdAt' = 'createdAt';

  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
