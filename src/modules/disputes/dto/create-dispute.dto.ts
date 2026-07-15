import { IsUUID, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDisputeDto {
  @ApiProperty({ description: 'Order ID to dispute' })
  @IsUUID()
  orderId: string;

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
