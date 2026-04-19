import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { SessionPayload } from "./session-types.js";
import { getSecurityState } from "./security-state.js";

const VERSION = 1;

type SignedEnvelope = {
  v: number;
  kid: string;
  iat: number;
  exp: number;
  jti: string;
  payload: SessionPayload;
};

type SessionSigningKey = {
  kid: string;
  secret: string;
};

function parseSigningKeys(): SessionSigningKey[] {
  const keysRaw = process.env.SESSION_SIGNING_KEYS?.trim();
  if (!keysRaw) {
    const single =
      process.env.SESSION_SIGNING_SECRET?.trim() ||
      process.env.COOKIE_SECRET?.trim() ||
      "";
    if (!single) {
      throw new Error(
        "SESSION_SIGNING_KEYS veya SESSION_SIGNING_SECRET/COOKIE_SECRET tanımlı olmalı.",
      );
    }
    return [{ kid: "v1", secret: single }];
  }

  const keys = keysRaw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [kid, secret] = item.split(":", 2).map((x) => x?.trim() ?? "");
      if (!kid || !secret) return null;
      return { kid, secret };
    })
    .filter((v): v is SessionSigningKey => v !== null);
  if (keys.length === 0) {
    throw new Error("SESSION_SIGNING_KEYS geçersiz; format `kid:secret,kid2:secret2` olmalı.");
  }
  return keys;
}

function activeSigningKey(): SessionSigningKey {
  const keys = parseSigningKeys();
  const preferred = process.env.SESSION_SIGNING_ACTIVE_KID?.trim();
  if (!preferred) return keys[0];
  return keys.find((k) => k.kid === preferred) ?? keys[0];
}

function keyByKid(kid: string): SessionSigningKey | null {
  const keys = parseSigningKeys();
  return keys.find((k) => k.kid === kid) ?? null;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = 4 - (s.length % 4);
  const b64 = (pad === 4 ? s : s + "=".repeat(pad))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

function signPayload(envelope: SignedEnvelope, secret: string): string {
  const canonical = JSON.stringify(envelope);
  const mac = createHmac("sha256", secret)
    .update(canonical, "utf8")
    .digest();
  return `${b64url(Buffer.from(canonical, "utf8"))}.${b64url(mac)}`;
}

function sessionTtlSeconds(): number {
  const ttlSec = Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 7);
  return Number.isFinite(ttlSec) && ttlSec > 0 ? ttlSec : 60 * 60 * 24 * 7;
}

export function signedIssueSession(payload: SessionPayload): string {
  const now = Math.floor(Date.now() / 1000);
  const ttlSec = sessionTtlSeconds();
  const key = activeSigningKey();
  const envelope: SignedEnvelope = {
    v: VERSION,
    kid: key.kid,
    iat: now,
    exp: now + ttlSec,
    jti: randomUUID(),
    payload,
  };
  return signPayload(envelope, key.secret);
}

function parseVerifiedEnvelope(token: string | undefined): SignedEnvelope | null {
  if (!token || !token.includes(".")) return null;
  const [encPart, sigPart] = token.split(".", 2);
  if (!encPart || !sigPart) return null;
  let encBuf: Buffer;
  let sigBuf: Buffer;
  try {
    encBuf = b64urlDecode(encPart);
    sigBuf = b64urlDecode(sigPart);
  } catch {
    return null;
  }
  let envelope: SignedEnvelope;
  try {
    envelope = JSON.parse(encBuf.toString("utf8")) as SignedEnvelope;
  } catch {
    return null;
  }
  if (envelope.v !== VERSION || typeof envelope.jti !== "string" || typeof envelope.kid !== "string") {
    return null;
  }
  const key = keyByKid(envelope.kid);
  if (!key) return null;
  const expected = createHmac("sha256", key.secret)
    .update(encBuf)
    .digest();
  if (expected.length !== sigBuf.length || !timingSafeEqual(expected, sigBuf)) {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof envelope.exp !== "number" || envelope.exp < now) return null;
  if (!envelope.payload?.user?.id) return null;
  return envelope;
}

export async function signedGetSession(token: string | undefined): Promise<SessionPayload | null> {
  const envelope = parseVerifiedEnvelope(token);
  if (!envelope) return null;
  const st = getSecurityState();
  if (await st.isAdminJtiRevoked(envelope.jti)) return null;
  return envelope.payload;
}

export async function signedRevokeSession(token: string | undefined): Promise<void> {
  const envelope = parseVerifiedEnvelope(token);
  if (!envelope) return;
  const ttl = Math.max(1, envelope.exp - Math.floor(Date.now() / 1000));
  await getSecurityState().markAdminJtiRevoked(envelope.jti, ttl);
}

export function useSignedSessions(): boolean {
  const mode = process.env.SESSION_BACKEND?.trim().toLowerCase();
  if (mode === "signed") return true;
  if (mode === "memory") return false;
  return process.env.NODE_ENV === "production";
}
