/**
 * Kiracıya ait Prisma `where` parçalarında `tenantId` çakışmasını erken yakalar.
 * Tüm sorguları kapsamaz; kritik tenant-mutasyon akışlarında kullanım için.
 */
export function mergeTenantWhere<T extends Record<string, unknown>>(
  tenantId: string,
  where?: T | null,
): T & { tenantId: string } {
  const base = (where && typeof where === "object" ? { ...where } : {}) as T & Record<string, unknown>;
  const existing = base["tenantId"];
  if (existing !== undefined && existing !== tenantId) {
    throw new Error(`tenant_scope_conflict:${String(existing)}`);
  }
  return { ...base, tenantId } as T & { tenantId: string };
}
