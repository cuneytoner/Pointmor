-- Multi-location / franchise: Branch genişletme, Visit.branchId, Campaign.branchId, UserBranchAccess

ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "address" JSONB;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "branchId" TEXT;

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "branchId" TEXT;

CREATE TABLE IF NOT EXISTS "UserBranchAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBranchAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserBranchAccess_userId_branchId_key" ON "UserBranchAccess"("userId", "branchId");
CREATE INDEX IF NOT EXISTS "UserBranchAccess_userId_idx" ON "UserBranchAccess"("userId");
CREATE INDEX IF NOT EXISTS "UserBranchAccess_branchId_idx" ON "UserBranchAccess"("branchId");

ALTER TABLE "UserBranchAccess" DROP CONSTRAINT IF EXISTS "UserBranchAccess_userId_fkey";
ALTER TABLE "UserBranchAccess" ADD CONSTRAINT "UserBranchAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserBranchAccess" DROP CONSTRAINT IF EXISTS "UserBranchAccess_branchId_fkey";
ALTER TABLE "UserBranchAccess" ADD CONSTRAINT "UserBranchAccess_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Visit" DROP CONSTRAINT IF EXISTS "Visit_branchId_fkey";
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Campaign" DROP CONSTRAINT IF EXISTS "Campaign_branchId_fkey";
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Visit_tenantId_branchId_idx" ON "Visit"("tenantId", "branchId");
CREATE INDEX IF NOT EXISTS "Campaign_tenantId_branchId_idx" ON "Campaign"("tenantId", "branchId");

-- Mevcut ziyaretler: cihaz oturumundan şube
UPDATE "Visit" v
SET "branchId" = ds."branchId"
FROM "DeviceSession" ds
WHERE v."deviceSessionId" = ds."id"
  AND v."branchId" IS NULL
  AND ds."branchId" IS NOT NULL;
