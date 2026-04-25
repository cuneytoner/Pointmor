import type { FastifyInstance } from "fastify";
import { authPreHandler } from "../lib/http-auth.js";
import type { SessionPayload } from "../lib/auth-memory.js";
import { hasPermissionForSession } from "../lib/tenant-permissions.js";
import { prisma } from "../lib/prisma.js";

export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/users",
    { preHandler: [authPreHandler] },
    async (req, reply) => {
      const s = req.authSession as SessionPayload;
      if (s.user.platformAdmin) {
        return prisma.user.findMany({
          orderBy: { email: "asc" },
          select: {
            id: true,
            email: true,
            name: true,
            platformAdmin: true,
            role: true,
            tenantId: true,
            tenant: { select: { slug: true, name: true } },
            createdAt: true,
          },
        });
      }
      if (!s.tenant) return [];
      if (!hasPermissionForSession(s, "team.view")) {
        return reply.code(403).send({ error: "permission_denied" });
      }
      return prisma.user.findMany({
        where: {
          OR: [
            { tenantId: s.tenant.id },
            { memberships: { some: { tenantId: s.tenant.id } } },
          ],
        },
        orderBy: { email: "asc" },
        select: {
          id: true,
          email: true,
          name: true,
          platformAdmin: true,
          role: true,
          tenantId: true,
          tenant: { select: { slug: true, name: true } },
          memberships: {
            where: { tenantId: s.tenant.id },
            select: { role: true, isExternal: true },
          },
          createdAt: true,
        },
      });
    },
  );
}
