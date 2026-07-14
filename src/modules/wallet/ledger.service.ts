import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { LedgerType, Prisma } from '@src/generated/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executes an atomic credit or debit on a wallet within a Prisma transaction.
   * This is the ONLY way to change a wallet's balance.
   */
  async createEntry(
    tx: Prisma.TransactionClient,
    params: {
      walletId: string;
      transactionId?: string;
      orderId?: string;
      amount: number; // Positive for credit, negative for debit
      type: LedgerType;
      reference: string;
      metadata?: any;
    },
  ) {
    const { walletId, transactionId, orderId, amount, type, reference, metadata } = params;

    // 1. Get current balance from Wallet (denormalized for the UI, but we check against it)
    const wallet = await tx.wallet.findUnique({
      where: { id: walletId },
      select: { balance: true },
    });

    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`);
    }

    const currentBalance = new Prisma.Decimal(wallet.balance);
    const newBalance = currentBalance.plus(new Prisma.Decimal(amount));

    if (newBalance.lessThan(0)) {
      throw new ConflictException('Insufficient funds for this operation');
    }

    // 2. Create the LedgerEntry
    const entry = await tx.ledgerEntry.create({
      data: {
        walletId,
        transactionId,
        orderId,
        amount: new Prisma.Decimal(amount),
        type,
        reference,
        balanceAfter: newBalance,
        metadata: metadata || {},
      },
    });

    // 3. Update the Wallet balance
    await tx.wallet.update({
      where: { id: walletId },
      data: {
        balance: newBalance,
      },
    });

    return entry;
  }
}
