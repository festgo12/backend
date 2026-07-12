import { Controller, Get, Post, Body, UseGuards, Query, Headers, BadRequestException, Logger, Param } from '@nestjs/common';
import { RolesGuard } from '../../core/security/guards/roles.guard';
import { Roles } from '../../core/security/decorators/roles.decorator';
import { Currency, LedgerType, Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { PaystackService } from './paystack.service';
import { WalletService } from '../wallet/wallet.service';
import { AuditLog } from '../audit/audit.decorator';

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
  async initialize(@GetUser() user: User, @Body('amount') amount: number) {
    if (!user.email) throw new BadRequestException('User email is required for Paystack');
    if (!amount || amount <= 0) throw new BadRequestException('Invalid amount');

    try {
      const reference = `DEP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const result = await this.paystackService.initializeTransaction(user.email, amount, reference, {
        userId: user.id,
        type: 'DEPOSIT',
      });

      // Create a pending transaction in our DB
      const wallet = await this.walletService.getOrCreateWallet(user.id, Currency.NGN);
      
      await this.walletService.createTransaction({
        walletId: wallet.id,
        type: LedgerType.DEPOSIT,
        amount,
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
  async verifyAccount(
    @Query('accountNumber') accountNumber: string,
    @Query('bankCode') bankCode: string,
  ) {
    if (!accountNumber || !bankCode) throw new BadRequestException('Missing parameters');
    return this.paystackService.verifyAccountNumber(accountNumber, bankCode);
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
            paystack_data: verification.data
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
  async initiateTransfer(
    @GetUser() user: User,
    @Body('amount') amount: number,
    @Body('accountNumber') accountNumber: string,
    @Body('bankCode') bankCode: string,
    @Body('accountName') accountName: string,
  ) {
    if (!amount || amount <= 0) throw new BadRequestException('Invalid amount');

    // 1. Check if user has enough balance
    const wallet = await this.walletService.getOrCreateWallet(user.id, Currency.NGN);
    if (wallet.balance.toNumber() < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // 2. Create Transfer Recipient
    const recipientResult = await this.paystackService.createTransferRecipient(
      accountName,
      accountNumber,
      bankCode,
    );
    const recipientCode = recipientResult.data.recipient_code;

    // 3. Initiate Transfer
    const reference = `WDL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const transferResult = await this.paystackService.initiateTransfer(
      amount,
      recipientCode,
      `P2N Withdrawal for ${user.email}`,
      reference,
    );

    // 4. Log the transaction as pending/processing and debit/reserve balance
    // This part requires careful financial logic (Reserving balance)
    await this.walletService.createTransaction({
      walletId: wallet.id,
      type: LedgerType.WITHDRAWAL,
      amount: -amount, // Negative for withdrawal
      reference,
      metadata: { 
        paystack_transfer_code: transferResult.data.transfer_code,
        status: 'PROCESSING'
      },
    });

    return transferResult;
  }


  @Post('webhook')
  @ApiOperation({ summary: 'Paystack Webhook' })
  async handleWebhook(@Body() payload: any, @Headers('x-paystack-signature') signature: string) {
    if (!this.paystackService.verifySignature(payload, signature)) {
      this.logger.warn('Invalid Paystack Webhook Sig received');
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log(`Received Paystack Webhook: ${payload.event}`);

    // Process events
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
    
    // 1. Find the pending transaction
    const transaction = await this.walletService.findTransactionByReference(data.reference);
    if (!transaction || transaction.status === 'COMPLETED') return;

    // 2. Complete the transaction and credit the wallet
    await this.walletService.updateTransactionStatus(transaction.id, 'COMPLETED', {
      paystack_data: data
    });
  }

  private async handleTransferSuccess(data: any) {
    this.logger.log(`Handling transfer.success for ref: ${data.reference}`);
    
    const transaction = await this.walletService.findTransactionByReference(data.reference);
    if (!transaction || transaction.status === 'COMPLETED') return;

    await this.walletService.updateTransactionStatus(transaction.id, 'COMPLETED', {
      paystack_data: data
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
