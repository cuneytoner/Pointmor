-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('pending', 'completed', 'rejected');

-- AlterTable
ALTER TABLE "Redemption" ADD COLUMN "status" "RedemptionStatus" NOT NULL DEFAULT 'completed';

CREATE INDEX "Redemption_tenantId_status_idx" ON "Redemption"("tenantId", "status");
