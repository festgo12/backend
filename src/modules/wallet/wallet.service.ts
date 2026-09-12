import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { LedgerService } from './ledger.service';
import { ExchangeRateService } from '../crypto/exchange-rate.service';
import { Currency, LedgerType, Prisma } from '@src/generated/client';
import { primaryWalletWhere } from './wallet-query.util';

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
   * Per-chain deposited totals for a user's multi-chain crypto wallet.
   *
   * EVM-family chains (ETH/BSC/POLYGON) intentionally share one wallet row
   * and one ledger balance, so the per-chain breakdown lives in each deposit
   * transaction's metadata.chain (written by the webhook listener). This
   * aggregates COMPLETED DEPOSIT transactions per chain so the asset details
   * screen can show what was received on each network. Untagged/legacy rows
   * (recorded before per-chain tagging) are reported under 'EVM'.
   */
  async getChainDepositTotals(userId: string, currency: Currency) {
    const txs = await this.prisma.walletTransaction.findMany({
      where: {
        wallet: { userId, currency },
        type: LedgerType.DEPOSIT,
        status: 'COMPLETED',
      },
      select: { amount: true, metadata: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const totals: Record<string, number> = {};
    for (const tx of txs) {
      const meta = (tx.metadata ?? {}) as Record<string, unknown>;
      const rawChain = typeof meta.chain === 'string' ? meta.chain : 'EVM';
      // Legacy rows may carry the family value 'EVM'; keep it as its own key.
      const chain = rawChain.toUpperCase();
      totals[chain] = (totals[chain] ?? 0) + tx.amount.toNumber();
    }
    return { currency, totals };
  }

  /**
   * Gets or creates a wallet for a specific user + currency on a chain.
   *
   * When `chain` is omitted, resolves the user's primary wallet for the
   * currency (fiat NGN → the single chain-less row; crypto → the primary
   * EVM/BTC chain wallet). When `chain` is supplied, targets the exact chain.
   *
   * NGN single-wallet integrity is enforced here at the application layer:
   * with no unique on (userId, currency), a guard prevents a second NGN row.
   */
  async getOrCreateWallet(userId: string, currency: Currency, chain?: string) {
    if (currency === Currency.NGN) {
      const existing = await this.prisma.wallet.findFirst({
        where: { userId, currency, chain: null },
      });
      if (existing) return existing;
      return this.prisma.wallet.create({
        data: { userId, currency, chain: null, balance: 0 },
      });
    }

    const chainValue = chain ?? this.defaultChainValueForCurrency(currency);
    return this.prisma.wallet.upsert({
      where: {
        userId_currency_chain: { userId, currency, chain: chainValue },
      },
      create: { userId, currency, chain: chainValue, balance: 0 },
      update: {},
    });
  }

  /**
   * Gets or creates the user's wallet row for a specific chain, then ensures
   * the row carries the user's per-chain deposit address.
   *
   * Used by trades and wallet init: since the per-chain EVM refactor every
   * network (ETH/BSC/POLYGON/SOLANA/TRON) holds an independent row that is
   * created on demand — e.g. a buyer's first BSC trade auto-creates their BSC
   * row. Deposit-address assignment is handled by the caller (wallet
   * controller / hd-wallet service), which reuses the user's existing EVM
   * derivation index so the 0x address is identical across all EVM rows.
   *
   * `chain` values: ETH | BSC | POLYGON | SOLANA | TRON | BTC.
   */
  async getOrCreateChainWallet(userId: string, currency: Currency, chain: string) {
    if (currency === Currency.NGN) {
      return this.getOrCreateWallet(userId, currency);
    }
    const chainValue = chain === 'EVM' ? 'ETH' : chain.toUpperCase();
    return this.prisma.wallet.upsert({
      where: {
        userId_currency_chain: { userId, currency, chain: chainValue },
      },
      create: { userId, currency, chain: chainValue, balance: 0 },
      update: {},
    });
  }

  /** Primary stored `chain` value when creating a wallet with no explicit chain. */
  private defaultChainValueForCurrency(currency: Currency): string {
    if (currency === Currency.BTC) return 'BTC';
    // Per-chain EVM model: each EVM network (ETH/BSC/POLYGON) holds an
    // independent row. New EVM-family wallets default to the ETH row.
    return 'ETH';
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
   * Releases a withdrawal funds reservation inside the caller's transaction.
   *
   * Withdrawals reserve funds (reservedBalance += amount) before the external
   * transfer/broadcast; reaching a terminal state must release them, otherwise
   * user funds stay locked off-chain even after the ledger settles (audit
   * finding: unreleased reserved balance on FAILED withdrawals).
   *
   * GREATEST clamps at zero so corrupt rows (reserved < amount) cannot go
   * negative. The reserved amount is derived from abs(transaction.amount)
   * because legacy fiat withdrawal rows were stored negative.
   */
  private async releaseWithdrawalReservation(
    tx: Prisma.TransactionClient,
    walletId: string,
    amount: Prisma.Decimal,
  ): Promise<void> {
    await tx.$executeRaw`
      UPDATE "Wallet"
      SET "reservedBalance" = GREATEST("reservedBalance" - ${amount}, 0)
      WHERE "id" = ${walletId}::uuid
    `;
  }

  /**
   * True when a withdrawal row's funds were reserved by the withdrawal flows
   * (fiat transfer / crypto broadcast). Fee-wallet sweeps and rows whose
   * ledger was settled externally never reserve, so they must never release.
   */
  private static withdrawMetadataSaysSkipRelease(metadata: any): boolean {
    return Boolean(metadata?.sweep || metadata?.ledgerSettled);
  }

  /**
   * Updates transaction status and creates ledger entry if completed.
   *
   * Withdrawal rows additionally release their funds reservation when they
   * reach a terminal state (COMPLETED = ledger debit, FAILED = funds never
   * left). The status-transition guard above makes each terminal transition
   * once-only, so the release cannot double-fire.
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

      const isWithdrawal = current.type === LedgerType.WITHDRAWAL;
      const releasesReservation =
        isWithdrawal &&
        (status === 'COMPLETED' || status === 'FAILED') &&
        !WalletService.withdrawMetadataSaysSkipRelease(updatedMetadata);

      if (releasesReservation) {
        updatedMetadata.reservationReleasedAt = new Date().toISOString();
      }

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
            // abs(): the ledger debit is always a negative delta. Legacy fiat
            // rows stored the withdrawal amount negative, so negating the raw
            // value would credit instead of debit.
            amount: transaction.type === LedgerType.WITHDRAWAL
              ? -Math.abs(transaction.amount.toNumber())
              : transaction.amount.toNumber(),
            type: transaction.type,
            reference: `${transaction.reference}-ledger`,
            metadata: updatedMetadata,
          });
        }
      }

      // Release the withdrawal reservation on terminal state (see docstring).
      // After the ledger debit for COMPLETED, after no ledger change for FAILED.
      if (releasesReservation) {
        await this.releaseWithdrawalReservation(
          tx,
          transaction.walletId,
          transaction.amount.abs(),
        );
      }

      return transaction;
    });

    if (changed) {
      this.emitTransactionEvent(transaction, status);
    }

    return transaction;
  }

  /**
   * Reverses a transaction by creating an offsetting ledger entry.
   * Deposits are reversed by debiting; withdrawals are reversed by crediting.
   * Uses a conditional update to prevent double-refund races.
   *
   * Withdrawal credit safety: the refund credit is only valid when the
   * withdrawal previously DEBITED the ledger (prior status COMPLETED).
   * Paystack's transfer.failed / transfer.reversed webhooks arrive while the
   * row is still PENDING/PROCESSING — the ledger was never debited and only
   * the reservation is held, so crediting there would mint balance. Those
   * rows get the reservation released instead. Rows already FAILED were
   * handled by updateTransactionStatus (released there); REVERSED rows can
   * never reach this branch (the conditional update matches nothing).
   */
  async reverseTransaction(transactionId: string, reason: string) {
    const reversedTransaction = await this.prisma.$transaction(async (tx) => {
      // Atomic prior-status read: the row was debited by the ledger only if it
      // sat in COMPLETED. Combined with the status != 'REVERSED' guard below,
      // this reads/writes the same row inside one transaction, so webhook
      // races (transfer.failed + transfer.reversed) cannot double-fire.
      const prior = await tx.walletTransaction.findUnique({
        where: { id: transactionId },
      });
      if (!prior) return null;
      const wasDebited = prior.status === 'COMPLETED';

      // Conditional update: only transition to REVERSED if not already reversed.
      // This prevents double-refund when Paystack sends both transfer.failed
      // and transfer.reversed for the same event.
      const affected = await tx.$executeRaw`
        UPDATE "WalletTransaction"
        SET "status" = 'REVERSED',
            "metadata" = "metadata" || ${JSON.stringify({ reverse_reason: reason })}::jsonb
        WHERE "id" = ${transactionId}::uuid
          AND "status" != 'REVERSED'
      `;

      if (affected === 0) return null;

      const transaction = await tx.walletTransaction.findUnique({
        where: { id: transactionId },
      });
      if (!transaction) return null;

      const metadata = (transaction.metadata ?? {}) as Record<string, unknown>;

      if (transaction.type === LedgerType.WITHDRAWAL) {
        const skipReservationHandling =
          WalletService.withdrawMetadataSaysSkipRelease(metadata);

        if (wasDebited && !skipReservationHandling) {
          // Prior COMPLETED: the ledger was debited, so the correct reversal
          // is the refund credit (admin refund path). The reservation was
          // already released when the row completed.
          await this.ledger.createEntry(tx, {
            walletId: transaction.walletId,
            transactionId: transaction.id,
            amount: Math.abs(transaction.amount.toNumber()),
            type: LedgerType.TRADE_REFUND,
            reference: `${transaction.reference}-rev`,
            metadata: { reason },
          });
        } else if (
          !wasDebited &&
          (prior.status === 'PENDING' || prior.status === 'PROCESSING') &&
          !skipReservationHandling
        ) {
          // In-flight row (Paystack transfer.failed / transfer.reversed arrive
          // here): the ledger was never debited, so crediting would mint
          // balance. Release the held reservation instead.
          await this.releaseWithdrawalReservation(
            tx,
            transaction.walletId,
            transaction.amount.abs(),
          );
          await tx.$executeRaw`
            UPDATE "WalletTransaction"
            SET "metadata" = "metadata" || ${JSON.stringify({
              reservationReleasedAt: new Date().toISOString(),
              reservationReleasedVia: 'reverse-of-unsettled',
            })}::jsonb
            WHERE "id" = ${transactionId}::uuid
          `;
        }
        // Any other prior state (FAILED, CANCELLED) was already released by
        // updateTransactionStatus — releasing again could consume another
        // in-flight withdrawal's reservation, so it is intentionally skipped.

        return transaction;
      }

      // Reverse direction: deposits (positive amount) → debit
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
