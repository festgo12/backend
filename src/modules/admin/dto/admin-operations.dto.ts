import { IsString, IsOptional, IsNumber, IsEnum, IsIn, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '@src/generated/client';

const ALLOWED_AD_FIELDS = ['status', 'quantity', 'price', 'minLimit', 'maxLimit', 'paymentMethods', 'description'] as const;

export class AdminUpdateAdDto {
  @ApiPropertyOptional({ enum: ALLOWED_AD_FIELDS, isArray: true, description: 'Only whitelisted fields are accepted' })
  @IsOptional()
  @IsIn(ALLOWED_AD_FIELDS, { each: true })
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxLimit?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  paymentMethods?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class SweepFeeWalletDto {
  @ApiProperty({ description: 'Treasury destination address' })
  @IsString()
  address!: string;

  @ApiPropertyOptional({ description: 'Amount to sweep (omit for full balance)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}

export class CreditTestFundsDto {
  @ApiProperty({ description: 'User email to credit' })
  @IsString()
  email!: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty({ description: 'Amount to credit' })
  @IsNumber()
  @Min(0)
  amount!: number;
}

export class UpdateFeeConfigDto {
  @ApiProperty({ description: 'New fee value' })
  @IsNumber()
  @Min(0)
  value!: number;
}
