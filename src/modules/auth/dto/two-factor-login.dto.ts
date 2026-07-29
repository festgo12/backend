import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorLoginDto {
  @ApiProperty({ description: 'Temporary 2FA token from login response' })
  @IsString()
  @IsNotEmpty()
  twoFactorToken: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP sent to email' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
