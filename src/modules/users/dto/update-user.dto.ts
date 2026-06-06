import { IsString, IsOptional, IsEnum, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  // @ApiProperty({ example: 'Nigeria', required: false })
  // @IsString()
  // @IsOptional()
  // country?: string;
}

export class UpdatePreferencesDto {
  @ApiProperty({ example: 'NGN', required: false })
  @IsString()
  @IsOptional()
  baseCurrency?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  emailNotify?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  pushNotify?: boolean;

  @ApiProperty({ example: 'DARK', enum: ['LIGHT', 'DARK'], required: false })
  @IsEnum(['LIGHT', 'DARK'])
  @IsOptional()
  theme?: string;
}
