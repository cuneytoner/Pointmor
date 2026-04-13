import { prisma } from "./prisma.js";

export async function writeAudit(
  actorEmail: string | null,
  action: string,
  detail?: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { actorEmail, action, detail },
    });
  } catch (e) {
    console.error("audit_log_failed", e);
  }
}
