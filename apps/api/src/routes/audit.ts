import type { FastifyInstance } from "fastify";
import { authPreHandler } from "../lib/http-auth.js";
import { requirePlatformAdmin } from "../lib/guards.js";
import { prisma } from "../lib/prisma.js";

export async function registerAuditRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/admin/audit-logs",
    { preHandler: [authPreHandler, requirePlatformAdmin] },
    async () => {
      return prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    },
  );
}
