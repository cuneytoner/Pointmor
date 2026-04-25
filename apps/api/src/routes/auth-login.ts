import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { compare } from "bcryptjs";
import type { SessionPayload } from "../lib/auth-memory.js";
import { issueSession } from "../lib/auth-memory.js";
import { buildSessionMembership } from "../lib/session-branch-membership.js";
import { prisma } from "../lib/prisma.js";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "../lib/session-cookie.js";
import { parseWithSchema, z } from "../lib/validation.js";

const loginBodySchema = z.object({
  email: z.string().trim().email("Geçerli e-posta gerekli."),
  password: z.string().trim().min(4, "Şifre en az 4 karakter."),
});

function includeTokenInLoginResponse(): boolean {
  const raw = process.env.ADMIN_LOGIN_INCLUDE_TOKEN?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return process.env.NODE_ENV !== "production" && process.env.APP_ENV !== "demo";
}

export async function registerAuthLogin(app: FastifyInstance): Promise<void> {
  await app.register(
    async function scoped(f) {
      await f.register(rateLimit, {
        max: 25,
        timeWindow: "1 minute",
      });

      f.post("/auth/login", async (req, reply) => {
        const exposeToken = includeTokenInLoginResponse();
        const parsed = parseWithSchema(loginBodySchema, req.body);
        if (!parsed.ok) {
          return reply.code(400).send({
            error: parsed.error,
            message: parsed.message,
          });
        }
        const email = parsed.data.email.toLowerCase();
        const password = parsed.data.password;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              include: { tenant: true },
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (!user || !(await compare(password, user.passwordHash))) {
          return reply.code(401).send({
            error: "invalid_credentials",
            message: "E-posta veya şifre hatalı.",
          });
        }

        if (user.platformAdmin) {
          const payload: SessionPayload = {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              platformAdmin: true,
            },
            tenant: null,
            membership: { role: "platform_admin" },
          };
          const token = issueSession(payload);
          reply.setCookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
          return exposeToken
            ? { token, membership: payload.membership }
            : { membership: payload.membership };
        }

        // TenantMembership is the source of truth for tenant access.
        const effectiveMemberships =
          user.memberships.length > 0
            ? user.memberships
            : [];

        if (effectiveMemberships.length === 0) {
          return reply.code(403).send({
            error: "no_tenant_membership",
            message: "Kiracı üyeliği yok.",
          });
        }

        const primary = effectiveMemberships[0];
        const membership = await buildSessionMembership(
          user.id,
          primary.tenant.id,
          primary.role,
          primary.isExternal,
        );
        const payload: SessionPayload = {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            platformAdmin: false,
          },
          tenant: {
            id: primary.tenant.id,
            slug: primary.tenant.slug,
            name: primary.tenant.name,
          },
          membership,
          memberships: await Promise.all(
            effectiveMemberships.map(async (m) => ({
              tenant: {
                id: m.tenant.id,
                slug: m.tenant.slug,
                name: m.tenant.name,
              },
              membership: await buildSessionMembership(user.id, m.tenant.id, m.role, m.isExternal),
            })),
          ),
        };
        const token = issueSession(payload);
        reply.setCookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());

        return exposeToken
          ? { token, tenant: payload.tenant, membership: payload.membership }
          : { tenant: payload.tenant, membership: payload.membership };
      });
    },
  );
}
