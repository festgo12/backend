"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../src/generated/client/index.js");
const client_2 = require("../src/generated/client/index.js");
const prisma = new client_1.PrismaClient();
const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'REVERSED', 'CANCELLED'];
const RELEASED_VIA = 'backfill-script';
async function main() {
    const apply = process.argv.includes('--apply');
    const candidates = await prisma.walletTransaction.findMany({
        where: {
            type: client_2.LedgerType.WITHDRAWAL,
            status: { in: TERMINAL_STATUSES },
            metadata: {
                path: ['reservationReleasedAt'],
                equals: client_2.Prisma.AnyNull,
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
    const rows = candidates.filter((tx) => {
        const meta = (tx.metadata ?? {});
        return !meta.sweep && !meta.ledgerSettled;
    });
    if (rows.length === 0) {
        console.log('No stuck withdrawal reservations found. Nothing to do.');
        return;
    }
    console.log(`Found ${rows.length} withdrawal transaction(s) with potentially stuck reservations:\n`);
    let totalRelease = new client_2.Prisma.Decimal(0);
    for (const tx of rows) {
        const meta = (tx.metadata ?? {});
        const amount = tx.amount.abs();
        if (meta.reservationReleasedAt)
            continue;
        const currentReserved = tx.wallet.reservedBalance;
        const newReserved = client_2.Prisma.Decimal.max(currentReserved.minus(amount), 0);
        const clamped = !newReserved.eq(currentReserved.minus(amount));
        if (apply) {
            await prisma.$transaction([
                prisma.$executeRaw `
          UPDATE "Wallet"
          SET "reservedBalance" = GREATEST("reservedBalance" - ${amount}, 0)
          WHERE "id" = ${tx.walletId}::uuid
        `,
                prisma.$executeRaw `
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
        console.log([
            `tx ${tx.id}`,
            `ref ${tx.reference}`,
            `status ${tx.status}`,
            `${tx.wallet.currency}`,
            `amount ${amount}`,
            `reserved ${currentReserved} -> ${newReserved}${clamped ? ' (clamped)' : ''}`,
        ].join(' | '));
    }
    console.log(`\nTotal to release: ${totalRelease}`);
    console.log(apply
        ? 'APPLIED: reservations released and rows stamped.'
        : 'DRY RUN: no changes written. Re-run with --apply to execute.');
}
main()
    .catch((err) => {
    console.error('Backfill failed:', err);
    process.exitCode = 1;
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=release-stuck-withdrawal-reservations.js.map