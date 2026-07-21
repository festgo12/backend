import { IsNumber, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitializeDepositDto {
  @ApiProperty({ example: 5000, description: 'Amount in NGN' })
  @IsNumber()
  @IsPositive()
  @Min(100)
  amount: number;
}
