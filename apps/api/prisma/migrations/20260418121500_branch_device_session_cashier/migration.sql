-- Şube + cihaz oturumu + kasiyer vardiyası (audit/anomali migration'ından önce oluşturulmalı)
-- Visit / Redemption üzerindeki opsiyonel kasiyer bağlamı kolonları

CREATE TYPE "DeviceSessionStatus" AS ENUM ('open', 'closed');
CREATE TYPE "CashierShiftStatus" AS ENUM ('open', 'closed');

CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeviceSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "deviceLabel" TEXT NOT NULL,
    "status" "DeviceSessionStatus" NOT NULL DEFAULT 'open',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,

    CONSTRAINT "DeviceSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CashierShift" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceSessionId" TEXT NOT NULL,
    "status" "CashierShiftStatus" NOT NULL DEFAULT 'open',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CashierShift_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Branch_tenantId_name_key" ON "Branch"("tenantId", "name");
CREATE INDEX "Branch_tenantId_idx" ON "Branch"("tenantId");

CREATE INDEX "DeviceSession_tenantId_status_idx" ON "DeviceSession"("tenantId", "status");
CREATE INDEX "DeviceSession_branchId_idx" ON "DeviceSession"("branchId");

CREATE INDEX "CashierShift_tenantId_status_idx" ON "CashierShift"("tenantId", "status");
CREATE INDEX "CashierShift_tenantId_userId_status_idx" ON "CashierShift"("tenantId", "userId", "status");
CREATE INDEX "CashierShift_deviceSessionId_status_idx" ON "CashierShift"("deviceSessionId", "status");

ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CashierShift" ADD CONSTRAINT "CashierShift_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashierShift" ADD CONSTRAINT "CashierShift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashierShift" ADD CONSTRAINT "CashierShift_deviceSessionId_fkey" FOREIGN KEY ("deviceSessionId") REFERENCES "DeviceSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 20260417190000_multi_location_franchise migration'ından taşınan Branch bağlı genişletmeler
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "address" JSONB;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "branchId" TEXT;

ALTER TABLE "UserBranchAccess" DROP CONSTRAINT IF EXISTS "UserBranchAccess_branchId_fkey";
ALTER TABLE "UserBranchAccess" ADD CONSTRAINT "UserBranchAccess_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Visit" DROP CONSTRAINT IF EXISTS "Visit_branchId_fkey";
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Campaign" DROP CONSTRAINT IF EXISTS "Campaign_branchId_fkey";
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Visit_tenantId_branchId_idx" ON "Visit"("tenantId", "branchId");
CREATE INDEX IF NOT EXISTS "Campaign_tenantId_branchId_idx" ON "Campaign"("tenantId", "branchId");

ALTER TABLE "Visit" ADD COLUMN "deviceSessionId" TEXT;
ALTER TABLE "Visit" ADD COLUMN "cashierShiftId" TEXT;

ALTER TABLE "Redemption" ADD COLUMN "deviceSessionId" TEXT;
ALTER TABLE "Redemption" ADD COLUMN "cashierShiftId" TEXT;

UPDATE "Visit" v
SET "branchId" = ds."branchId"
FROM "DeviceSession" ds
WHERE v."deviceSessionId" = ds."id"
  AND v."branchId" IS NULL
  AND ds."branchId" IS NOT NULL;

CREATE INDEX "Visit_cashierShiftId_idx" ON "Visit"("cashierShiftId");
CREATE INDEX "Visit_deviceSessionId_idx" ON "Visit"("deviceSessionId");
CREATE INDEX "Redemption_cashierShiftId_idx" ON "Redemption"("cashierShiftId");
CREATE INDEX "Redemption_deviceSessionId_idx" ON "Redemption"("deviceSessionId");

ALTER TABLE "Visit" ADD CONSTRAINT "Visit_deviceSessionId_fkey" FOREIGN KEY ("deviceSessionId") REFERENCES "DeviceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_cashierShiftId_fkey" FOREIGN KEY ("cashierShiftId") REFERENCES "CashierShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_deviceSessionId_fkey" FOREIGN KEY ("deviceSessionId") REFERENCES "DeviceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_cashierShiftId_fkey" FOREIGN KEY ("cashierShiftId") REFERENCES "CashierShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
