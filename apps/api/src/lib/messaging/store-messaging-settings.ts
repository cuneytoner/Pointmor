import { prisma } from "../prisma.js";

export async function getOrCreateStoreMessagingSettings(tenantId: string) {
  const existing = await prisma.storeMessagingSettings.findUnique({
    where: { tenantId },
  });
  if (existing) return existing;
  return prisma.storeMessagingSettings.create({
    data: {
      tenantId,
      smsEnabled: false,
      whatsappEnabled: false,
    },
  });
}
