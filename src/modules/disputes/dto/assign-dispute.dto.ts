import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignDisputeDto {
  @ApiProperty({ description: 'Admin user ID to assign the dispute to' })
  @IsUUID()
  assigneeId: string;
}
