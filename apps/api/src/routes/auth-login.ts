import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { compare } from "bcryptjs";
import type { SessionPayload } from "../lib/auth-memory.js";
import { issueSession } from "../lib/auth-memory.js";
import { prisma } from "../lib/prisma.js";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "../lib/session-cookie.js";

type LoginBody = {
  email?: string;
  password?: string;
  tenantSlug?: string;
};

export async function registerAuthLogin(app: FastifyInstance): Promise<void> {
  await app.register(
    async function scoped(f) {
      await f.register(rateLimit, {
        max: 25,
        timeWindow: "1 minute",
      });

      f.post<{ Body: LoginBody }>("/auth/login", async (req, reply) => {
        const body = req.body ?? {};
        const email = (body.email ?? "").trim().toLowerCase();
        const password = (body.password ?? "").trim();
        const tenantSlug = (body.tenantSlug ?? "").trim();

        if (password.length < 4) {
          return reply.code(401).send({
            error: "invalid_credentials",
            message: "Şifre en az 4 karakter.",
          });
        }

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
          return {
            token,
            membership: payload.membership,
          };
        }

        if (!user.tenantId || !user.tenant) {
          return reply.code(403).send({
            error: "no_tenant_membership",
            message: "Kiracı üyeliği yok.",
          });
        }

        if (tenantSlug && tenantSlug !== user.tenant.slug) {
          return reply.code(403).send({
            error: "tenant_slug_mismatch",
            message: "Kiracı kodu hesapla eşleşmiyor.",
          });
        }

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
          membership: { role: user.role },
        };
        const token = issueSession(payload);
        reply.setCookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());

        return {
          token,
          tenant: payload.tenant,
          membership: payload.membership,
        };
      });
    },
  );
}
