import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { LedgerType, Prisma } from '@src/generated/client';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executes an atomic credit or debit on a wallet within a Prisma transaction.
   * Uses conditional updateMany to prevent TOCTOU races on balance checks.
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

    const amountDecimal = new Prisma.Decimal(amount);

    // For debits (negative amount), use conditional updateMany to atomically
    // check + decrement. If 0 rows affected, balance was insufficient.
    if (amount < 0) {
      const absDebit = amountDecimal.abs();
      const affected = await tx.$executeRaw`
        UPDATE "Wallet"
        SET "balance" = "balance" + ${amountDecimal}
        WHERE "id" = ${walletId}::uuid
          AND "balance" >= ${absDebit}
      `;
      if (affected === 0) {
        throw new ConflictException('Insufficient funds for this operation');
      }
    } else {
      // Credits are unconditional atomic increments
      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: amountDecimal } },
      });
    }

    // Read back the updated balance for the ledger snapshot
    const wallet = await tx.wallet.findUnique({
      where: { id: walletId },
      select: { balance: true },
    });
    if (!wallet) throw new Error(`Wallet ${walletId} not found`);

    // Create the LedgerEntry
    const entry = await tx.ledgerEntry.create({
      data: {
        walletId,
        transactionId,
        orderId,
        amount: amountDecimal,
        type,
        reference,
        balanceAfter: wallet.balance,
        metadata: metadata || {},
      },
    });

    return entry;
  }
}
