import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TatumWebhookService } from './tatum-webhook.service';
import { TatumDepositService } from './tatum-deposit.service';

@ApiTags('Tatum Webhooks')
@Controller('tatum/webhooks')
export class TatumWebhookController {
  private readonly logger = new Logger(TatumWebhookController.name);

  constructor(
    private readonly webhookService: TatumWebhookService,
    private readonly depositService: TatumDepositService,
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
