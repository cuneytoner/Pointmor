-- CreateEnum
CREATE TYPE "AiProviderType" AS ENUM ('INTERNAL', 'EXTERNAL', 'HYBRID');

-- CreateEnum
CREATE TYPE "AiSystemStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AiAssessmentStatus" AS ENUM ('DRAFT', 'COMPLETED', 'completed');

-- Alter existing enum with additional values
ALTER TYPE "AiRiskLevel" ADD VALUE IF NOT EXISTS 'MINIMAL';
ALTER TYPE "AiRiskLevel" ADD VALUE IF NOT EXISTS 'LIMITED';
ALTER TYPE "AiRiskLevel" ADD VALUE IF NOT EXISTS 'PROHIBITED';

-- CreateEnum
CREATE TYPE "AiClassificationSource" AS ENUM ('MANUAL', 'AI', 'HYBRID');

-- CreateEnum
CREATE TYPE "AiAnswerSource" AS ENUM ('USER', 'AI');

-- CreateEnum
CREATE TYPE "AiObligationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "AiObligationSource" AS ENUM ('RULE_ENGINE', 'AI', 'MANUAL');

-- CreateEnum
CREATE TYPE "AiTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AiTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiEvidenceType" AS ENUM ('DOCUMENT', 'LINK', 'NOTE');

-- CreateEnum
CREATE TYPE "AiDocumentRelationType" AS ENUM ('CONTRACT', 'POLICY', 'SYSTEM_DESCRIPTION', 'VENDOR_DOC', 'OTHER');

-- AlterTable AiSystem
ALTER TABLE "AiSystem"
ADD COLUMN "providerType" "AiProviderType" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN "status" "AiSystemStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "createdByUserId" TEXT,
ALTER COLUMN "purpose" DROP NOT NULL;

-- AlterTable AiAssessment
ALTER TABLE "AiAssessment"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "riskLevel" "AiRiskLevel",
ADD COLUMN "classificationSource" "AiClassificationSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "confidence" DOUBLE PRECISION,
ADD COLUMN "createdByUserId" TEXT,
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "AiAssessmentStatus"
USING (
  CASE
    WHEN "status"::text = 'completed' THEN 'COMPLETED'::"AiAssessmentStatus"
    WHEN "status"::text = 'COMPLETED' THEN 'COMPLETED'::"AiAssessmentStatus"
    ELSE 'DRAFT'::"AiAssessmentStatus"
  END
);
ALTER TABLE "AiAssessment"
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "AiAssessmentAnswer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "answerValue" JSONB NOT NULL,
    "answerSource" "AiAnswerSource" NOT NULL DEFAULT 'USER',
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiAssessmentAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiObligation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "obligationType" TEXT NOT NULL,
    "status" "AiObligationStatus" NOT NULL DEFAULT 'PENDING',
    "source" "AiObligationSource" NOT NULL DEFAULT 'RULE_ENGINE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "obligationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "AiTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "AiTaskStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiEvidence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "type" "AiEvidenceType" NOT NULL,
    "documentId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDocumentLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aiSystemId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "relationType" "AiDocumentRelationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiDocumentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDocumentJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "modelName" TEXT,
    "modelVersion" TEXT,
    "promptVersion" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiDocumentJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiExtraction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "aiSystemId" TEXT,
    "jobId" TEXT,
    "extractionSchema" TEXT,
    "extractedJson" JSONB,
    "confidence" DOUBLE PRECISION,
    "requiresReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "extractionId" TEXT NOT NULL,
    "reviewedByUserId" TEXT NOT NULL,
    "correctedJson" JSONB,
    "reviewStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiEmbedding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "aiSystemId" TEXT,
    "chunkIndex" INTEGER NOT NULL,
    "vectorRef" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiEmbedding_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "AiSystem_tenantId_idx" ON "AiSystem"("tenantId");
CREATE INDEX "AiSystem_tenantId_status_idx" ON "AiSystem"("tenantId", "status");
CREATE INDEX "AiAssessment_tenantId_idx" ON "AiAssessment"("tenantId");
CREATE INDEX "AiAssessment_tenantId_status_idx" ON "AiAssessment"("tenantId", "status");

CREATE UNIQUE INDEX "AiAssessmentAnswer_assessmentId_questionKey_key" ON "AiAssessmentAnswer"("assessmentId", "questionKey");
CREATE INDEX "AiAssessmentAnswer_tenantId_idx" ON "AiAssessmentAnswer"("tenantId");
CREATE INDEX "AiAssessmentAnswer_tenantId_assessmentId_idx" ON "AiAssessmentAnswer"("tenantId", "assessmentId");

CREATE INDEX "AiObligation_tenantId_idx" ON "AiObligation"("tenantId");
CREATE INDEX "AiObligation_tenantId_aiSystemId_idx" ON "AiObligation"("tenantId", "aiSystemId");
CREATE INDEX "AiObligation_tenantId_status_idx" ON "AiObligation"("tenantId", "status");
CREATE UNIQUE INDEX "AiObligation_id_tenantId_key" ON "AiObligation"("id", "tenantId");

CREATE INDEX "AiTask_tenantId_idx" ON "AiTask"("tenantId");
CREATE INDEX "AiTask_tenantId_aiSystemId_idx" ON "AiTask"("tenantId", "aiSystemId");
CREATE INDEX "AiTask_tenantId_status_idx" ON "AiTask"("tenantId", "status");
CREATE INDEX "AiTask_assignedToUserId_idx" ON "AiTask"("assignedToUserId");

