import { IsString, IsOptional, IsNumber, IsEnum, IsIn, Min, IsBoolean } from 'class-validator';
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

  @ApiPropertyOptional({
    description:
      'Chain of the fee wallet to sweep (ETH/BSC/POLYGON/SOLANA/TRON). Defaults to the currency primary chain.',
  })
  @IsOptional()
  @IsString()
  chain?: string;
}

export class SweepConfigDto {
  @ApiPropertyOptional({ description: 'Enable/disable sweeping for this chain' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description:
      'USD threshold that must be reached before sweeping this chain. Omit/null to use the global DEPOSIT_SWEEP_THRESHOLD.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  thresholdUsd?: number;
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

  @ApiPropertyOptional({
    description:
      'Target chain for multichain assets (ETH/BSC/POLYGON/SOLANA/TRON). Omit to credit the primary wallet.',
  })
  @IsOptional()
  @IsString()
  chain?: string;
}

export class UpdateFeeConfigDto {
  @ApiProperty({ description: 'New fee value' })
  @IsNumber()
  @Min(0)
  value!: number;
}
