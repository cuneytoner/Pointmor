-- CreateEnum
CREATE TYPE "NotificationDeliveryFinalOutcome" AS ENUM ('succeeded', 'failed');

-- CreateEnum
CREATE TYPE "NotificationFailureCategory" AS ENUM ('none', 'validation', 'opt_in', 'quiet_hours', 'provider_transient', 'provider_permanent', 'configuration', 'rate_limited', 'unknown');

-- AlterTable
ALTER TABLE "NotificationDelivery" ADD COLUMN     "attemptNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "fallbackFromId" TEXT,
ADD COLUMN     "retryOfId" TEXT,
ADD COLUMN     "finalOutcome" "NotificationDeliveryFinalOutcome",
ADD COLUMN     "failureCategory" "NotificationFailureCategory" NOT NULL DEFAULT 'none';

-- Backfill terminal outcome (mevcut satırlar tek başına tamamlanmış kabul)
UPDATE "NotificationDelivery"
SET "finalOutcome" = CASE
  WHEN "status" = 'sent' THEN 'succeeded'::"NotificationDeliveryFinalOutcome"
  WHEN "status" = 'failed' THEN 'failed'::"NotificationDeliveryFinalOutcome"
  ELSE NULL
END
WHERE "finalOutcome" IS NULL;

-- CreateIndex
CREATE INDEX "NotificationDelivery_fallbackFromId_idx" ON "NotificationDelivery"("fallbackFromId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_retryOfId_idx" ON "NotificationDelivery"("retryOfId");

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_fallbackFromId_fkey" FOREIGN KEY ("fallbackFromId") REFERENCES "NotificationDelivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_retryOfId_fkey" FOREIGN KEY ("retryOfId") REFERENCES "NotificationDelivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;
