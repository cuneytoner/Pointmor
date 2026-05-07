import { buildAuthHeaders, getApiBaseUrl } from "./api-base";

export type ManagerAuditEventItem = {
  id: string;
  actorUserId: string | null;
  actorType: string;
  branchId: string | null;
  deviceSessionId: string | null;
  cashierShiftId: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type ManagerAuditEventsResponse = {
  items: ManagerAuditEventItem[];
  nextCursor: string | null;
};

export async function fetchManagerAuditEvents(
  token: string,
  opts?: { limit?: number; cursor?: string },
): Promise<ManagerAuditEventsResponse> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const q = new URLSearchParams();
  if (opts?.limit != null) q.set("limit", String(opts.limit));
  if (opts?.cursor) q.set("cursor", opts.cursor);
  const qs = q.toString();
  const url = `${base}/manager/audit-events${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: { ...(buildAuthHeaders(token) ?? {}) },
    credentials: "include",
  });
  if (res.status === 403) {
    const err = Object.assign(new Error("forbidden"), { code: "forbidden" as const });
    throw err;
  }
  if (!res.ok) throw new Error("audit_events_failed");
  return (await res.json()) as ManagerAuditEventsResponse;
}
