import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ description: 'Google ID Token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'device-id-123' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({ example: 'browser-fingerprint-abc' })
  @IsString()
  @IsNotEmpty()
  fingerprint: string;
}
