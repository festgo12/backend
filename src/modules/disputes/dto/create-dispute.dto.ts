import {
  IsUUID,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Validate,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateAtLeastOne } from '../../../core/validators/validate-at-least-one.validator';

export enum DisputeSubjectType {
  ORDER = 'ORDER',
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  OTHER = 'OTHER',
  GIFT_CARD_STORE_ORDER = 'GIFT_CARD_STORE_ORDER',
}

export class CreateDisputeDto {
  @ApiPropertyOptional({
    description:
      'Marketplace order ID to dispute. Required for ORDER disputes; omit for deposit/withdrawal/store order disputes.',
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({
    description:
      'Gift Card Store order ID to dispute. Required for GIFT_CARD_STORE_ORDER disputes.',
  })
  @IsOptional()
  @IsUUID()
  storeOrderId?: string;

  @ApiPropertyOptional({
    description: 'What the dispute is about',
    enum: DisputeSubjectType,
    default: DisputeSubjectType.ORDER,
  })
  @IsOptional()
  @IsEnum(DisputeSubjectType)
  subjectType?: DisputeSubjectType;

  @ApiPropertyOptional({
    description:
      'Reference for deposit/withdrawal disputes (e.g. transaction reference or hash)',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  @ApiProperty({ description: 'Reason for dispute', minLength: 10, maxLength: 1000 })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason: string;

  @ApiPropertyOptional({ description: 'Detailed description of the issue', maxLength: 5000 })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @Validate(ValidateAtLeastOne, ['orderId', 'storeOrderId', 'reference'])
  _subjectLink?: string;
}
