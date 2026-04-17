import type { SessionPayload } from "./auth-memory.js";
import { listBranchesForUser } from "./cashier-operation-service.js";
import { prisma } from "./prisma.js";
import { visitWhereForSession } from "./branch-scope.js";

const SEVEN_D_MS = 7 * 24 * 60 * 60 * 1000;

/** Şube bazlı karşılaştırma: son 7 gün ziyaret sayısı (oturum şube kapsamına uygun). */
export async function getBranchMetricsComparison(
  tenantId: string,
  session: SessionPayload,
) {
  const since = new Date(Date.now() - SEVEN_D_MS);
  const branches = await listBranchesForUser(tenantId, session);
  const where = {
    ...visitWhereForSession(tenantId, session),
    createdAt: { gte: since },
  };
  const grouped = await prisma.visit.groupBy({
    by: ["branchId"],
    where,
    _count: { _all: true },
  });
  const countByBranch = new Map(
    grouped.map((g) => [g.branchId, g._count._all]),
  );
  const unassigned = countByBranch.get(null) ?? 0;

  return {
    periodDays: 7,
    branches: branches.map((b) => ({
      branchId: b.id,
      name: b.name,
      slug: b.slug,
      visits: countByBranch.get(b.id) ?? 0,
    })),
    unassignedVisits: unassigned,
  };
}
