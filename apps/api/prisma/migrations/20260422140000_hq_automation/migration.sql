-- CreateTable
CREATE TABLE "TenantAutomationSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'approval_required',
    "maxActionsPerDay" INTEGER NOT NULL DEFAULT 5,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 360,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantAutomationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HqAutomationAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "triggerType" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "hqInsightId" TEXT,
    "result" JSONB,
    "errorMessage" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "executedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'rule_engine',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HqAutomationAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantAutomationSettings_tenantId_key" ON "TenantAutomationSettings"("tenantId");

-- CreateIndex
CREATE INDEX "HqAutomationAction_tenantId_status_createdAt_idx" ON "HqAutomationAction"("tenantId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "HqAutomationAction_tenantId_createdAt_idx" ON "HqAutomationAction"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "HqAutomationAction_tenantId_idempotencyKey_key" ON "HqAutomationAction"("tenantId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "TenantAutomationSettings" ADD CONSTRAINT "TenantAutomationSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqAutomationAction" ADD CONSTRAINT "HqAutomationAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HqAutomationAction" ADD CONSTRAINT "HqAutomationAction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