CREATE INDEX "AiEvidence_tenantId_idx" ON "AiEvidence"("tenantId");
CREATE INDEX "AiEvidence_tenantId_aiSystemId_idx" ON "AiEvidence"("tenantId", "aiSystemId");

CREATE UNIQUE INDEX "AiDocumentLink_aiSystemId_documentId_relationType_key" ON "AiDocumentLink"("aiSystemId", "documentId", "relationType");
CREATE INDEX "AiDocumentLink_tenantId_idx" ON "AiDocumentLink"("tenantId");
CREATE INDEX "AiDocumentLink_tenantId_aiSystemId_idx" ON "AiDocumentLink"("tenantId", "aiSystemId");
CREATE INDEX "AiDocumentLink_tenantId_documentId_idx" ON "AiDocumentLink"("tenantId", "documentId");

CREATE INDEX "AiDocumentJob_tenantId_idx" ON "AiDocumentJob"("tenantId");
CREATE INDEX "AiDocumentJob_tenantId_documentId_idx" ON "AiDocumentJob"("tenantId", "documentId");
CREATE UNIQUE INDEX "AiDocumentJob_id_tenantId_key" ON "AiDocumentJob"("id", "tenantId");

CREATE INDEX "AiExtraction_tenantId_idx" ON "AiExtraction"("tenantId");
CREATE INDEX "AiExtraction_tenantId_documentId_idx" ON "AiExtraction"("tenantId", "documentId");
CREATE UNIQUE INDEX "AiExtraction_id_tenantId_key" ON "AiExtraction"("id", "tenantId");

CREATE INDEX "AiReview_tenantId_idx" ON "AiReview"("tenantId");
CREATE INDEX "AiReview_tenantId_extractionId_idx" ON "AiReview"("tenantId", "extractionId");

CREATE INDEX "AiEmbedding_tenantId_idx" ON "AiEmbedding"("tenantId");
CREATE INDEX "AiEmbedding_tenantId_documentId_idx" ON "AiEmbedding"("tenantId", "documentId");

-- FKs
ALTER TABLE "AiSystem" ADD CONSTRAINT "AiSystem_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiAssessment" ADD CONSTRAINT "AiAssessment_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiAssessmentAnswer" ADD CONSTRAINT "AiAssessmentAnswer_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiAssessmentAnswer" ADD CONSTRAINT "AiAssessmentAnswer_assessmentId_tenantId_fkey"
FOREIGN KEY ("assessmentId", "tenantId") REFERENCES "AiAssessment"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiObligation" ADD CONSTRAINT "AiObligation_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiObligation" ADD CONSTRAINT "AiObligation_aiSystemId_tenantId_fkey"
FOREIGN KEY ("aiSystemId", "tenantId") REFERENCES "AiSystem"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiTask" ADD CONSTRAINT "AiTask_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiTask" ADD CONSTRAINT "AiTask_aiSystemId_tenantId_fkey"
FOREIGN KEY ("aiSystemId", "tenantId") REFERENCES "AiSystem"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiTask" ADD CONSTRAINT "AiTask_obligationId_tenantId_fkey"
FOREIGN KEY ("obligationId", "tenantId") REFERENCES "AiObligation"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiTask" ADD CONSTRAINT "AiTask_assignedToUserId_fkey"
FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiEvidence" ADD CONSTRAINT "AiEvidence_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiEvidence" ADD CONSTRAINT "AiEvidence_aiSystemId_tenantId_fkey"
FOREIGN KEY ("aiSystemId", "tenantId") REFERENCES "AiSystem"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiDocumentLink" ADD CONSTRAINT "AiDocumentLink_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiDocumentLink" ADD CONSTRAINT "AiDocumentLink_aiSystemId_tenantId_fkey"
FOREIGN KEY ("aiSystemId", "tenantId") REFERENCES "AiSystem"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiDocumentJob" ADD CONSTRAINT "AiDocumentJob_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiDocumentJob" ADD CONSTRAINT "AiDocumentJob_documentId_tenantId_fkey"
FOREIGN KEY ("documentId", "tenantId") REFERENCES "AiDocument"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiExtraction" ADD CONSTRAINT "AiExtraction_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiExtraction" ADD CONSTRAINT "AiExtraction_documentId_tenantId_fkey"
FOREIGN KEY ("documentId", "tenantId") REFERENCES "AiDocument"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiExtraction" ADD CONSTRAINT "AiExtraction_aiSystemId_tenantId_fkey"
FOREIGN KEY ("aiSystemId", "tenantId") REFERENCES "AiSystem"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiExtraction" ADD CONSTRAINT "AiExtraction_jobId_tenantId_fkey"
FOREIGN KEY ("jobId", "tenantId") REFERENCES "AiDocumentJob"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AiReview" ADD CONSTRAINT "AiReview_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiReview" ADD CONSTRAINT "AiReview_extractionId_tenantId_fkey"
FOREIGN KEY ("extractionId", "tenantId") REFERENCES "AiExtraction"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiReview" ADD CONSTRAINT "AiReview_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AiEmbedding" ADD CONSTRAINT "AiEmbedding_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiEmbedding" ADD CONSTRAINT "AiEmbedding_documentId_tenantId_fkey"
FOREIGN KEY ("documentId", "tenantId") REFERENCES "AiDocument"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiEmbedding" ADD CONSTRAINT "AiEmbedding_aiSystemId_tenantId_fkey"
FOREIGN KEY ("aiSystemId", "tenantId") REFERENCES "AiSystem"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
