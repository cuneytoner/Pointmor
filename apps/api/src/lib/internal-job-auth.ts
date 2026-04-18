import { timingSafeEqual } from "node:crypto";

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
