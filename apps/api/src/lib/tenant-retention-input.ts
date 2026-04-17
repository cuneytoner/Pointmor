export type TenantRetentionUpdateInput = {
  operationalAuditDays: number;
  exportAuditDays: number;
  messagingDays: number;
  anomalyDays: number;
};

export function parseTenantRetentionPut(
  body: unknown,
): TenantRetentionUpdateInput | { error: "validation_error" } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { error: "validation_error" };
  }
  const o = body as Record<string, unknown>;
  const keys = ["operationalAuditDays", "exportAuditDays", "messagingDays", "anomalyDays"] as const;
  const out: Partial<TenantRetentionUpdateInput> = {};
  for (const k of keys) {
    const v = o[k];
    if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v)) {
      return { error: "validation_error" };
    }
    out[k] = v;
  }
  return out as TenantRetentionUpdateInput;
}
