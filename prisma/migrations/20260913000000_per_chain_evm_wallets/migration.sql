-- Per-chain EVM wallet rows: ETH / BSC / POLYGON become independent ledger rows.
--
-- Legacy model: one shared row per (user, currency) with chain = 'EVM' holding
-- a single 0x address and one combined ledger balance across all EVM networks.
--
-- New model: distinct rows per EVM chain. The legacy 'EVM' row becomes the
-- canonical ETH row and carries the full legacy balance (decision: "all to
-- ETH"). BSC/POLYGON rows start at 0 and are created lazily by the app.
--
-- Where a user already has BOTH an 'EVM' and an 'ETH' row for a currency, the
-- rows are merged first: all referencing rows (ledger entries, wallet
-- transactions, balance snapshots, withdrawal jobs) are re-pointed to the ETH
-- row and the two balances/reserved amounts are summed, so the unique
-- constraint on (userId, currency, chain) is not violated when 'EVM' rows
-- become 'ETH'.

-- ─── 1. Merge duplicate (EVM, ETH) pairs ─────────────────────────────────

-- 1a. Re-point referencing tables from the 'EVM' row to the surviving 'ETH'
--     row for every (userId, currency) that has both.
UPDATE "LedgerEntry" le
SET "walletId" = eth."id"
FROM "Wallet" evm
JOIN "Wallet" eth
  ON eth."userId" = evm."userId"
 AND eth."currency" = evm."currency"
 AND eth."chain" = 'ETH'
WHERE le."walletId" = evm."id"
  AND evm."chain" = 'EVM';

UPDATE "WalletTransaction" wt
SET "walletId" = eth."id"
FROM "Wallet" evm
JOIN "Wallet" eth
  ON eth."userId" = evm."userId"
 AND eth."currency" = evm."currency"
 AND eth."chain" = 'ETH'
WHERE wt."walletId" = evm."id"
  AND evm."chain" = 'EVM';

UPDATE "BalanceSnapshot" bs
SET "walletId" = eth."id"
FROM "Wallet" evm
JOIN "Wallet" eth
  ON eth."userId" = evm."userId"
 AND eth."currency" = evm."currency"
 AND eth."chain" = 'ETH'
WHERE bs."walletId" = evm."id"
  AND evm."chain" = 'EVM';

UPDATE "WithdrawalJob" wj
SET "walletId" = eth."id"
FROM "Wallet" evm
JOIN "Wallet" eth
  ON eth."userId" = evm."userId"
 AND eth."currency" = evm."currency"
 AND eth."chain" = 'ETH'
WHERE wj."walletId" = evm."id"
  AND evm."chain" = 'EVM';

-- 1b. Fold the 'EVM' row's balances into the 'ETH' row, then delete it.
UPDATE "Wallet" eth
SET "balance" = eth."balance" + evm."balance",
    "reservedBalance" = eth."reservedBalance" + evm."reservedBalance"
FROM "Wallet" evm
JOIN "Wallet" survivor
  ON survivor."userId" = evm."userId"
 AND survivor."currency" = evm."currency"
 AND survivor."chain" = 'ETH'
WHERE evm."chain" = 'EVM'
  AND eth."id" = survivor."id";

DELETE FROM "Wallet" evm
USING "Wallet" eth
WHERE evm."chain" = 'EVM'
  AND eth."userId" = evm."userId"
  AND eth."currency" = evm."currency"
  AND eth."chain" = 'ETH';

-- ─── 2. Promote remaining 'EVM' rows to 'ETH' ────────────────────────────
-- Every remaining legacy row becomes the user's ETH row with its full legacy
-- balance. Address/derivationIndex stay: the 0x address is valid on all EVM
-- networks (same key family), so existing deposit addresses remain usable.

UPDATE "Wallet"
SET "chain" = 'ETH'
WHERE "chain" = 'EVM';
