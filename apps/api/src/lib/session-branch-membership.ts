import { TENANT_MEMBERSHIP_ROLES } from "@pointmor/rbac";
import type { SessionMembership } from "./auth-memory.js";
import { prisma } from "./prisma.js";

/**
 * Giriş anında kiracı üyeliği + şube kapsamı (staff: kısıtlı; manager: atanmış veya tümü; owner: tümü).
 */
export async function buildSessionMembership(
  userId: string,
  tenantId: string,
  role: string,
): Promise<SessionMembership> {
  if (
    role === TENANT_MEMBERSHIP_ROLES.owner ||
    role === TENANT_MEMBERSHIP_ROLES.admin
  ) {
    return { role, branchScope: "all" };
  }

  let accessRows = await prisma.userBranchAccess.findMany({
    where: { userId },
    select: { branchId: true },
  });
  let ids = accessRows.map((r) => r.branchId);

  if (role === TENANT_MEMBERSHIP_ROLES.staff) {
    if (ids.length === 0) {
      const first = await prisma.branch.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (first) {
        await prisma.userBranchAccess.create({
          data: { userId, branchId: first.id },
        });
        ids = [first.id];
      }
    }
    return { role, branchScope: { restrictedTo: ids } };
  }

  if (
    role === TENANT_MEMBERSHIP_ROLES.manager ||
    role === TENANT_MEMBERSHIP_ROLES.operator
  ) {
    if (ids.length === 0) return { role, branchScope: "all" };
    return { role, branchScope: { restrictedTo: ids } };
  }

  if (ids.length > 0) {
    return { role, branchScope: { restrictedTo: ids } };
  }
  return { role, branchScope: "all" };
}
