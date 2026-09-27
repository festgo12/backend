import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStoreBrandDto {
  @IsString()
  @MaxLength(100)
  brandName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  backgroundColor?: string;
}
