/**
 * Twilio Verify / SMS için E.164 (+countrycode...) beklenir.
 */
export function normalizeToE164(raw: string): { ok: true; e164: string } | { ok: false } {
  const s = raw.trim().replace(/[\s-]/g, "");
  if (!s) return { ok: false };
  if (/^\+[1-9]\d{7,14}$/.test(s)) return { ok: true, e164: s };
  return { ok: false };
}
