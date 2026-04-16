-- CreateEnum
CREATE TYPE "ContactPreferredChannel" AS ENUM ('sms', 'whatsapp', 'none');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('sms', 'whatsapp');

-- CreateEnum
CREATE TYPE "NotificationProviderId" AS ENUM ('twilio');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('queued', 'sent', 'delivered', 'failed');

-- CreateEnum
CREATE TYPE "StoreMessagingDefaultChannel" AS ENUM ('sms', 'whatsapp');

-- CreateTable
CREATE TABLE "CustomerContactPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "smsOptIn" BOOLEAN NOT NULL DEFAULT false,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "preferredChannel" "ContactPreferredChannel" NOT NULL DEFAULT 'none',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContactPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerActionId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "provider" "NotificationProviderId" NOT NULL DEFAULT 'twilio',
    "providerMessageId" TEXT,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'queued',
    "errorCode" TEXT,
    "payloadSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreMessagingSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultChannel" "StoreMessagingDefaultChannel" NOT NULL DEFAULT 'sms',
    "twilioVerifyServiceSid" TEXT,
    "twilioMessagingServiceSid" TEXT,
    "whatsappSender" TEXT,
    "fromNumber" TEXT,
    "requireVerifiedForSession" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreMessagingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerContactPreference_customerId_key" ON "CustomerContactPreference"("customerId");

-- CreateIndex
CREATE INDEX "CustomerContactPreference_tenantId_idx" ON "CustomerContactPreference"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerContactPreference_tenantId_phone_idx" ON "CustomerContactPreference"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "NotificationDelivery_tenantId_createdAt_idx" ON "NotificationDelivery"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_tenantId_customerId_idx" ON "NotificationDelivery"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_customerActionId_idx" ON "NotificationDelivery"("customerActionId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreMessagingSettings_tenantId_key" ON "StoreMessagingSettings"("tenantId");

-- AddForeignKey
ALTER TABLE "CustomerContactPreference" ADD CONSTRAINT "CustomerContactPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContactPreference" ADD CONSTRAINT "CustomerContactPreference_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK → CustomerAction: tablo phase4 migrasyonunda oluşturulduğu için orada eklenir (20260417120000).

-- AddForeignKey
ALTER TABLE "StoreMessagingSettings" ADD CONSTRAINT "StoreMessagingSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
