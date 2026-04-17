-- Her kiracıda en az bir şube; branchId'siz ziyaretleri kiracının ilk şubesine bağla (idempotent).

-- Şubesi olmayan kiracılar: varsayılan "Merkez" şubesi
INSERT INTO "Branch" ("id", "tenantId", "name", "slug", "isActive", "createdAt", "updatedAt")
SELECT
  'br_mig_' || substr(md5(t."id" || 'pm_default_branch'), 1, 20),
  t."id",
  'Merkez',
  'merkez',
  true,
  NOW(),
  NOW()
FROM "Tenant" t
WHERE NOT EXISTS (SELECT 1 FROM "Branch" b WHERE b."tenantId" = t."id");

-- Hâlâ şubesi atanmamış ziyaretler → kiracıdaki en eski şube (createdAt)
UPDATE "Visit" v
SET "branchId" = fb."branchId"
FROM (
  SELECT DISTINCT ON ("tenantId") "tenantId", "id" AS "branchId"
  FROM "Branch"
  ORDER BY "tenantId", "createdAt" ASC
) fb
WHERE v."tenantId" = fb."tenantId"
  AND v."branchId" IS NULL;
