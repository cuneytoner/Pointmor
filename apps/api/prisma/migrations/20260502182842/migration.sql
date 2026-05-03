/*
  Warnings:

  - A unique constraint covering the columns `[id,tenantId]` on the table `AiTask` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AiOperationalEventType" AS ENUM ('SYSTEM_CREATED', 'SYSTEM_UPDATED', 'ASSESSMENT_SUBMITTED', 'ASSESSMENT_UPDATED', 'OBLIGATION_CREATED', 'OBLIGATION_UPDATED', 'TASK_CREATED', 'TASK_UPDATED', 'TASK_COMPLETED', 'EVIDENCE_UPLOADED', 'EVIDENCE_MISSING_DETECTED', 'ADVISOR_REVIEW_REQUESTED', 'ADVISOR_REVIEW_COMPLETED', 'RISK_LEVEL_CHANGED', 'DEADLINE_APPROACHING', 'DEADLINE_MISSED');

-- CreateEnum
CREATE TYPE "AiOperationalEventSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- DropIndex
DROP INDEX "AiAssessment_tenantId_createdAt_idx";

-- DropIndex
DROP INDEX "AiSystem_tenantId_createdAt_idx";

-- AlterTable
ALTER TABLE "AiTask" ALTER COLUMN "obligationType" DROP DEFAULT;

-- CreateTable
CREATE TABLE "AiOperationalEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aiSystemId" TEXT,
    "assessmentId" TEXT,
    "obligationId" TEXT,
    "taskId" TEXT,
    "actorUserId" TEXT,
    "eventType" "AiOperationalEventType" NOT NULL,
    "severity" "AiOperationalEventSeverity" NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiOperationalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiOperationalEvent_tenantId_createdAt_idx" ON "AiOperationalEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AiOperationalEvent_tenantId_aiSystemId_createdAt_idx" ON "AiOperationalEvent"("tenantId", "aiSystemId", "createdAt");

-- CreateIndex
CREATE INDEX "AiOperationalEvent_tenantId_eventType_createdAt_idx" ON "AiOperationalEvent"("tenantId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AiOperationalEvent_tenantId_severity_createdAt_idx" ON "AiOperationalEvent"("tenantId", "severity", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiOperationalEvent_id_tenantId_key" ON "AiOperationalEvent"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AiTask_id_tenantId_key" ON "AiTask"("id", "tenantId");

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

-- AddForeignKey
ALTER TABLE "AiOperationalEvent" ADD CONSTRAINT "AiOperationalEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiOperationalEvent" ADD CONSTRAINT "AiOperationalEvent_aiSystemId_tenantId_fkey" FOREIGN KEY ("aiSystemId", "tenantId") REFERENCES "AiSystem"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiOperationalEvent" ADD CONSTRAINT "AiOperationalEvent_assessmentId_tenantId_fkey" FOREIGN KEY ("assessmentId", "tenantId") REFERENCES "AiAssessment"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiOperationalEvent" ADD CONSTRAINT "AiOperationalEvent_obligationId_tenantId_fkey" FOREIGN KEY ("obligationId", "tenantId") REFERENCES "AiObligation"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiOperationalEvent" ADD CONSTRAINT "AiOperationalEvent_taskId_tenantId_fkey" FOREIGN KEY ("taskId", "tenantId") REFERENCES "AiTask"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiOperationalEvent" ADD CONSTRAINT "AiOperationalEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
