import { getApiBaseUrl } from "./api-base";
import type { SubscriptionDto } from "../hooks/useAdminData";

export async function patchSubscription(
  token: string,
  subscriptionId: string,
  body: { planId?: string; status?: string; renewsAt?: string | null },
): Promise<SubscriptionDto> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
      errBody = null;
    }
    throw Object.assign(new Error("subscription_patch_failed"), {
      status: res.status,
      body: errBody,
    });
  }
  return res.json() as Promise<SubscriptionDto>;
}
