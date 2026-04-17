import { AuditEntityType } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import { getCustomerDetail } from "./loyalty-service.js";
import { recordAuditEvent } from "./operational-audit-service.js";
const DELETED_NAME = "Deleted User";

function maskEmail(s: string): string {
  const at = s.indexOf("@");
  if (at <= 0) return "[masked]";
  return `${s[0] ?? "?"}***@${s.slice(at + 1)}`;
}

export async function buildCustomerGdprExport(tenantId: string, customerId: string) {
  const detail = await getCustomerDetail(tenantId, customerId);
  const c = detail.customer;
  const phoneMasked =
    typeof c.phone === "string" && c.phone.length > 4
      ? `***${c.phone.replace(/\D/g, "").slice(-2)}`
      : "[masked]";
  return {
    exportedAt: new Date().toISOString(),
    customer: {
      id: c.id,
      name: c.name,
      phone: phoneMasked,
      email: c.email ? maskEmail(c.email) : null,
      createdAt: c.createdAt,
    },
    pointsBalance: detail.pointsBalance,
    recentVisits: detail.recentVisits,
    recentLedger: detail.recentLedger,
    rewardClaims: detail.rewardClaims,
  };
}

export async function anonymizeCustomer(params: {
  tenantId: string;
  customerId: string;
  actorUserId: string;
}) {
  const anonPhone = `anon:${params.customerId}`;
  await prisma.$transaction(async (tx) => {
    await tx.customer.updateMany({
      where: { id: params.customerId, tenantId: params.tenantId },
      data: {
        name: DELETED_NAME,
        phone: anonPhone,
        email: null,
      },
    });
    const pref = await tx.customerContactPreference.findUnique({
      where: { customerId: params.customerId },
    });
    if (pref) {
      await tx.customerContactPreference.update({
        where: { customerId: params.customerId },
        data: {
          phone: anonPhone,
          smsOptIn: false,
          whatsappOptIn: false,
          preferredChannel: "none",
        },
      });
    }
    await tx.loyaltyAccount.updateMany({
      where: { tenantId: params.tenantId, customerId: params.customerId },
      data: { pointsBalance: 0 },
    });
  });

  await recordAuditEvent({
    tenantId: params.tenantId,
    actorUserId: params.actorUserId,
    actorType: "manager",
    branchId: null,
    deviceSessionId: null,
    cashierShiftId: null,
    eventType: "customer_anonymized",
    entityType: AuditEntityType.customer,
    entityId: params.customerId,
    payload: { reason: "gdpr_request" },
  });

  return { ok: true as const };
}
