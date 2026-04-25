-- AlterTable
ALTER TABLE "Visit" ALTER COLUMN "basePointsEarned" DROP DEFAULT,
ALTER COLUMN "bonusPointsEarned" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "TenantInvitation_tenantId_idx" ON "TenantInvitation"("tenantId");

-- CreateIndex
CREATE INDEX "TenantInvitation_email_idx" ON "TenantInvitation"("email");

-- CreateIndex
CREATE INDEX "TenantInvitation_status_idx" ON "TenantInvitation"("status");

-- CreateIndex
CREATE INDEX "TenantMembership_tenantId_idx" ON "TenantMembership"("tenantId");

-- CreateIndex
CREATE INDEX "TenantMembership_role_idx" ON "TenantMembership"("role");
