-- Phase 4 — Growth & automation (domain events + customer actions + customer state)

CREATE TYPE "LoyaltyDomainEventType" AS ENUM ('visit_created', 'reward_claimed', 'inactivity_detected');

CREATE TYPE "CustomerActionStatus" AS ENUM ('pending', 'sent', 'failed');

ALTER TABLE "Customer" ADD COLUMN "lastVisitAt" TIMESTAMP(3),
ADD COLUMN "visitCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastActiveAt" TIMESTAMP(3);

CREATE TABLE "LoyaltyDomainEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "LoyaltyDomainEventType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyDomainEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "CustomerActionStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoyaltyDomainEvent_tenantId_createdAt_idx" ON "LoyaltyDomainEvent"("tenantId", "createdAt");

CREATE INDEX "LoyaltyDomainEvent_tenantId_customerId_idx" ON "LoyaltyDomainEvent"("tenantId", "customerId");

CREATE INDEX "CustomerAction_tenantId_createdAt_idx" ON "CustomerAction"("tenantId", "createdAt");

CREATE INDEX "CustomerAction_tenantId_customerId_idx" ON "CustomerAction"("tenantId", "customerId");

CREATE INDEX "Customer_tenantId_lastVisitAt_idx" ON "Customer"("tenantId", "lastVisitAt");

ALTER TABLE "LoyaltyDomainEvent" ADD CONSTRAINT "LoyaltyDomainEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LoyaltyDomainEvent" ADD CONSTRAINT "LoyaltyDomainEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerAction" ADD CONSTRAINT "CustomerAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerAction" ADD CONSTRAINT "CustomerAction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "Customer" c
SET "visitCount" = v.cnt
FROM (
  SELECT "customerId", COUNT(*)::int AS cnt FROM "Visit" GROUP BY "customerId"
) v
WHERE c.id = v."customerId";

UPDATE "Customer" c
SET "lastVisitAt" = v.mx
FROM (
  SELECT "customerId", MAX("createdAt") AS mx FROM "Visit" GROUP BY "customerId"
) v
WHERE c.id = v."customerId";
