import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { AuditLog } from '../audit/audit.decorator';

@ApiTags('Disputes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @AuditLog('DISPUTE_OPENED', 'DISPUTE')
  @ApiOperation({ summary: 'Open a new dispute for an order' })
  create(@Request() req, @Body() dto: CreateDisputeDto) {
    return this.disputesService.createDispute(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all disputes for the current user' })
  findAll(@Request() req) {
    return this.disputesService.getUserDisputes(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute details with evidence' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.disputesService.getDispute(id, req.user.id);
  }

  @Post(':id/evidence')
  @AuditLog('EVIDENCE_UPLOADED', 'EVIDENCE')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload evidence to a dispute' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Evidence file (image, PDF, or video up to 10MB)',
        },
      },
      required: ['file'],
    },
  })
  uploadEvidence(
    @Param('id') id: string,
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.disputesService.addEvidence(id, req.user.id, file);
  }

  @Get(':id/evidence')
  @ApiOperation({ summary: 'List evidence for a dispute' })
  listEvidence(@Param('id') id: string, @Request() req) {
    return this.disputesService.listEvidence(id, req.user.id);
  }
}
