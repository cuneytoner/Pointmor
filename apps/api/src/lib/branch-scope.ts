import type { Prisma } from "../generated/prisma/client.js";
import type { SessionBranchScope, SessionPayload } from "./auth-memory.js";

export function branchScopeFromSession(session: SessionPayload): SessionBranchScope {
  const raw = session.membership?.branchScope;
  if (!raw || raw === "all") return "all";
  if (typeof raw === "object" && Array.isArray(raw.restrictedTo)) {
    return { restrictedTo: raw.restrictedTo };
  }
  return "all";
}

export function visitWhereForSession(
  tenantId: string,
  session: SessionPayload,
): Prisma.VisitWhereInput {
  const base: Prisma.VisitWhereInput = { tenantId };
  const scope = branchScopeFromSession(session);
  if (scope === "all") return base;
  if (scope.restrictedTo.length === 0) {
    return { ...base, id: { in: [] } };
  }
  return { ...base, branchId: { in: scope.restrictedTo } };
}

export function redemptionWhereForSession(
  tenantId: string,
  session: SessionPayload,
): Prisma.RedemptionWhereInput {
  const base: Prisma.RedemptionWhereInput = { tenantId };
  const scope = branchScopeFromSession(session);
  if (scope === "all") return base;
  if (scope.restrictedTo.length === 0) {
    return { ...base, id: { in: [] } };
  }
  return {
    ...base,
    OR: [
      { deviceSession: { branchId: { in: scope.restrictedTo } } },
      { cashierShift: { deviceSession: { branchId: { in: scope.restrictedTo } } } },
    ],
  };
}

/** Kasiyer cihazı şubesi, kullanıcının şube kapsamında mı? */
export function assertVisitBranchForSession(
  session: SessionPayload | null | undefined,
  resolvedBranchId: string | null,
): void {
  if (!session?.tenant) return;
  const scope = branchScopeFromSession(session);
  if (scope === "all") return;
  if (scope.restrictedTo.length === 0) {
    throw Object.assign(new Error("branch_access_denied"), { statusCode: 403 });
  }
  if (!resolvedBranchId || !scope.restrictedTo.includes(resolvedBranchId)) {
    throw Object.assign(new Error("branch_access_denied"), { statusCode: 403 });
  }
}

export function assertDeviceSessionBranchAllowed(
  session: SessionPayload,
  deviceSessionBranchId: string | null,
): void {
  const scope = branchScopeFromSession(session);
  if (scope === "all") return;
  if (!deviceSessionBranchId) {
    const err = Object.assign(new Error("branch_required_for_session"), { statusCode: 403 });
    throw err;
  }
  if (!scope.restrictedTo.includes(deviceSessionBranchId)) {
    const err = Object.assign(new Error("branch_access_denied"), { statusCode: 403 });
    throw err;
  }
}

/** Yönetici çoklu şube ataması için (API gövdesi) — boş = tüm şube yetkisi. */
export async function validateBranchIdsForTenant(
  tenantId: string,
  branchIds: string[],
): Promise<boolean> {
  if (branchIds.length === 0) return true;
  const { prisma } = await import("./prisma.js");
  const n = await prisma.branch.count({
    where: { tenantId, id: { in: branchIds } },
  });
  return n === branchIds.length;
}
