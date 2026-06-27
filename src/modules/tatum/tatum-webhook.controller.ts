import { Controller, Post, Get, Body, Headers, HttpCode, HttpStatus, Logger, UnauthorizedException, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TatumWebhookService } from './tatum-webhook.service';
import { TatumDepositService } from './tatum-deposit.service';

import { PrismaService } from '../../core/database/prisma.service';

@ApiTags('Tatum Webhooks')
@Controller('tatum/webhooks')
export class TatumWebhookController {
  private readonly logger = new Logger(TatumWebhookController.name);

  constructor(
    private readonly webhookService: TatumWebhookService,
    private readonly depositService: TatumDepositService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('incoming')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle incoming Tatum webhooks' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-tatum-signature') signature: string,
  ) {
    // 1. Verify Signature
    if (!this.webhookService.verifySignature(payload, signature)) {
      this.logger.error('Invalid Tatum webhook signature received.');
      throw new UnauthorizedException('Invalid signature');
    }

    this.logger.log(`Received Tatum webhook: ${payload.subscriptionType}`);

    // 2. Dispatch based on type
    switch (payload.subscriptionType) {
      case 'ADDRESS_TRANSACTION':
      case 'INCOMING_BLOCKCHAIN_TRANSACTION':
        await this.depositService.handleDepositNotification({
          address: payload.address,
          amount: payload.amount,
          asset: payload.asset,
          txId: payload.txId,
          reference: payload.reference,
        });
        break;
      
      case 'CONFIRMATION_COUNT_REACHED':
        await this.handleConfirmation(payload);
        break;
      
      default:
        this.logger.log(`Unhandled webhook type: ${payload.subscriptionType}`);
    }

    return { received: true };
  }


  @Get('testnet/:currency/:amount')
  @ApiOperation({ summary: 'Simulate a Tatum testnet deposit for testing' })
  async simulateTestnetDeposit(
    @Param('currency') currency: string,
    @Param('amount') amount: string,
    @Query('address') address?: string,
  ) {
    this.logger.log(`Simulating testnet deposit: ${amount} ${currency} (Address: ${address || 'any'})`);

    // 1. Find a wallet to credit
    let wallet;
    if (address) {
      wallet = await this.prisma.wallet.findUnique({
        where: { address },
      });
    } else {
      wallet = await this.prisma.wallet.findFirst({
        where: { 
          currency: currency.toUpperCase() as any,
          address: { not: null }
        },
      });
    }

    if (!wallet || !wallet.address) {
      throw new NotFoundException(`No wallet with address found for ${currency}`);
    }

    const txId = `sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 2. Trigger deposit notification (creates PENDING transaction)
    await this.depositService.handleDepositNotification({
      address: wallet.address,
      amount,
      asset: currency.toUpperCase(),
      txId,
    });

    // 3. Immediately trigger confirmation completion for testing (marks as COMPLETED)
    await this.webhookService.markTransactionAsCompleted(txId);

    return {
      success: true,
      message: `Simulated ${amount} ${currency} deposit to ${wallet.address}`,
      txId,
      walletId: wallet.id,
      userId: wallet.userId
    };
  }

  private async handleConfirmation(payload: any) {
    const { txId, confirmations } = payload;
    this.logger.log(`Transaction ${txId} reached ${confirmations} confirmations.`);

    // If confirmation count reaches threshold, mark local transaction as COMPLETED
    const threshold = 3; // Example threshold
    if (confirmations >= threshold) {
      await this.webhookService.markTransactionAsCompleted(txId);
    }
  }
}
