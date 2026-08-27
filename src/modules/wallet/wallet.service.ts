import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { LedgerService } from './ledger.service';
import { ExchangeRateService } from '../crypto/exchange-rate.service';
import { Currency, LedgerType, Prisma } from '@src/generated/client';

export interface WalletTransactionEvent {
  transactionId: string;
  walletId: string;
  type: string;
  reference: string;
  amount: number;
  status: string;
}

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Returns all wallets for a user with their current balances.
   * Uses live exchange rates from CoinGecko (via ExchangeRateService).
   */
  async getUserWallets(userId: string) {
    const wallets = await this.prisma.wallet.findMany({
      where: { userId },
      include: {
        _count: {
          select: { ledgerEntries: true },
        },
      },
    });

    const rates = this.exchangeRateService.getAllRates();

    return wallets.map((w) => ({
      ...w,
      balanceInNgn: w.balance.mul(rates[w.currency] || 0),
    }));
  }

  /**
   * Gets or creates a wallet for a specific currency for a user.
   */
  async getOrCreateWallet(userId: string, currency: Currency) {
    return this.prisma.wallet.upsert({
      where: { userId_currency: { userId, currency } },
      create: { userId, currency, balance: 0 },
      update: {},
    });
  }

  /**
   * Returns transaction history (from LedgerEntry) for a wallet.
   */
  async getWalletHistory(walletId: string, limit: number = 20, offset: number = 0) {
    return this.prisma.ledgerEntry.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        transaction: true,
        wallet: {
          select: {
            currency: true,
          },
        },
      },
    });
  }

  /**
   * Returns transaction history (from LedgerEntry) across all wallets for a user.
   */
  async getUserHistory(userId: string, limit: number = 20, offset: number = 0) {
    return this.prisma.ledgerEntry.findMany({
      where: {
        wallet: { userId },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        transaction: true,
        wallet: {
          select: {
            currency: true,
          },
        },
      },
    });
  }


  /**
   * Initiates a wallet transaction (e.g. Deposit, Withdrawal) and creates ledger entries.
   */
  async createTransaction(params: {
    walletId: string;
    type: LedgerType;
    amount: number;
    reference: string;
    status?: string;
    metadata?: any;
  }) {
    const transaction = await this.prisma.$transaction(async (tx) => {
      // 1. Create WalletTransaction
      const txRecord = await tx.walletTransaction.create({
        data: {
          walletId: params.walletId,
          type: params.type,
          amount: new Prisma.Decimal(params.amount),
          reference: params.reference,
          status: params.status || 'PENDING',
          metadata: params.metadata || {},
        },
      });

      // 2. Create LedgerEntry via LedgerService ONLY if status is COMPLETED
      if (params.status === 'COMPLETED') {
        await this.ledger.createEntry(tx, {
          walletId: params.walletId,
          transactionId: txRecord.id,
          amount: params.amount,
          type: params.type,
          reference: `${params.reference}-ledger`,
          metadata: params.metadata,
        });
      }

      return txRecord;
    });

    this.emitTransactionEvent(transaction, params.status || 'PENDING');

    return transaction;
  }

  /**
   * Emits domain events consumed by the notifications handler so users are
   * alerted about deposits and withdrawals (crypto + Paystack unified).
   */
  private emitTransactionEvent(
    transaction: { id: string; walletId: string; type: string; reference: string; amount: Prisma.Decimal; status: string },
    status: string,
  ): void {
    const payload: WalletTransactionEvent = {
      transactionId: transaction.id,
      walletId: transaction.walletId,
      type: transaction.type,
      reference: transaction.reference,
      amount: transaction.amount.toNumber(),
      status,
    };

    if (transaction.type === LedgerType.WITHDRAWAL) {
      if (status === 'COMPLETED') {
        this.eventEmitter.emit('wallet.withdrawal.confirmed', payload);
      } else if (status === 'FAILED') {
        this.eventEmitter.emit('wallet.withdrawal.failed', payload);
      } else {
        this.eventEmitter.emit('wallet.withdrawal.initiated', payload);
      }
    } else if (transaction.type === LedgerType.DEPOSIT && status === 'COMPLETED') {
      this.eventEmitter.emit('wallet.deposit.confirmed', payload);
    }
  }

  /**
   * Updates a wallet's local-first HD deposit info (address, derivation index
   * and chain kind). Used when the crypto provider is "alchemy".
   */
  async updateWalletDepositInfo(
    walletId: string,
    params: { address: string; derivationIndex: number; chain: string },
  ) {
    return this.prisma.wallet.update({
      where: { id: walletId },
      data: params,
    });
  }

  /**
   * Finds a transaction by its ID.
   */
  async findTransactionById(id: string) {
    return this.prisma.walletTransaction.findUnique({
      where: { id },
    });
  }

  /**
   * Finds a transaction by its reference.
   */
  async findTransactionByReference(reference: string) {
    return this.prisma.walletTransaction.findUnique({
      where: { reference },
    });
  }

  /**
   * Valid status transitions: maps current status to allowed next statuses.
   */
  private static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    PENDING: ['COMPLETED', 'FAILED', 'PROCESSING'],
    PROCESSING: ['COMPLETED', 'FAILED'],
    FAILED: ['CANCELLED'],
    COMPLETED: ['REVERSED'],
    REVERSED: [],
    CANCELLED: [],
  };

  /**
   * Updates transaction status and creates ledger entry if completed.
   */
  async updateTransactionStatus(transactionId: string, status: string, metadata?: any) {
    let changed = false;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const current = await tx.walletTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!current) throw new NotFoundException('Transaction not found');

      const allowed = WalletService.VALID_TRANSITIONS[current.status];
      if (!allowed || !allowed.includes(status)) {
        throw new BadRequestException(
          `Cannot transition from ${current.status} to ${status}`,
        );
      }

      // Block direct REVERSED transitions — must go through reverseTransaction()
      if (status === 'REVERSED') {
        throw new BadRequestException(
          'Reversals must use reverseTransaction(); do not call updateTransactionStatus with REVERSED',
        );
      }

      // Idempotent: no-op if already at the target status
      if (current.status === status) return current;
      changed = true;

      const updatedMetadata = {
        ...(current.metadata as any || {}),
        ...(metadata || {}),
      };

      const transaction = await tx.walletTransaction.update({
        where: { id: transactionId },
        data: {
          status,
          metadata: updatedMetadata,
        },
      });

      if (status === 'COMPLETED') {
        // Create LedgerEntry if it doesn't already exist for this transaction.
        // Rows flagged ledgerSettled (on-chain tracking for trades) never create
        // ledger entries - the internal ledger already reflects the settlement.
        const existingEntry = await tx.ledgerEntry.findFirst({
          where: { transactionId: transaction.id },
        });

        if (!existingEntry && !updatedMetadata.ledgerSettled) {
          await this.ledger.createEntry(tx, {
            walletId: transaction.walletId,
            transactionId: transaction.id,
            amount: transaction.type === LedgerType.WITHDRAWAL
              ? -transaction.amount.toNumber()  // Negative for withdrawals
              : transaction.amount.toNumber(),
            type: transaction.type,
            reference: `${transaction.reference}-ledger`,
            metadata: updatedMetadata,
          });
        }
      }

      return transaction;
    });

    if (changed) {
      this.emitTransactionEvent(transaction, status);
    }

    return transaction;
  }

  /**
   * Reverses a failed transaction by creating an offsetting ledger entry.
   * Deposits are reversed by debiting; withdrawals are reversed by crediting.
   * Uses conditional updateMany to prevent double-refund races.
   */
  async reverseTransaction(transactionId: string, reason: string) {
    const reversedTransaction = await this.prisma.$transaction(async (tx) => {
      // Conditional update: only transition to REVERSED if not already reversed.
      // This prevents double-refund when Paystack sends both transfer.failed
      // and transfer.reversed for the same event.
      const affected = await tx.$executeRaw`
        UPDATE "WalletTransaction"
        SET "status" = 'REVERSED',
            "metadata" = "metadata" || ${JSON.stringify({ reverse_reason: reason })}::jsonb
        WHERE "id" = ${transactionId}
          AND "status" != 'REVERSED'
      `;

      if (affected === 0) return null;

      const transaction = await tx.walletTransaction.findUnique({
        where: { id: transactionId },
      });
      if (!transaction) return null;

      // Reverse direction: deposits (positive amount) → debit; withdrawals (negative impact) → credit
      const depositTypes: string[] = [LedgerType.DEPOSIT, LedgerType.GIFT_CARD_PURCHASE];
      const isDeposit = depositTypes.includes(transaction.type);
      const reverseAmount = isDeposit
        ? -Math.abs(transaction.amount.toNumber())
        : Math.abs(transaction.amount.toNumber());

      await this.ledger.createEntry(tx, {
        walletId: transaction.walletId,
        transactionId: transaction.id,
        amount: reverseAmount,
        type: LedgerType.TRADE_REFUND,
        reference: `${transaction.reference}-rev`,
        metadata: { reason },
      });

      return transaction;
    });

    // A reversed withdrawal means the funds were refunded — alert the user.
    if (reversedTransaction?.type === LedgerType.WITHDRAWAL) {
      this.emitTransactionEvent(reversedTransaction, 'FAILED');
    }
  }
}
