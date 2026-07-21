import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiateRefundDto {
  @ApiProperty({ description: 'WalletTransaction ID to refund' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @ApiPropertyOptional({ example: 5000, description: 'Partial refund amount in NGN. If omitted, full amount is refunded' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;
}
