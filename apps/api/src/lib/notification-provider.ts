import type { CustomerAction } from "../generated/prisma/client.js";

export type NotificationProvider = (
  action: Pick<CustomerAction, "id" | "tenantId" | "customerId" | "type" | "message">,
) => Promise<{ ok: boolean; detail?: string }>;

/** Üretim öncesi: konsola yazar; SMS/e-posta sağlayıcısı burada implement edilir. */
export const logNotificationProvider: NotificationProvider = async (action) => {
  // eslint-disable-next-line no-console
  console.info("[Pointmor notify:simulate]", {
    actionId: action.id,
    type: action.type,
    tenantId: action.tenantId,
    customerId: action.customerId,
    message: action.message,
  });
  return { ok: true, detail: "simulated" };
};

let activeProvider: NotificationProvider = logNotificationProvider;

export function setNotificationProvider(p: NotificationProvider): void {
  activeProvider = p;
}

export function getNotificationProvider(): NotificationProvider {
  return activeProvider;
}
