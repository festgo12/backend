-- AlterTable: Extend SecurityLog with audit fields
ALTER TABLE "SecurityLog" ADD COLUMN "actorId" UUID;
ALTER TABLE "SecurityLog" ADD COLUMN "resource" TEXT;
ALTER TABLE "SecurityLog" ADD COLUMN "resourceId" TEXT;
ALTER TABLE "SecurityLog" ADD COLUMN "oldValue" JSONB;
ALTER TABLE "SecurityLog" ADD COLUMN "newValue" JSONB;
ALTER TABLE "SecurityLog" ADD COLUMN "device" TEXT;
ALTER TABLE "SecurityLog" ADD COLUMN "success" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SecurityLog" ADD COLUMN "errorMessage" TEXT;

-- CreateIndex: Composite index for action+time queries
CREATE INDEX "SecurityLog_action_createdAt_idx" ON "SecurityLog"("action", "createdAt");

-- CreateIndex: Composite index for resource lookups
CREATE INDEX "SecurityLog_resource_resourceId_idx" ON "SecurityLog"("resource", "resourceId");
