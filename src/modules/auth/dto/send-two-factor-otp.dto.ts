import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendTwoFactorOtpDto {
  @ApiProperty({ description: 'Temporary 2FA token from login response' })
  @IsString()
  @IsNotEmpty()
  twoFactorToken: string;
}
