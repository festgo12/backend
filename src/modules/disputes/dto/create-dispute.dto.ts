import {
  IsUUID,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DisputeSubjectType {
  ORDER = 'ORDER',
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  OTHER = 'OTHER',
}

export class CreateDisputeDto {
  @ApiPropertyOptional({
    description:
      'Order ID to dispute. Required only for ORDER disputes; omit for deposit/withdrawal disputes.',
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

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
}