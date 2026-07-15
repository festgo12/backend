import { IsBoolean, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFraudRuleDto {
  @ApiPropertyOptional({ description: 'Enable or disable this rule' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Threshold value for this rule', minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  threshold?: number;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], description: 'Severity level' })
  @IsString()
  @IsOptional()
  severity?: string;

  @ApiPropertyOptional({ enum: ['ALERT', 'FREEZE', 'BLOCK'], description: 'Action to take when rule triggers' })
  @IsString()
  @IsOptional()
  action?: string;
}
