-- AI Act FIX PACK: enforce obligation/task uniqueness contract.
CREATE UNIQUE INDEX "AiObligation_tenantId_aiSystemId_obligationType_key"
ON "AiObligation"("tenantId", "aiSystemId", "obligationType");

CREATE UNIQUE INDEX "AiTask_tenantId_aiSystemId_title_key"
ON "AiTask"("tenantId", "aiSystemId", "title");
