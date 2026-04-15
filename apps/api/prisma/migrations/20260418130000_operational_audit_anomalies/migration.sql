-- Operasyonel audit trail + hafif anomali bayrakları

CREATE TYPE "AuditActorType" AS ENUM ('cashier', 'manager', 'system');
CREATE TYPE "AuditEntityType" AS ENUM (
  'visit',
  'redemption',
  'customer',
  'cashier_shift',
  'device_session',
  'branch',
  'reward',
  'campaign',
  'other'
);

CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorType" "AuditActorType" NOT NULL,
    "branchId" TEXT,
    "deviceSessionId" TEXT,
    "cashierShiftId" TEXT,
    "eventType" TEXT NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnomalySignal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warn',
    "branchId" TEXT,
    "cashierShiftId" TEXT,
    "customerId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "sourceAuditEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnomalySignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditEvent_tenantId_createdAt_idx" ON "AuditEvent"("tenantId", "createdAt");
CREATE INDEX "AuditEvent_tenantId_eventType_createdAt_idx" ON "AuditEvent"("tenantId", "eventType", "createdAt");
CREATE INDEX "AuditEvent_cashierShiftId_idx" ON "AuditEvent"("cashierShiftId");
CREATE INDEX "AuditEvent_branchId_idx" ON "AuditEvent"("branchId");
CREATE INDEX "AuditEvent_deviceSessionId_idx" ON "AuditEvent"("deviceSessionId");

CREATE INDEX "AnomalySignal_tenantId_createdAt_idx" ON "AnomalySignal"("tenantId", "createdAt");
CREATE INDEX "AnomalySignal_tenantId_type_createdAt_idx" ON "AnomalySignal"("tenantId", "type", "createdAt");
CREATE INDEX "AnomalySignal_cashierShiftId_idx" ON "AnomalySignal"("cashierShiftId");
CREATE INDEX "AnomalySignal_branchId_idx" ON "AnomalySignal"("branchId");

ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_deviceSessionId_fkey" FOREIGN KEY ("deviceSessionId") REFERENCES "DeviceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_cashierShiftId_fkey" FOREIGN KEY ("cashierShiftId") REFERENCES "CashierShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AnomalySignal" ADD CONSTRAINT "AnomalySignal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnomalySignal" ADD CONSTRAINT "AnomalySignal_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnomalySignal" ADD CONSTRAINT "AnomalySignal_cashierShiftId_fkey" FOREIGN KEY ("cashierShiftId") REFERENCES "CashierShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnomalySignal" ADD CONSTRAINT "AnomalySignal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnomalySignal" ADD CONSTRAINT "AnomalySignal_sourceAuditEventId_fkey" FOREIGN KEY ("sourceAuditEventId") REFERENCES "AuditEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
