import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyAccountDto {
  @ApiProperty({ example: '0123456789', description: '10-digit bank account number' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/, { message: 'Account number must be exactly 10 digits' })
  accountNumber: string;

  @ApiProperty({ example: '044', description: 'Bank code' })
  @IsString()
  @IsNotEmpty()
  bankCode: string;
}
