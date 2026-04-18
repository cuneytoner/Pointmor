/** Merkezi doğrulama için ince katman; ileride Zod/Valibot ile genişletilebilir. */

export function bodyObject(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

export function optionalTrimmedString(
  body: unknown,
  key: string,
): string | undefined {
  const o = bodyObject(body);
  if (!o) return undefined;
  const v = o[key];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t || undefined;
}

export function requiredTrimmedString(
  body: unknown,
  key: string,
): string | null {
  const t = optionalTrimmedString(body, key);
  return t ?? null;
}
