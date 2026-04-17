-- CreateTable
CREATE TABLE "HqInsight" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "actionKind" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "dedupeKey" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HqInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HqInsight_tenantId_dismissedAt_createdAt_idx" ON "HqInsight"("tenantId", "dismissedAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "HqInsight_tenantId_createdAt_idx" ON "HqInsight"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "HqInsight_tenantId_dedupeKey_key" ON "HqInsight"("tenantId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "HqInsight" ADD CONSTRAINT "HqInsight_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqInsight" ADD CONSTRAINT "HqInsight_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
