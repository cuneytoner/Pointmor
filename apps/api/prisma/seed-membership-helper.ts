import type { PrismaClient, TenantMembershipRole } from "../src/generated/prisma/client.js";

export async function createMembership(input: {
  prisma: PrismaClient;
  userId: string;
  tenantId: string;
  role: TenantMembershipRole;
  isExternal: boolean;
}) {
  const { prisma, userId, tenantId, role, isExternal } = input;
  return prisma.tenantMembership.upsert({
    where: {
      userId_tenantId: { userId, tenantId },
    },
    create: {
      userId,
      tenantId,
      role,
      isExternal,
    },
    update: {
      role,
      isExternal,
    },
  });
}

export async function validateSeedConsistency(prisma: PrismaClient): Promise<void> {
  const usersWithoutMembership = await prisma.user.count({
    where: {
      platformAdmin: false,
      memberships: { none: {} },
    },
  });
  if (usersWithoutMembership > 0) {
    throw new Error("seed_consistency_users_without_membership");
  }

  const tenantsWithoutMembers = await prisma.tenant.count({
    where: {
      memberships: { none: {} },
    },
  });
  if (tenantsWithoutMembers > 0) {
    throw new Error("seed_consistency_tenants_without_members");
  }

  const orphanCustomers = await prisma.customer.count({
    where: {
      tenant: {
        memberships: { none: {} },
      },
    },
  });
  if (orphanCustomers > 0) {
    throw new Error("seed_consistency_orphan_tenant_data");
  }
}
