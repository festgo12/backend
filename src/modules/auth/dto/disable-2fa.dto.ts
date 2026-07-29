import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DisableTwoFactorDto {
  @ApiProperty({ example: '123456', description: '6-digit OTP to confirm disabling 2FA' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
