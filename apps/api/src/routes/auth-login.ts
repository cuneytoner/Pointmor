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
          include: { tenant: true },
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

        if (!user.tenantId || !user.tenant) {
          return reply.code(403).send({
            error: "no_tenant_membership",
            message: "Kiracı üyeliği yok.",
          });
        }

        const membership = await buildSessionMembership(
          user.id,
          user.tenant.id,
          user.role,
        );
        const payload: SessionPayload = {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            platformAdmin: false,
          },
          tenant: {
            id: user.tenant.id,
            slug: user.tenant.slug,
            name: user.tenant.name,
          },
          membership,
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
