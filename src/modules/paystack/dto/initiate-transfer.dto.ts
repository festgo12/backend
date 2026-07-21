import { IsString, IsNotEmpty, IsNumber, IsPositive, Min, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateTransferDto {
  @ApiProperty({ example: 5000, description: 'Amount in NGN' })
  @IsNumber()
  @IsPositive()
  @Min(100)
  amount: number;

  @ApiProperty({ example: '0123456789', description: '10-digit bank account number' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/, { message: 'Account number must be exactly 10 digits' })
  accountNumber: string;

  @ApiProperty({ example: '044', description: 'Bank code' })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty({ example: 'John Doe', description: 'Account holder name' })
  @IsString()
  @IsNotEmpty()
  accountName: string;
}
