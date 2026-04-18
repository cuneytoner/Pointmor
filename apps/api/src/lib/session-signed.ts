import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { SessionPayload } from "./session-types.js";

const VERSION = 1;
const MAX_REVOKED = 5000;
const revokedJtis: string[] = [];

type SignedEnvelope = {
  v: number;
  iat: number;
  exp: number;
  jti: string;
  payload: SessionPayload;
};

function signingSecret(): string {
  const s =
    process.env.SESSION_SIGNING_SECRET?.trim() ||
    process.env.COOKIE_SECRET?.trim() ||
    "";
  if (!s) {
    throw new Error(
      "SESSION_SIGNING_SECRET veya COOKIE_SECRET tanımlı olmalı (imzalı oturum).",
    );
  }
  return s;
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

function signPayload(envelope: SignedEnvelope): string {
  const canonical = JSON.stringify(envelope);
  const mac = createHmac("sha256", signingSecret())
    .update(canonical, "utf8")
    .digest();
  return `${b64url(Buffer.from(canonical, "utf8"))}.${b64url(mac)}`;
}

export function signedIssueSession(payload: SessionPayload): string {
  const now = Math.floor(Date.now() / 1000);
  const ttlSec = Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 7);
  const envelope: SignedEnvelope = {
    v: VERSION,
    iat: now,
    exp: now + ttlSec,
    jti: randomUUID(),
    payload,
  };
  return signPayload(envelope);
}

export function signedGetSession(token: string | undefined): SessionPayload | null {
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
  const expected = createHmac("sha256", signingSecret())
    .update(encBuf)
    .digest();
  if (expected.length !== sigBuf.length || !timingSafeEqual(expected, sigBuf)) {
    return null;
  }
  let envelope: SignedEnvelope;
  try {
    envelope = JSON.parse(encBuf.toString("utf8")) as SignedEnvelope;
  } catch {
    return null;
  }
  if (envelope.v !== VERSION || typeof envelope.jti !== "string") return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof envelope.exp !== "number" || envelope.exp < now) return null;
  if (revokedJtis.includes(envelope.jti)) return null;
  if (!envelope.payload?.user?.id) return null;
  return envelope.payload;
}

export function signedRevokeSession(token: string | undefined): void {
  if (!token || !token.includes(".")) return;
  const [encPart] = token.split(".", 2);
  if (!encPart) return;
  let encBuf: Buffer;
  try {
    encBuf = b64urlDecode(encPart);
  } catch {
    return;
  }
  let envelope: SignedEnvelope;
  try {
    envelope = JSON.parse(encBuf.toString("utf8")) as SignedEnvelope;
  } catch {
    return;
  }
  if (typeof envelope.jti === "string" && envelope.jti) {
    revokedJtis.push(envelope.jti);
    while (revokedJtis.length > MAX_REVOKED) {
      revokedJtis.shift();
    }
  }
}

export function useSignedSessions(): boolean {
  const mode = process.env.SESSION_BACKEND?.trim().toLowerCase();
  if (mode === "signed") return true;
  if (mode === "memory") return false;
  return process.env.NODE_ENV === "production";
}
