import { IsString, IsUUID } from 'class-validator';

export class PurchaseGiftCardDto {
  @IsUUID()
  listingId: string;
}
