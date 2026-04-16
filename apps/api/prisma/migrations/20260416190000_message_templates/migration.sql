-- CustomerAction kolonları: tablo phase4'te oluşturulur; şablon alanları orada tanımlanır (20260417120000).

-- AlterTable
ALTER TABLE "StoreMessagingSettings" ADD COLUMN     "allowFallbackChannel" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "quietHoursStart" TEXT,
ADD COLUMN     "quietHoursEnd" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "defaultContent" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMessageTemplateOverride" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "content" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantMessageTemplateOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_key_channel_key" ON "MessageTemplate"("key", "channel");

CREATE INDEX "MessageTemplate_key_idx" ON "MessageTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMessageTemplateOverride_tenantId_templateKey_channel_key" ON "TenantMessageTemplateOverride"("tenantId", "templateKey", "channel");

CREATE INDEX "TenantMessageTemplateOverride_tenantId_idx" ON "TenantMessageTemplateOverride"("tenantId");

-- AddForeignKey
ALTER TABLE "TenantMessageTemplateOverride" ADD CONSTRAINT "TenantMessageTemplateOverride_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
