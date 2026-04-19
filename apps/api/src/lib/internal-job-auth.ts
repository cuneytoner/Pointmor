import { createHmac, timingSafeEqual } from "node:crypto";
import { getSecurityState } from "./security-state.js";

/** Sabit uzunluk olmayan stringler için timing-safe karşılaştırma. */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

/**
 * İsteğe bağlı replay azaltma: Unix saniye; sunucu saati ile fark en fazla skewSec.
 */
export function assertRecentTimestampHeader(
  raw: string | number | string[] | undefined,
  skewSec: number,
): boolean {
  if (raw === undefined) return false;
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = typeof s === "number" ? s : Number.parseInt(String(s).trim(), 10);
  if (!Number.isFinite(n)) return false;
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - n) <= skewSec;
}

function parseUnixTimestamp(raw: string | number | string[] | undefined): number | null {
  if (raw === undefined) return null;
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = typeof s === "number" ? s : Number.parseInt(String(s).trim(), 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseSignatureV1(raw: string | undefined): string | null {
  if (!raw) return null;
  const val = raw.trim();
  if (!val) return null;
  const prefixed = /^v1=([a-fA-F0-9]{64})$/u.exec(val);
  if (prefixed) return prefixed[1].toLowerCase();
  return /^[a-fA-F0-9]{64}$/u.test(val) ? val.toLowerCase() : null;
}

function hmacSha256Hex(secret: string, content: string): string {
  return createHmac("sha256", secret).update(content, "utf8").digest("hex");
}

export type HmacVerifyError =
  | "timestamp_invalid"
  | "signature_invalid"
  | "replay_detected"
  | "replay_store_unavailable";

/**
 * Webhook ve internal job ortak doğrulama: `HMAC-SHA256(secret, "<unix_ts>.<rawBody>")`,
 * replay anahtarı için paylaşımlı durum katmanı (Redis veya bellek).
 */
export async function verifyTimestampedHmacRequestAsync(input: {
  secret: string;
  timestampHeader: string | number | string[] | undefined;
  signatureHeader: string | undefined;
  rawBody: string;
  skewSec: number;
  replayKey?: string;
  /** Aynı anahtarın farklı uçlarda çakışmaması için (örn. internal-retention). */
  replayScope?: string;
}): Promise<{ ok: true } | { ok: false; error: HmacVerifyError }> {
  const ts = parseUnixTimestamp(input.timestampHeader);
  if (ts === null) return { ok: false, error: "timestamp_invalid" };
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > input.skewSec) return { ok: false, error: "timestamp_invalid" };
  const got = parseSignatureV1(input.signatureHeader);
  if (!got) return { ok: false, error: "signature_invalid" };
  const expected = hmacSha256Hex(input.secret, `${ts}.${input.rawBody}`);
  if (!timingSafeEqualString(got, expected)) return { ok: false, error: "signature_invalid" };

  const replayKey = input.replayKey?.trim() || `${ts}.${got}`;
  const scope = input.replayScope?.trim() || "hmac";
  const st = getSecurityState();
  const consumed = await st.consumeReplayKey(scope, replayKey, input.skewSec);
  if (consumed === "replay") return { ok: false, error: "replay_detected" };
  if (consumed === "unavailable") return { ok: false, error: "replay_store_unavailable" };
  return { ok: true };
}
