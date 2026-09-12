/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Decimal } from '@src/generated/client/runtime/library';
import { WalletService } from './wallet.service';
import { LedgerService } from './ledger.service';
import { ExchangeRateService } from '../crypto/exchange-rate.service';
import { PrismaService } from '../../core/database/prisma.service';
import { Currency, LedgerType } from '@src/generated/client';

/**
 * Joins the SQL string parts of a Prisma tagged-template $executeRaw call so
 * assertions can match on the statement text. The first argument of a tagged
 * template call is the array of literal string parts.
 */
const sqlText = (call: unknown[]): string =>
  (call[0] as string[]).join('?');

/** True when any $executeRaw call touched the reservation column. */
const reservedTouched = (calls: unknown[][]): boolean =>
  calls.some((c) => sqlText(c).includes('reservedBalance'));

describe('WalletService — withdrawal reservation release', () => {
  let service: WalletService;

  const mockPrisma = {
    wallet: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    ledgerEntry: { findFirst: jest.fn() },
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  const mockLedger = { createEntry: jest.fn() };
  const mockRates = { getAllRates: jest.fn().mockReturnValue({}) };
  const mockEventEmitter = { emit: jest.fn() };

  const makeTx = (overrides: Record<string, unknown> = {}) => ({
    id: 'tx-1',
    walletId: 'w-1',
    type: LedgerType.WITHDRAWAL,
    status: 'PENDING',
    amount: new Decimal('100'),
    fee: new Decimal('0'),
    reference: 'ref-1',
    metadata: {},
    resolvedAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    jest.resetAllMocks();

    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
    );
    // 1 affected row for every raw UPDATE
    mockPrisma.$executeRaw.mockResolvedValue(1);
    mockPrisma.walletTransaction.update.mockImplementation(
      async (args: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...makeTx(), ...args.data }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LedgerService, useValue: mockLedger },
        { provide: ExchangeRateService, useValue: mockRates },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  describe('updateTransactionStatus', () => {
    it('releases the reservation when a withdrawal transitions to FAILED', async () => {
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(makeTx());

      const result = await service.updateTransactionStatus('tx-1', 'FAILED');

      expect(result.status).toBe('FAILED');
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(sqlText(mockPrisma.$executeRaw.mock.calls[0])).toContain(
        'reservedBalance',
      );
      expect(mockPrisma.walletTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
            metadata: expect.objectContaining({
              reservationReleasedAt: expect.any(String),
            }),
          }),
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'wallet.withdrawal.failed',
        expect.anything(),
      );
    });

    it('debits abs(amount) and releases when a legacy negative-amount withdrawal completes', async () => {
      // Legacy fiat rows stored the withdrawal amount negative.
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(
        makeTx({ amount: new Decimal('-100') }),
      );
      mockPrisma.ledgerEntry.findFirst.mockResolvedValue(null);

      await service.updateTransactionStatus('tx-1', 'COMPLETED');

      // The ledger debit must be -100 (not +100, which would mint balance).
      expect(mockLedger.createEntry).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          amount: -100,
          type: LedgerType.WITHDRAWAL,
        }),
      );
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(sqlText(mockPrisma.$executeRaw.mock.calls[0])).toContain(
        'reservedBalance',
      );
    });

    it('debits and releases for positive-amount withdrawals (current convention)', async () => {
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(makeTx());
      mockPrisma.ledgerEntry.findFirst.mockResolvedValue(null);

      await service.updateTransactionStatus('tx-1', 'COMPLETED');

      expect(mockLedger.createEntry).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({ amount: -100 }),
      );
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('does not release for fee-wallet sweeps (metadata.sweep)', async () => {
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(
        makeTx({ metadata: { sweep: true, feeWallet: true } }),
      );

      await service.updateTransactionStatus('tx-1', 'FAILED');

      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
      expect(mockPrisma.walletTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.not.objectContaining({
              reservationReleasedAt: expect.anything(),
            }),
          }),
        }),
      );
    });

    it('does not release or create ledger entries for ledgerSettled withdrawals', async () => {
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(
        makeTx({ metadata: { ledgerSettled: true } }),
      );

      await service.updateTransactionStatus('tx-1', 'COMPLETED');

      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
      expect(mockLedger.createEntry).not.toHaveBeenCalled();
    });

    it('never touches reservations for non-withdrawal types', async () => {
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(
        makeTx({ type: LedgerType.DEPOSIT }),
      );

      await service.updateTransactionStatus('tx-1', 'FAILED');

      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('rejects invalid status transitions', async () => {
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(
        makeTx({ status: 'CANCELLED' }),
      );

      await expect(
        service.updateTransactionStatus('tx-1', 'FAILED'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
    });

    it('throws when the transaction does not exist', async () => {
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTransactionStatus('tx-1', 'FAILED'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reverseTransaction', () => {
    it('releases the reservation WITHOUT crediting an unsettled withdrawal (Paystack failure webhooks)', async () => {
      // Prior read: still PROCESSING → ledger never debited.
      mockPrisma.walletTransaction.findUnique
        .mockResolvedValueOnce(makeTx({ status: 'PROCESSING' }))
        .mockResolvedValueOnce(makeTx({ status: 'REVERSED' }));

      await service.reverseTransaction('tx-1', 'Transfer failed');

      expect(mockLedger.createEntry).not.toHaveBeenCalled();
      // 1) conditional REVERSED status update, 2) reservation release,
      // 3) release audit stamp.
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(3);
      expect(sqlText(mockPrisma.$executeRaw.mock.calls[1])).toContain(
        'reservedBalance',
      );
      expect(
        sqlText(mockPrisma.$executeRaw.mock.calls[2]),
      ).toContain('UPDATE "WalletTransaction"');
      // The via-stamp value is a bound JSON parameter on the stamp statement.
      expect(JSON.stringify(mockPrisma.$executeRaw.mock.calls[2].slice(1))).toContain(
        'reverse-of-unsettled',
      );
    });

    it('credits a refund (and does not release) when reversing a completed withdrawal', async () => {
      mockPrisma.walletTransaction.findUnique
        .mockResolvedValueOnce(makeTx({ status: 'COMPLETED' }))
        .mockResolvedValueOnce(makeTx({ status: 'REVERSED' }));

      await service.reverseTransaction('tx-1', 'Admin refund');

      expect(mockLedger.createEntry).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          amount: 100,
          type: LedgerType.TRADE_REFUND,
          reference: 'ref-1-rev',
        }),
      );
      // Only the conditional status update — never a reservation touch.
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(reservedTouched(mockPrisma.$executeRaw.mock.calls)).toBe(false);
    });

    it('neither credits nor releases when reversing an already-FAILED withdrawal', async () => {
      mockPrisma.walletTransaction.findUnique
        .mockResolvedValueOnce(makeTx({ status: 'FAILED' }))
        .mockResolvedValueOnce(makeTx({ status: 'REVERSED' }));

      await service.reverseTransaction('tx-1', 'Transfer reversed');

      expect(mockLedger.createEntry).not.toHaveBeenCalled();
      // Only the conditional status update — the reservation was already
      // released when the row reached FAILED; re-releasing could consume
      // another in-flight withdrawal's reservation.
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(reservedTouched(mockPrisma.$executeRaw.mock.calls)).toBe(false);
    });

    it('skips reservation handling for sweep rows even when unsettled', async () => {
      mockPrisma.walletTransaction.findUnique
        .mockResolvedValueOnce(
          makeTx({ status: 'PROCESSING', metadata: { sweep: true } }),
        )
        .mockResolvedValueOnce(
          makeTx({ status: 'REVERSED', metadata: { sweep: true } }),
        );

      await service.reverseTransaction('tx-1', 'Transfer failed');

      expect(reservedTouched(mockPrisma.$executeRaw.mock.calls)).toBe(false);
      expect(mockLedger.createEntry).not.toHaveBeenCalled();
    });

    it('no-ops when the row is already REVERSED (double-webhook race)', async () => {
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(
        makeTx({ status: 'PROCESSING' }),
      );
      // Conditional UPDATE matches nothing
      mockPrisma.$executeRaw.mockResolvedValue(0);

      await service.reverseTransaction('tx-1', 'Transfer failed');

      // Only the prior read; the re-read must not happen.
      expect(mockPrisma.walletTransaction.findUnique).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(mockLedger.createEntry).not.toHaveBeenCalled();
    });

    it('debits deposits when reversing (original semantics preserved)', async () => {
      mockPrisma.walletTransaction.findUnique
        .mockResolvedValueOnce(
          makeTx({ type: LedgerType.DEPOSIT, status: 'COMPLETED' }),
        )
        .mockResolvedValueOnce(
          makeTx({ type: LedgerType.DEPOSIT, status: 'REVERSED' }),
        );

      await service.reverseTransaction('tx-1', 'Admin refund');

      expect(mockLedger.createEntry).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          amount: -100,
          type: LedgerType.TRADE_REFUND,
        }),
      );
    });
  });
});
