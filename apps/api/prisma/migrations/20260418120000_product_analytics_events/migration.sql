-- Phase 4.5 — ürün davranış analitiği (funnel / retention)

CREATE TYPE "ProductAnalyticsEventType" AS ENUM (
  'qr_opened',
  'customer_viewed_home',
  'visit_recorded',
  'points_awarded',
  'reward_viewed',
  'reward_claimed',
  'redemption_completed'
);

CREATE TABLE "ProductAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "type" "ProductAnalyticsEventType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductAnalyticsEvent_tenantId_type_createdAt_idx" ON "ProductAnalyticsEvent"("tenantId", "type", "createdAt");

CREATE INDEX "ProductAnalyticsEvent_tenantId_customerId_createdAt_idx" ON "ProductAnalyticsEvent"("tenantId", "customerId", "createdAt");

ALTER TABLE "ProductAnalyticsEvent" ADD CONSTRAINT "ProductAnalyticsEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductAnalyticsEvent" ADD CONSTRAINT "ProductAnalyticsEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
