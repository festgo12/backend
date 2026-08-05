-- Phase 1/2: Trade settlement, fee wallets, reconciliation
-- 1. New LedgerType for reconciliation adjustments
ALTER TYPE "LedgerType" ADD VALUE 'RECONCILIATION_ADJUSTMENT';

-- 2. Mark internal/system users so they are excluded from user-facing queries
ALTER TABLE "User" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- 3. Platform settings store (stable xpub cache, fee wallet config, etc.)
CREATE TABLE "PlatformSetting" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");
CREATE INDEX "PlatformSetting_key_idx" ON "PlatformSetting"("key");

-- 4. Reconciliation run records
CREATE TABLE "Reconciliation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "currency" "Currency" NOT NULL,
    "internalBalance" DECIMAL(20, 8) NOT NULL DEFAULT 0,
    "onChainBalance" DECIMAL(20, 8) NOT NULL DEFAULT 0,
    "difference" DECIMAL(20, 8) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IN_BALANCE',
    "reference" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reconciliation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Reconciliation_currency_createdAt_idx" ON "Reconciliation"("currency", "createdAt");
CREATE UNIQUE INDEX "Reconciliation_reference_key" ON "Reconciliation"("reference");
