-- FINAL idempotency fix: enforce single current assessment per tenant/system.
ALTER TABLE "AiAssessment"
ADD COLUMN "isCurrent" BOOLEAN NOT NULL DEFAULT true;

WITH ranked AS (
  SELECT
    id,
    "tenantId",
    "aiSystemId",
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", "aiSystemId"
      ORDER BY "createdAt" DESC, id DESC
    ) AS rn
  FROM "AiAssessment"
),
marked AS (
  UPDATE "AiAssessment" a
  SET "isCurrent" = CASE WHEN r.rn = 1 THEN true ELSE false END
  FROM ranked r
  WHERE a.id = r.id
  RETURNING a.id, a."tenantId", a."aiSystemId", a."isCurrent", a."createdAt"
),
ranked_false AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", "aiSystemId", "isCurrent"
      ORDER BY "createdAt" DESC, id DESC
    ) AS rn
  FROM marked
  WHERE "isCurrent" = false
)
DELETE FROM "AiAssessment" a
USING ranked_false rf
WHERE a.id = rf.id
  AND rf.rn > 1;

CREATE UNIQUE INDEX "AiAssessment_tenantId_aiSystemId_isCurrent_key"
ON "AiAssessment"("tenantId", "aiSystemId", "isCurrent");
