import { Controller, Post, Get, Body, Headers, HttpCode, HttpStatus, Logger, UnauthorizedException, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TatumWebhookService } from './tatum-webhook.service';
import { TatumDepositService } from './tatum-deposit.service';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletService } from '../wallet/wallet.service';

@ApiTags('Tatum Webhooks')
@Controller('tatum/webhooks')
export class TatumWebhookController {
  private readonly logger = new Logger(TatumWebhookController.name);

  private readonly CONFIRMATION_THRESHOLDS: Record<string, number> = {
    bitcoin: 3,
    ethereum: 12,
  };

  constructor(
    private readonly webhookService: TatumWebhookService,
    private readonly depositService: TatumDepositService,
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('incoming')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle incoming Tatum webhooks' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-tatum-signature') signature: string,
  ) {
    if (!this.webhookService.verifySignature(payload, signature)) {
      this.logger.error('Invalid Tatum webhook signature received.');
      throw new UnauthorizedException('Invalid signature');
    }

    this.logger.log(`Received Tatum webhook: ${payload.subscriptionType} | chain: ${payload.chain || 'unknown'}`);

    switch (payload.subscriptionType) {
      case 'ADDRESS_TRANSACTION':
      case 'INCOMING_BLOCKCHAIN_TRANSACTION':
        await this.handleIncomingDeposit(payload);
        break;

      case 'CONFIRMATION_COUNT_REACHED':
        await this.handleConfirmation(payload);
        break;

      case 'OUTGOING_BLOCKCHAIN_TRANSACTION':
        await this.handleOutgoingSuccess(payload);
        break;

      case 'OUTGOING_BLOCKCHAIN_TRANSACTION_FAILED':
        await this.handleOutgoingFailed(payload);
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

    let wallet;
    if (address) {
      wallet = await this.prisma.wallet.findUnique({ where: { address } });
    } else {
      wallet = await this.prisma.wallet.findFirst({
        where: {
          currency: currency.toUpperCase() as any,
          address: { not: null },
        },
      });
    }

    if (!wallet || !wallet.address) {
      throw new NotFoundException(`No wallet with address found for ${currency}`);
    }

    const txId = `sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await this.depositService.handleDepositNotification({
      address: wallet.address,
      amount,
      asset: currency.toUpperCase(),
      txId,
    });

    await this.webhookService.markTransactionAsCompleted(txId);

    return {
      success: true,
      message: `Simulated ${amount} ${currency} deposit to ${wallet.address}`,
      txId,
      walletId: wallet.id,
      userId: wallet.userId,
    };
  }

  /**
   * Handles incoming deposit notifications.
   * Creates a PENDING transaction; completion waits for sufficient confirmations.
   */
  private async handleIncomingDeposit(payload: any) {
    const { address, amount, asset, txId, reference, from: sourceAddress } = payload;

    if (!address || !txId) {
      this.logger.warn('Incoming deposit webhook missing address or txId. Skipping.');
      return;
    }

    await this.depositService.handleDepositNotification({
      address,
      amount: String(amount),
      asset: asset || 'UNKNOWN',
      txId,
      reference,
      sourceAddress,
    });
  }

  /**
   * When enough confirmations are reached, mark the deposit as COMPLETED.
   */
  private async handleConfirmation(payload: any) {
    const { txId, confirmations, chain } = payload;

    if (!txId) {
      this.logger.warn('Confirmation webhook missing txId. Skipping.');
      return;
    }

    const threshold = this.CONFIRMATION_THRESHOLDS[chain] || 3;
    this.logger.log(`Transaction ${txId}: ${confirmations}/${threshold} confirmations (${chain})`);

    if (confirmations >= threshold) {
      await this.webhookService.markTransactionAsCompleted(txId);
    }
  }

  /**
   * Handles successful outgoing (withdrawal) blockchain transactions.
   */
  private async handleOutgoingSuccess(payload: any) {
    const { txId } = payload;

    if (!txId) {
      this.logger.warn('Outgoing success webhook missing txId. Skipping.');
      return;
    }

    this.logger.log(`Outgoing transaction confirmed: ${txId}`);

    const transaction = await this.prisma.walletTransaction.findUnique({
      where: { reference: txId },
    });

    if (!transaction) {
      this.logger.warn(`No pending withdrawal found for txId ${txId}`);
      return;
    }

    if (transaction.status === 'COMPLETED') {
      this.logger.log(`Transaction ${txId} already completed. Skipping.`);
      return;
    }

    await this.walletService.updateTransactionStatus(transaction.id, 'COMPLETED');
    this.logger.log(`Withdrawal ${txId} marked as COMPLETED`);
  }

  /**
   * Handles failed outgoing (withdrawal) blockchain transactions.
   */
  private async handleOutgoingFailed(payload: any) {
    const { txId, error } = payload;

    if (!txId) {
      this.logger.warn('Outgoing failure webhook missing txId. Skipping.');
      return;
    }

    this.logger.error(`Outgoing transaction failed: ${txId} - ${error || 'unknown error'}`);

    const transaction = await this.prisma.walletTransaction.findUnique({
      where: { reference: txId },
    });

    if (!transaction || transaction.status === 'COMPLETED') {
      return;
    }

    await this.walletService.updateTransactionStatus(transaction.id, 'FAILED', {
      lastError: error || 'Blockchain transaction failed',
      failedAt: new Date().toISOString(),
    });

    this.logger.log(`Withdrawal ${txId} marked as FAILED`);
  }
}
