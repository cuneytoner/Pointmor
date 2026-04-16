import { prisma } from "../prisma.js";
import { dispatchCustomerActionNotification } from "./dispatch-customer-action-notification.js";

/**
 * Şablon anahtarı + veri ile retention mesajı oluşturur ve gönderim kuyruğuna alır.
 */
export async function sendRetentionMessage(input: {
  tenantId: string;
  customerId: string;
  actionType: string;
  templateKey: string;
  templateData: Record<string, unknown>;
  fallbackMessage: string;
}): Promise<void> {
  const row = await prisma.customerAction.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      type: input.actionType,
      message: input.fallbackMessage,
      templateKey: input.templateKey,
      templateData: input.templateData as object,
      status: "pending",
    },
  });
  await dispatchCustomerActionNotification(row);
}
