import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { GiftCardListingStatus } from '@src/generated/client';

export class ModerateGiftCardListingDto {
  @IsEnum(GiftCardListingStatus)
  status: GiftCardListingStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  moderatorNote?: string;
}
