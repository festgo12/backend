import { Controller, Get, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
// import { Response } from 'express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
// import { TransactionsService, TransactionFilters } from './transactions.service';
import { TransactionsService, type TransactionFilters } from './transactions.service';
import type { User } from '@src/generated/client';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) { }

  @Get()
  @ApiOperation({ summary: 'Get unified paginated transaction history' })
  async getHistory(@GetUser() user: User, @Query() query: TransactionFilters) {
    return this.transactionsService.getTransactionHistory(user.id, query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export user transaction history as CSV' })
  async export(
    @GetUser() user: User,
    @Query() query: TransactionFilters,
    @Res() res: Response,
  ) {
    const csv = await this.transactionsService.exportTransactions(user.id, query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_export_${Date.now()}.csv`);
    return res.status(200).send(csv);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction details' })
  async getDetails(@GetUser() user: User, @Param('id') id: string) {
    return this.transactionsService.getTransactionDetails(user.id, id);
  }
}
