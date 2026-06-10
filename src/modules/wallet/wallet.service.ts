import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { LedgerService } from './ledger.service';
import { Currency, Role, LedgerType } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) { }

  /**
   * Returns all wallets for a user with their current balances.
   */
  async getUserWallets(userId: string) {
    return this.prisma.wallet.findMany({
      where: { userId },
      include: {
        _count: {
          select: { ledgerEntries: true },
        },
      },
    });
  }

  /**
   * Gets or creates a wallet for a specific currency for a user.
   */
  async getOrCreateWallet(userId: string, currency: Currency) {
    let wallet = await this.prisma.wallet.findUnique({
      where: {
        userId_currency: { userId, currency },
      },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          currency,
          balance: 0,
        },
      });
    }

    return wallet;
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
    metadata?: any;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create WalletTransaction
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: params.walletId,
          type: params.type,
          amount: new Prisma.Decimal(params.amount),
          reference: params.reference,
          status: 'COMPLETED', // Simplified for now
          metadata: params.metadata || {},
        },
      });

      // 2. Create LedgerEntry via LedgerService
      await this.ledger.createEntry(tx, {
        walletId: params.walletId,
        transactionId: transaction.id,
        amount: params.amount,
        type: params.type,
        reference: `${params.reference}-ledger`,
        metadata: params.metadata,
      });

      return transaction;
    });
  }

  /**
   * Calculates the real balance by summing ledger entries since the last snapshot.
   * This verifies the denormalized 'balance' field in the Wallet model.
   */
  async verifyAndSyncBalance(walletId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id: walletId },
      include: {
        snapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');

    const lastSnapshot = wallet.snapshots[0];
    const snapshotBalance = lastSnapshot ? lastSnapshot.balance : new Prisma.Decimal(0);
    const snapshotDate = lastSnapshot ? lastSnapshot.createdAt : new Date(0);

    const ledgerSum = await this.prisma.ledgerEntry.aggregate({
      where: {
        walletId,
        createdAt: { gt: snapshotDate },
      },
      _sum: {
        amount: true,
      },
    });

    const calculatedBalance = snapshotBalance.plus(ledgerSum._sum.amount || 0);

    // If there's a discrepancy, we sync it (in a real production app, this would trigger an alert)
    if (!calculatedBalance.equals(wallet.balance)) {
      await this.prisma.wallet.update({
        where: { id: walletId },
        data: { balance: calculatedBalance },
      });
    }

    return calculatedBalance;
  }
}

import { Prisma } from '@prisma/client';
