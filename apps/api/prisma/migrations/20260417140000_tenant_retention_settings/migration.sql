-- CreateTable
CREATE TABLE "TenantRetentionSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "operationalAuditDays" INTEGER NOT NULL,
    "exportAuditDays" INTEGER NOT NULL,
    "messagingDays" INTEGER NOT NULL,
    "anomalyDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantRetentionSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantRetentionSettings_tenantId_key" ON "TenantRetentionSettings"("tenantId");

ALTER TABLE "TenantRetentionSettings" ADD CONSTRAINT "TenantRetentionSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
