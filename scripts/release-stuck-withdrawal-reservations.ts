/**
 * One-off remediation script: releases stuck withdrawal reservations.
 *
 * Background (audit finding): withdrawals reserve funds via
 *   UPDATE "Wallet" SET "reservedBalance" = "reservedBalance" + amount ...
 * but terminal states (FAILED, COMPLETED, REVERSED) never released them, so
 * user funds stayed frozen off-chain even after the ledger settled.
 *
 * This script finds WITHDRAWAL transactions that reached a terminal status
 * without stamping metadata.reservationReleasedAt (i.e. processed before the
 * fix) and releases the reservation on the owning wallet — clamped at zero —
 * then stamps the row for idempotency.
 *
 * Usage:
 *   DRY RUN (default, writes nothing):
 *     npx ts-node -r tsconfig-paths/register scripts/release-stuck-withdrawal-reservations.ts
 *   APPLY:
 *     npx ts-node -r tsconfig-paths/register scripts/release-stuck-withdrawal-reservations.ts --apply
 *
 * Rows never reserved funds (fee-wallet sweeps, ledgerSettled) are excluded,
 * matching the runtime release logic.
 */
import { PrismaClient } from '@src/generated/client';
import { LedgerType, Prisma } from '@src/generated/client';

const prisma = new PrismaClient();

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'REVERSED', 'CANCELLED'];
const RELEASED_VIA = 'backfill-script';

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');

  const candidates = await prisma.walletTransaction.findMany({
    where: {
      type: LedgerType.WITHDRAWAL,
      status: { in: TERMINAL_STATUSES },
      metadata: {
        path: ['reservationReleasedAt'],
        equals: Prisma.AnyNull,
      },
    },
    select: {
      id: true,
      walletId: true,
      amount: true,
      status: true,
      reference: true,
      metadata: true,
      wallet: { select: { id: true, reservedBalance: true, currency: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Skip rows that never reserved (sweeps, externally settled) — same rule as
  // the runtime release logic.
  const rows = candidates.filter((tx) => {
    const meta = (tx.metadata ?? {}) as Record<string, unknown>;
    return !meta.sweep && !meta.ledgerSettled;
  });

  if (rows.length === 0) {
    console.log('No stuck withdrawal reservations found. Nothing to do.');
    return;
  }

  console.log(
    `Found ${rows.length} withdrawal transaction(s) with potentially stuck reservations:\n`,
  );

  let totalRelease = new Prisma.Decimal(0);

  for (const tx of rows) {
    const meta = (tx.metadata ?? {}) as Record<string, unknown>;
    const amount = tx.amount.abs();

    // Rows whose ledger was settled externally never held a reservation
    // either, but were excluded above; rows whose reservation was already
    // stamped are excluded by the query.
    if (meta.reservationReleasedAt) continue;

    const currentReserved = tx.wallet.reservedBalance;
    const newReserved = Prisma.Decimal.max(currentReserved.minus(amount), 0);
    const clamped = !newReserved.eq(currentReserved.minus(amount));

    if (apply) {
      await prisma.$transaction([
        prisma.$executeRaw`
          UPDATE "Wallet"
          SET "reservedBalance" = GREATEST("reservedBalance" - ${amount}, 0)
          WHERE "id" = ${tx.walletId}::uuid
        `,
        prisma.$executeRaw`
          UPDATE "WalletTransaction"
          SET "metadata" = "metadata" || ${JSON.stringify({
            reservationReleasedAt: new Date().toISOString(),
            reservationReleasedVia: RELEASED_VIA,
          })}::jsonb
          WHERE "id" = ${tx.id}::uuid
        `,
      ]);
    }

    totalRelease = totalRelease.plus(newReserved);

    console.log(
      [
        `tx ${tx.id}`,
        `ref ${tx.reference}`,
        `status ${tx.status}`,
        `${tx.wallet.currency}`,
        `amount ${amount}`,
        `reserved ${currentReserved} -> ${newReserved}${clamped ? ' (clamped)' : ''}`,
      ].join(' | '),
    );
  }

  console.log(`\nTotal to release: ${totalRelease}`);
  console.log(
    apply
      ? 'APPLIED: reservations released and rows stamped.'
      : 'DRY RUN: no changes written. Re-run with --apply to execute.',
  );
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
