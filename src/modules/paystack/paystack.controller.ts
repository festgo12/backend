import { Controller, Get, Post, Body, UseGuards, Query, Headers, BadRequestException, Logger, Param, Req } from '@nestjs/common';
import { RolesGuard } from '../../core/security/guards/roles.guard';
import { Roles } from '../../core/security/decorators/roles.decorator';
import { Currency, LedgerType, Role } from '@src/generated/client';
import type { User } from '@src/generated/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { PaystackService } from './paystack.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditLog } from '../audit/audit.decorator';
import { InitializeDepositDto } from './dto/initialize-deposit.dto';
import { InitiateTransferDto } from './dto/initiate-transfer.dto';
import { VerifyAccountDto } from './dto/verify-account.dto';
import { InitiateRefundDto } from './dto/initiate-refund.dto';
import type { Request } from 'express';

@ApiTags('Paystack Payment')
@Controller('paystack')
export class PaystackController {
  private readonly logger = new Logger(PaystackController.name);

  constructor(
    private readonly paystackService: PaystackService,
    private readonly walletService: WalletService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('initialize')
  @AuditLog('WALLET_DEPOSIT', 'WALLET')
  @ApiOperation({ summary: 'Initialize a deposit transaction' })
  async initialize(@GetUser() user: User, @Body() dto: InitializeDepositDto) {
    if (!user.email) throw new BadRequestException('User email is required for Paystack');

    try {
      const reference = `DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const result = await this.paystackService.initializeTransaction(user.email, dto.amount, reference, {
        userId: user.id,
        type: 'DEPOSIT',
      });

      const wallet = await this.walletService.getOrCreateWallet(user.id, Currency.NGN);

      await this.walletService.createTransaction({
        walletId: wallet.id,
        type: LedgerType.DEPOSIT,
        amount: dto.amount,
        reference,
        status: 'PENDING',
        metadata: {
          paystack_ref: result.data.reference,
        },
      });

      return result;
    } catch (error) {
      this.logger.error(`Deposit initialization failed for ${user.email}: ${error.message}`);
      throw new BadRequestException(error.message || 'Failed to initialize deposit');
    }
  }

  @Get('banks')
  @ApiOperation({ summary: 'Get list of supported banks' })
  async getBanks() {
    return this.paystackService.listBanks();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('verify-account')
  @ApiOperation({ summary: 'Verify bank account number' })
  async verifyAccount(@Query() dto: VerifyAccountDto) {
    return this.paystackService.verifyAccountNumber(dto.accountNumber, dto.bankCode);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('verify/:reference')
  @ApiOperation({ summary: 'Verify a deposit transaction status from Paystack' })
  async verify(@Param('reference') reference: string) {
    if (!reference) throw new BadRequestException('Reference is required');
    try {
      const verification = await this.paystackService.verifyTransaction(reference);
      if (verification && verification.status === true && verification.data.status === 'success') {
        const transaction = await this.walletService.findTransactionByReference(reference);
        if (transaction && transaction.status !== 'COMPLETED') {
          this.logger.log(`Paystack manual verification success for ref: ${reference}`);
          await this.walletService.updateTransactionStatus(transaction.id, 'COMPLETED', {
            paystack_data: verification.data,
          });
        }
        return { status: 'success', data: verification.data };
      }
      return { status: 'failed', message: 'Transaction not successful on Paystack' };
    } catch (error) {
      this.logger.error(`Paystack manual verification failed for ref ${reference}: ${error.message}`);
      throw new BadRequestException(error.message || 'Verification failed');
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('transfer')
  @AuditLog('WALLET_WITHDRAWAL', 'WALLET')
  @ApiOperation({ summary: 'Initiate a withdrawal (transfer)' })
  async initiateTransfer(@GetUser() user: User, @Body() dto: InitiateTransferDto) {
    const wallet = await this.walletService.getOrCreateWallet(user.id, Currency.NGN);
    if (wallet.balance.toNumber() < dto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const recipientResult = await this.paystackService.createTransferRecipient(
      dto.accountName,
      dto.accountNumber,
      dto.bankCode,
    );
    const recipientCode = recipientResult.data.recipient_code;

    const reference = `WDL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const transferResult = await this.paystackService.initiateTransfer(
      dto.amount,
      recipientCode,
      `P2N Withdrawal for ${user.email}`,
      reference,
    );

    await this.walletService.createTransaction({
      walletId: wallet.id,
      type: LedgerType.WITHDRAWAL,
      amount: -dto.amount,
      reference,
      status: 'PROCESSING',
      metadata: {
        paystack_transfer_code: transferResult.data.transfer_code,
        paystack_recipient_code: recipientCode,
        account_number: dto.accountNumber,
        bank_code: dto.bankCode,
        account_name: dto.accountName,
      },
    });

    return transferResult;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('refund')
  @AuditLog('PAYMENT_REFUND', 'WALLET')
  @ApiOperation({ summary: 'Initiate a refund (admin only)' })
  async initiateRefund(@GetUser() user: User, @Body() dto: InitiateRefundDto) {
    const transaction = await this.walletService.findTransactionById(dto.transactionId);
    if (!transaction) throw new BadRequestException('Transaction not found');
    if (transaction.status !== 'COMPLETED') throw new BadRequestException('Only completed transactions can be refunded');

    const paystackRef = (transaction.metadata as any)?.paystack_ref;
    if (!paystackRef) throw new BadRequestException('No Paystack reference found for this transaction');

    const refundResult = await this.paystackService.initiateRefund(paystackRef, dto.amount);

    await this.walletService.reverseTransaction(
      dto.transactionId,
      `Refund initiated by admin ${user.email}`,
    );

    return refundResult;
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Paystack Webhook' })
  async handleWebhook(@Req() req: Request, @Body() payload: any, @Headers('x-paystack-signature') signature: string) {
    const rawBody = (req as any).rawBody;
    if (!rawBody || !this.paystackService.verifySignature(rawBody, signature)) {
      this.logger.warn('Invalid Paystack Webhook Signature received');
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log(`Received Paystack Webhook: ${payload.event}`);

    switch (payload.event) {
      case 'charge.success':
        await this.handleChargeSuccess(payload.data);
        break;
      case 'transfer.success':
        await this.handleTransferSuccess(payload.data);
        break;
      case 'transfer.failed':
        await this.handleTransferFailed(payload.data);
        break;
      case 'transfer.reversed':
        await this.handleTransferReversed(payload.data);
        break;
      default:
        this.logger.log(`Unhandled Paystack event: ${payload.event}`);
    }

    return { status: 'success' };
  }

  private async handleChargeSuccess(data: any) {
    this.logger.log(`Handling charge.success for ref: ${data.reference}`);

    const transaction = await this.walletService.findTransactionByReference(data.reference);
    if (!transaction || transaction.status === 'COMPLETED') return;

    await this.walletService.updateTransactionStatus(transaction.id, 'COMPLETED', {
      paystack_data: data,
    });
  }

  private async handleTransferSuccess(data: any) {
    this.logger.log(`Handling transfer.success for ref: ${data.reference}`);

    const transaction = await this.walletService.findTransactionByReference(data.reference);
    if (!transaction || transaction.status === 'COMPLETED') return;

    await this.walletService.updateTransactionStatus(transaction.id, 'COMPLETED', {
      paystack_data: data,
    });
  }

  private async handleTransferFailed(data: any) {
    this.logger.log(`Handling transfer.failed for ref: ${data.reference}`);

    const transaction = await this.walletService.findTransactionByReference(data.reference);
    if (!transaction || transaction.status === 'FAILED' || transaction.status === 'REVERSED') return;

    await this.walletService.reverseTransaction(transaction.id, data.reason || 'Transfer failed');
  }

  private async handleTransferReversed(data: any) {
    this.logger.log(`Handling transfer.reversed for ref: ${data.reference}`);

    const transaction = await this.walletService.findTransactionByReference(data.reference);
    if (!transaction || transaction.status === 'REVERSED') return;

    await this.walletService.reverseTransaction(transaction.id, 'Transfer reversed by Paystack');
  }
}
