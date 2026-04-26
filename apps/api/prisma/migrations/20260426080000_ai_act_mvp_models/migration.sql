-- CreateEnum
CREATE TYPE "AiRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'UNACCEPTABLE');

-- CreateTable
CREATE TABLE "AiSystem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAssessment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "questionnaire" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "aiAssessmentId" TEXT,
    "title" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'upload',
    "extractedText" TEXT,
    "embeddingRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRiskResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aiAssessmentId" TEXT NOT NULL,
    "riskLevel" "AiRiskLevel" NOT NULL,
    "score" INTEGER NOT NULL,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiRiskResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiSystem_id_tenantId_key" ON "AiSystem"("id", "tenantId");
CREATE INDEX "AiSystem_tenantId_createdAt_idx" ON "AiSystem"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiAssessment_id_tenantId_key" ON "AiAssessment"("id", "tenantId");
CREATE INDEX "AiAssessment_tenantId_createdAt_idx" ON "AiAssessment"("tenantId", "createdAt");
CREATE INDEX "AiAssessment_tenantId_aiSystemId_idx" ON "AiAssessment"("tenantId", "aiSystemId");

-- CreateIndex
CREATE UNIQUE INDEX "AiDocument_id_tenantId_key" ON "AiDocument"("id", "tenantId");
CREATE INDEX "AiDocument_tenantId_createdAt_idx" ON "AiDocument"("tenantId", "createdAt");
CREATE INDEX "AiDocument_tenantId_aiSystemId_idx" ON "AiDocument"("tenantId", "aiSystemId");

-- CreateIndex
CREATE UNIQUE INDEX "AiRiskResult_id_tenantId_key" ON "AiRiskResult"("id", "tenantId");
CREATE INDEX "AiRiskResult_tenantId_createdAt_idx" ON "AiRiskResult"("tenantId", "createdAt");
CREATE INDEX "AiRiskResult_tenantId_aiAssessmentId_idx" ON "AiRiskResult"("tenantId", "aiAssessmentId");

-- AddForeignKey
ALTER TABLE "AiSystem" ADD CONSTRAINT "AiSystem_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAssessment" ADD CONSTRAINT "AiAssessment_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiAssessment" ADD CONSTRAINT "AiAssessment_aiSystemId_tenantId_fkey"
FOREIGN KEY ("aiSystemId", "tenantId") REFERENCES "AiSystem"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDocument" ADD CONSTRAINT "AiDocument_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDocument" ADD CONSTRAINT "AiDocument_aiSystemId_tenantId_fkey"
FOREIGN KEY ("aiSystemId", "tenantId") REFERENCES "AiSystem"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDocument" ADD CONSTRAINT "AiDocument_aiAssessmentId_tenantId_fkey"
FOREIGN KEY ("aiAssessmentId", "tenantId") REFERENCES "AiAssessment"("id", "tenantId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRiskResult" ADD CONSTRAINT "AiRiskResult_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRiskResult" ADD CONSTRAINT "AiRiskResult_aiAssessmentId_tenantId_fkey"
FOREIGN KEY ("aiAssessmentId", "tenantId") REFERENCES "AiAssessment"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
