import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionPayload } from "./auth-memory.js";
import { getSession } from "./auth-memory.js";
import { SESSION_COOKIE_NAME } from "./session-cookie.js";

const BEARER = /^Bearer\s+(.+)$/i;

export function parseBearerToken(req: FastifyRequest): string | undefined {
  const h = req.headers.authorization;
  if (!h || typeof h !== "string") return undefined;
  const m = h.match(BEARER);
  return m?.[1]?.trim();
}

/** Önce `Authorization: Bearer`, yoksa HttpOnly `pointmor_session` çerezi (@fastify/cookie). */
export function parseSessionToken(req: FastifyRequest): string | undefined {
  const bearer = parseBearerToken(req);
  if (bearer) return bearer;
  const jar = (req as FastifyRequest & { cookies?: Record<string, string | undefined> })
    .cookies;
  const c = jar?.[SESSION_COOKIE_NAME];
  return typeof c === "string" && c.trim() ? c.trim() : undefined;
}

export async function authPreHandler(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = parseSessionToken(req);
  const session = getSession(token);
  if (!session) {
    await reply.code(401).send({ error: "unauthorized" });
    return;
  }
  req.authSession = session;
}

declare module "fastify" {
  interface FastifyRequest {
    authSession?: SessionPayload;
  }
}
