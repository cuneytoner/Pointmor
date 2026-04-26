import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { issueSession } from "./lib/auth-memory.js";
import { prisma } from "./lib/prisma.js";

type TestTenant = { id: string; slug: string; name: string };
type TestUser = { id: string; email: string };

async function createTenant(prefix: string): Promise<TestTenant> {
  const slug = `ai-act-${prefix}-${randomUUID().slice(0, 8)}`;
  return prisma.tenant.create({
    data: { slug, name: `AI Act ${prefix}`, type: "BUSINESS" },
    select: { id: true, slug: true, name: true },
  });
}

async function createUser(prefix: string): Promise<TestUser> {
  const email = `ai-act-${prefix}-${randomUUID().slice(0, 8)}@example.com`;
  return prisma.user.create({
    data: {
      email,
      name: `AI User ${prefix}`,
      passwordHash: "not-used",
      role: "tenant_operator",
      tenantId: null,
      platformAdmin: false,
    },
    select: { id: true, email: true },
  });
}

async function ensureAiActModule() {
  return prisma.module.upsert({
    where: { name: "ai_act" },
    update: {},
    create: { name: "ai_act", description: "AI Act module" },
    select: { id: true },
  });
}

function authHeader(user: TestUser, tenant: TestTenant) {
  const token = issueSession({
    user: {
      id: user.id,
      email: user.email,
      name: "AI Tester",
      platformAdmin: false,
    },
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
    },
    membership: {
      tenantId: tenant.id,
      role: "ADMIN",
      isExternal: false,
    },
    memberships: [
      {
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
        },
        membership: {
          tenantId: tenant.id,
          role: "ADMIN",
          isExternal: false,
        },
      },
    ],
  });
  return { authorization: `Bearer ${token}` };
}

describe("AI Act routes", () => {
  let app: FastifyInstance;
  const tenantIds: string[] = [];
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    if (tenantIds.length > 0) {
      await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
    }
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
  });

  it("module off denies AI routes", async () => {
    const tenant = await createTenant("module-off");
    const user = await createUser("module-off");
    tenantIds.push(tenant.id);
    userIds.push(user.id);
    await prisma.tenantMembership.create({
      data: { tenantId: tenant.id, userId: user.id, role: "ADMIN", isExternal: false },
    });
    const aiModule = await ensureAiActModule();
    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: aiModule.id } },
      create: { tenantId: tenant.id, moduleId: aiModule.id, isActive: false },
      update: { isActive: false },
    });

    const res = await app.inject({
      method: "GET",
      url: "/ai/systems",
      headers: authHeader(user, tenant),
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe("module_not_active");
  });

  it("creates assessment and reads results in tenant scope", async () => {
    const tenant = await createTenant("flow");
    const user = await createUser("flow");
    tenantIds.push(tenant.id);
    userIds.push(user.id);
    await prisma.tenantMembership.create({
      data: { tenantId: tenant.id, userId: user.id, role: "ADMIN", isExternal: false },
    });
    const aiModule = await ensureAiActModule();
    await prisma.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: aiModule.id } },
      create: { tenantId: tenant.id, moduleId: aiModule.id, isActive: true },
      update: { isActive: true },
    });

    const createSystem = await app.inject({
      method: "POST",
      url: "/ai/systems",
      headers: authHeader(user, tenant),
      payload: {
        name: "Doc Classifier",
        purpose: "classification",
        description: "MVP system",
      },
    });
    expect(createSystem.statusCode).toBe(200);
    const systemId = createSystem.json().id as string;

    const assessment = await app.inject({
      method: "POST",
      url: "/ai/assessment",
      headers: authHeader(user, tenant),
      payload: {
        aiSystemId: systemId,
        questionnaire: {
          highImpact: true,
          biometric: false,
          publicSector: false,
        },
      },
    });
    expect(assessment.statusCode).toBe(200);
    expect(assessment.json().riskResult?.riskLevel).toBeDefined();

    const results = await app.inject({
      method: "GET",
      url: "/ai/results",
      headers: authHeader(user, tenant),
    });
    expect(results.statusCode).toBe(200);
    expect(Array.isArray(results.json())).toBe(true);
    expect(results.json().length).toBeGreaterThan(0);
    expect(results.json()[0].tenantId).toBe(tenant.id);
  });
});
