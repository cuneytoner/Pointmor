-- FINAL AI Act MVP stabilization: task identity includes obligation type.
ALTER TABLE "AiTask"
ADD COLUMN "obligationType" TEXT NOT NULL DEFAULT 'general';

DROP INDEX IF EXISTS "AiTask_tenantId_aiSystemId_title_key";

CREATE UNIQUE INDEX "AiTask_tenantId_aiSystemId_obligationType_title_key"
ON "AiTask"("tenantId", "aiSystemId", "obligationType", "title");
