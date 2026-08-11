-- Multiple wallets may share one on-chain address (EVM unifies ETH/USDT/USDC
-- onto a single address; platform fee wallets share the master address).
-- Drop the uniqueness constraint on Wallet.address and index it for lookups.
-- AlterTable
DROP INDEX IF EXISTS "Wallet_address_key";

-- CreateIndex
CREATE INDEX "Wallet_address_idx" ON "Wallet"("address");
