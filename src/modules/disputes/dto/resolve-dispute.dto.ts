import { IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisputeStatus } from '@src/generated/client';

export class ResolveDisputeDto {
  @ApiProperty({ description: 'Resolution details', minLength: 10, maxLength: 5000 })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  resolution: string;

  @ApiPropertyOptional({
    enum: [DisputeStatus.RESOLVED, DisputeStatus.REJECTED],
    description: 'Outcome status (RESOLVED or REJECTED)',
    default: DisputeStatus.RESOLVED,
  })
  @IsEnum([DisputeStatus.RESOLVED, DisputeStatus.REJECTED])
  @IsOptional()
  outcome?: DisputeStatus = DisputeStatus.RESOLVED;
}
