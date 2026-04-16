import type { CustomerAction } from "../../generated/prisma/client.js";
import { prisma } from "../prisma.js";
import { mapActionTypeToTemplateKey } from "./retention-message-body.js";
import { sendWithFallback } from "./send-with-fallback.js";

/**
 * Otomasyon `CustomerAction` satırı için `sendWithFallback` çağırır (kanal sırası, retry, delivery kayıtları).
 */
export async function dispatchCustomerActionNotification(
  action: Pick<
    CustomerAction,
    "id" | "tenantId" | "customerId" | "type" | "message" | "templateKey" | "templateData"
  >,
): Promise<void> {
  const customer = await prisma.customer.findFirst({
    where: { id: action.customerId, tenantId: action.tenantId },
  });

  if (!customer) {
    await prisma.customerAction.update({
      where: { id: action.id },
      data: { status: "failed" },
    });
    return;
  }

  const result = await sendWithFallback({
    tenantId: action.tenantId,
    customerId: action.customerId,
    templateKey: action.templateKey ?? mapActionTypeToTemplateKey(action.type),
    templateData: action.templateData,
    customerActionId: action.id,
    customerAction: { message: action.message },
    actionTypeHint: action.type,
  });

  await prisma.customerAction.update({
    where: { id: action.id },
    data: { status: result.success ? "sent" : "failed" },
  });
}
