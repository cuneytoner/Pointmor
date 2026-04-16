import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { requireTenantPermission } from "../lib/tenant-permission-guard.js";
import { prisma } from "../lib/prisma.js";
import { ensureStoreSettingsRow } from "../lib/store-settings-service.js";

function requireTenantSession(
  req: { authSession?: SessionPayload },
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
): string | null {
  const s = req.authSession as SessionPayload | undefined;
  const tenantId = s?.tenant?.id;
  if (!tenantId) {
    reply.code(403).send({ error: "tenant_context_required" });
    return null;
  }
  return tenantId;
}

async function assertCategoryOwned(
  tenantId: string,
  categoryId: string,
): Promise<boolean> {
  const row = await prisma.menuCategory.findFirst({
    where: { id: categoryId, tenantId },
  });
  return Boolean(row);
}

function parseSortOrder(v: unknown, fallback: number): number {
  if (v === undefined || v === null) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}

function parsePriceMinor(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) return null;
  return Math.round(n);
}

export async function registerTenantMenuRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tenant/menu/categories", { preHandler: [authPreHandler, requireTenantPermission("menu.view")] }, async (req, reply) => {
    const tenantId = requireTenantSession(req, reply);
    if (!tenantId) return;
    await ensureStoreSettingsRow(tenantId);
    return prisma.menuCategory.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  });

  app.post<{ Body: Record<string, unknown> }>(
    "/tenant/menu/categories",
    { preHandler: [authPreHandler, requireTenantPermission("menu.manage")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const b = req.body ?? {};
      const name = String(b.name ?? "").trim();
      if (!name || name.length > 200) {
        return reply.code(400).send({ error: "validation_error" });
      }
      const description =
        b.description === null || b.description === undefined
          ? null
          : String(b.description).trim().slice(0, 2000) || null;
      const sortOrder = parseSortOrder(b.sortOrder, 0);
      const isActive = b.isActive === undefined ? true : Boolean(b.isActive);
      await ensureStoreSettingsRow(tenantId);
      return prisma.menuCategory.create({
        data: {
          tenantId,
          name,
          description,
          sortOrder,
          isActive,
        },
      });
    },
  );

  app.put<{ Params: { categoryId: string }; Body: Record<string, unknown> }>(
    "/tenant/menu/categories/:categoryId",
    { preHandler: [authPreHandler, requireTenantPermission("menu.manage")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const categoryId = String(req.params.categoryId ?? "").trim();
      if (!(await assertCategoryOwned(tenantId, categoryId))) {
        return reply.code(404).send({ error: "not_found" });
      }
      const b = req.body ?? {};
      const patch: {
        name?: string;
        description?: string | null;
        sortOrder?: number;
        isActive?: boolean;
      } = {};
      if (b.name !== undefined) {
        const name = String(b.name).trim();
        if (!name || name.length > 200) {
          return reply.code(400).send({ error: "validation_error" });
        }
        patch.name = name;
      }
      if (b.description !== undefined) {
        patch.description =
          b.description === null
            ? null
            : String(b.description).trim().slice(0, 2000) || null;
      }
      if (b.sortOrder !== undefined) {
        patch.sortOrder = parseSortOrder(b.sortOrder, 0);
      }
      if (b.isActive !== undefined) {
        patch.isActive = Boolean(b.isActive);
      }
      return prisma.menuCategory.update({
        where: { id: categoryId },
        data: patch,
      });
    },
  );

  app.delete<{ Params: { categoryId: string } }>(
    "/tenant/menu/categories/:categoryId",
    { preHandler: [authPreHandler, requireTenantPermission("menu.manage")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const categoryId = String(req.params.categoryId ?? "").trim();
      if (!(await assertCategoryOwned(tenantId, categoryId))) {
        return reply.code(404).send({ error: "not_found" });
      }
      await prisma.menuCategory.update({
        where: { id: categoryId },
        data: { isActive: false },
      });
      return reply.code(204).send();
    },
  );

  app.get<{ Querystring: { categoryId?: string } }>(
    "/tenant/menu/items",
    { preHandler: [authPreHandler, requireTenantPermission("menu.view")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      await ensureStoreSettingsRow(tenantId);
      const rawCat = req.query?.categoryId;
      const categoryId =
        rawCat !== undefined && rawCat !== null && String(rawCat).trim() !== ""
          ? String(rawCat).trim()
          : undefined;
      if (categoryId && !(await assertCategoryOwned(tenantId, categoryId))) {
        return reply.code(400).send({ error: "invalid_category" });
      }
      return prisma.menuItem.findMany({
        where: {
          tenantId,
          ...(categoryId ? { categoryId } : {}),
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
    },
  );

  app.post<{ Body: Record<string, unknown> }>(
    "/tenant/menu/items",
    { preHandler: [authPreHandler, requireTenantPermission("menu.manage")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const b = req.body ?? {};
      const categoryId = String(b.categoryId ?? "").trim();
      if (!categoryId || !(await assertCategoryOwned(tenantId, categoryId))) {
        return reply.code(400).send({ error: "invalid_category" });
      }
      const name = String(b.name ?? "").trim();
      if (!name || name.length > 200) {
        return reply.code(400).send({ error: "validation_error" });
      }
      const price = parsePriceMinor(b.price);
      if (price === null) {
        return reply.code(400).send({ error: "validation_error" });
      }
      const description =
        b.description === null || b.description === undefined
          ? null
          : String(b.description).trim().slice(0, 2000) || null;
      const currency =
        b.currency === null || b.currency === undefined
          ? null
          : String(b.currency).trim().toUpperCase().slice(0, 8) || null;
      const imageUrl =
        b.imageUrl === null || b.imageUrl === undefined
          ? null
          : String(b.imageUrl).trim().slice(0, 2000) || null;
      const sortOrder = parseSortOrder(b.sortOrder, 0);
      const isActive = b.isActive === undefined ? true : Boolean(b.isActive);
      await ensureStoreSettingsRow(tenantId);
      return prisma.menuItem.create({
        data: {
          tenantId,
          categoryId,
          name,
          description,
          price,
          currency,
          imageUrl,
          sortOrder,
          isActive,
        },
      });
    },
  );

  app.put<{ Params: { itemId: string }; Body: Record<string, unknown> }>(
    "/tenant/menu/items/:itemId",
    { preHandler: [authPreHandler, requireTenantPermission("menu.manage")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const itemId = String(req.params.itemId ?? "").trim();
      const existing = await prisma.menuItem.findFirst({
        where: { id: itemId, tenantId },
      });
      if (!existing) {
        return reply.code(404).send({ error: "not_found" });
      }
      const b = req.body ?? {};
      const patch: {
        categoryId?: string;
        name?: string;
        description?: string | null;
        price?: number;
        currency?: string | null;
        imageUrl?: string | null;
        sortOrder?: number;
        isActive?: boolean;
      } = {};
      if (b.categoryId !== undefined) {
        const categoryId = String(b.categoryId).trim();
        if (!categoryId || !(await assertCategoryOwned(tenantId, categoryId))) {
          return reply.code(400).send({ error: "invalid_category" });
        }
        patch.categoryId = categoryId;
      }
      if (b.name !== undefined) {
        const name = String(b.name).trim();
        if (!name || name.length > 200) {
          return reply.code(400).send({ error: "validation_error" });
        }
        patch.name = name;
      }
      if (b.description !== undefined) {
        patch.description =
          b.description === null
            ? null
            : String(b.description).trim().slice(0, 2000) || null;
      }
      if (b.price !== undefined) {
        const price = parsePriceMinor(b.price);
        if (price === null) {
          return reply.code(400).send({ error: "validation_error" });
        }
        patch.price = price;
      }
      if (b.currency !== undefined) {
        patch.currency =
          b.currency === null
            ? null
            : String(b.currency).trim().toUpperCase().slice(0, 8) || null;
      }
      if (b.imageUrl !== undefined) {
        patch.imageUrl =
          b.imageUrl === null
            ? null
            : String(b.imageUrl).trim().slice(0, 2000) || null;
      }
      if (b.sortOrder !== undefined) {
        patch.sortOrder = parseSortOrder(b.sortOrder, 0);
      }
      if (b.isActive !== undefined) {
        patch.isActive = Boolean(b.isActive);
      }
      return prisma.menuItem.update({
        where: { id: itemId },
        data: patch,
      });
    },
  );

  app.delete<{ Params: { itemId: string } }>(
    "/tenant/menu/items/:itemId",
    { preHandler: [authPreHandler, requireTenantPermission("menu.manage")] },
    async (req, reply) => {
      const tenantId = requireTenantSession(req, reply);
      if (!tenantId) return;
      const itemId = String(req.params.itemId ?? "").trim();
      const existing = await prisma.menuItem.findFirst({
        where: { id: itemId, tenantId },
      });
      if (!existing) {
        return reply.code(404).send({ error: "not_found" });
      }
      await prisma.menuItem.update({
        where: { id: itemId },
        data: { isActive: false },
      });
      return reply.code(204).send();
    },
  );
}
