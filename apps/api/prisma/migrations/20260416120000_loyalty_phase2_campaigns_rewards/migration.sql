-- Loyalty Phase 2: reward typing, campaigns, visit campaign applications, ledger campaign source

-- Reward catalog enums
CREATE TYPE "RewardType" AS ENUM ('FREE_ITEM', 'FIXED_DISCOUNT', 'PERCENT_DISCOUNT');
CREATE TYPE "RewardValueType" AS ENUM ('NONE', 'MINOR_AMOUNT', 'PERCENT_BP');
CREATE TYPE "RedemptionMethod" AS ENUM ('POINTS_ONLY');

ALTER TABLE "Reward" ADD COLUMN "rewardType" "RewardType" NOT NULL DEFAULT 'FREE_ITEM';
ALTER TABLE "Reward" ADD COLUMN "valueType" "RewardValueType" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Reward" ADD COLUMN "value" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Reward" ADD COLUMN "redemptionMethod" "RedemptionMethod" NOT NULL DEFAULT 'POINTS_ONLY';

-- Visit: split base vs bonus (pointsEarned = base + bonus)
ALTER TABLE "Visit" ADD COLUMN "basePointsEarned" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Visit" ADD COLUMN "bonusPointsEarned" INTEGER NOT NULL DEFAULT 0;
UPDATE "Visit" SET "basePointsEarned" = "pointsEarned";

-- Ledger: optional visit link for campaign bonus rows
ALTER TYPE "PointsLedgerSource" ADD VALUE 'campaign';

ALTER TABLE "PointsLedger" ADD COLUMN "visitId" TEXT;
CREATE INDEX "PointsLedger_visitId_idx" ON "PointsLedger"("visitId");
ALTER TABLE "PointsLedger" ADD CONSTRAINT "PointsLedger_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Campaign
CREATE TYPE "CampaignType" AS ENUM ('BONUS_POINTS', 'SPEND_THRESHOLD_BONUS', 'FIRST_VISIT_BONUS');
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'active', 'paused', 'archived');

CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CampaignType" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Campaign_tenantId_idx" ON "Campaign"("tenantId");
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "VisitCampaignApplication" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitCampaignApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VisitCampaignApplication_visitId_campaignId_key" ON "VisitCampaignApplication"("visitId", "campaignId");
CREATE INDEX "VisitCampaignApplication_tenantId_idx" ON "VisitCampaignApplication"("tenantId");
CREATE INDEX "VisitCampaignApplication_campaignId_idx" ON "VisitCampaignApplication"("campaignId");

ALTER TABLE "VisitCampaignApplication" ADD CONSTRAINT "VisitCampaignApplication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitCampaignApplication" ADD CONSTRAINT "VisitCampaignApplication_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisitCampaignApplication" ADD CONSTRAINT "VisitCampaignApplication_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
