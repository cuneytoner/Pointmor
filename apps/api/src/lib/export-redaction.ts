/**
 * Dışa aktarım için JSON redaksiyonu — ham döküm değil; PII ve sağlayıcı ipuçlarını azaltır.
 */

const SENSITIVE_KEY =
  /(phone|mobile|msisdn|e164|email|mail|twilio|sid|provider|token|secret|password|authorization|apikey|api_key)/i;

function maskPhoneDigits(s: string): string {
  const d = s.replace(/\D/g, "");
  if (d.length < 4) return "[masked]";
  return `***${d.slice(-2)}`;
}

function maskEmail(s: string): string {
  const at = s.indexOf("@");
  if (at <= 0) return "[masked]";
  return `${s[0] ?? "?"}***@${s.slice(at + 1)}`;
}

function redactScalarString(s: string): string {
  const t = s.trim();
  if (/^\+?\d[\d\s\-().]{5,}$/.test(t)) return maskPhoneDigits(t);
  if (t.includes("@") && t.length > 4) return maskEmail(t);
  return s;
}

export function redactJsonForExport(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactScalarString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(redactJsonForExport);
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (SENSITIVE_KEY.test(k)) {
        if (typeof v === "string") out[k] = redactScalarString(v);
        else if (v !== null && v !== undefined) out[k] = "[redacted]";
        else out[k] = v;
      } else {
        out[k] = redactJsonForExport(v);
      }
    }
    return out;
  }
  return value;
}

const CSV_PAYLOAD_MAX = 900;

/**
 * CSV hücresi için: redakte + boyut sınırı (tam JSON dökümü değil).
 */
export function summarizePayloadForCsv(payload: unknown): string {
  const redacted = redactJsonForExport(payload ?? {});
  let s: string;
  try {
    s = JSON.stringify(redacted);
  } catch {
    s = "[unserializable]";
  }
  if (s.length <= CSV_PAYLOAD_MAX) return s;
  return `${s.slice(0, CSV_PAYLOAD_MAX)}…`;
}

/**
 * PDF satırı için kısa özet (insan okunur; anahtar sayısı + örnek alanlar).
 */
export function summarizePayloadForPdfLine(payload: unknown): string {
  const redacted = redactJsonForExport(payload ?? {});
  if (redacted === null || typeof redacted !== "object" || Array.isArray(redacted)) {
    try {
      const t = JSON.stringify(redacted);
      return t.length > 160 ? `${t.slice(0, 160)}…` : t;
    } catch {
      return "[summary]";
    }
  }
  const keys = Object.keys(redacted as Record<string, unknown>);
  if (keys.length === 0) return "{}";
  const sample = keys.slice(0, 4).map((k) => {
    const v = (redacted as Record<string, unknown>)[k];
    const vs =
      typeof v === "string"
        ? v.length > 32
          ? `${v.slice(0, 32)}…`
          : v
        : JSON.stringify(v);
    return `${k}=${vs}`;
  });
  const more = keys.length > 4 ? ` (+${keys.length - 4} alan)` : "";
  return `${sample.join(", ")}${more}`;
}
