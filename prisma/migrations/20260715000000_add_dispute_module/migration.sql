-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'WAITING_FOR_USER', 'WAITING_FOR_ADMIN', 'RESOLVED', 'REJECTED', 'ESCALATED');

-- AlterTable: Dispute table enhancements
ALTER TABLE "Dispute" ADD COLUMN "description" TEXT;
ALTER TABLE "Dispute" ADD COLUMN "assigneeId" UUID;
ALTER TABLE "Dispute" ADD COLUMN "deadline" TIMESTAMP(3);

-- Migrate existing status string to enum
ALTER TABLE "Dispute" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Dispute" ALTER COLUMN "status" TYPE "DisputeStatus" USING ("status"::"DisputeStatus");
ALTER TABLE "Dispute" ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- Migrate existing evidence JSON to text column (evidence data moved to Evidence table)
ALTER TABLE "Dispute" DROP COLUMN "evidence";

-- CreateIndex: Dispute indexes
CREATE INDEX "Dispute_orderId_idx" ON "Dispute"("orderId");
CREATE INDEX "Dispute_initiatorId_idx" ON "Dispute"("initiatorId");
CREATE INDEX "Dispute_assigneeId_idx" ON "Dispute"("assigneeId");
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- AddForeignKey: Dispute.assigneeId -> User
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: Evidence
CREATE TABLE "Evidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "disputeId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Evidence indexes
CREATE INDEX "Evidence_disputeId_idx" ON "Evidence"("disputeId");

-- AddForeignKey: Evidence.disputeId -> Dispute
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Evidence.uploadedById -> User
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
