import { z, type ZodType } from "zod";

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

export type ValidationOk<T> = { ok: true; data: T };
export type ValidationErr = { ok: false; error: string; message?: string };

/** Schema-first parse: route'larda ortak hata formatı için. */
export function parseWithSchema<T>(schema: ZodType<T>, input: unknown): ValidationOk<T> | ValidationErr {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const first = parsed.error.issues[0];
  return {
    ok: false,
    error: "validation_error",
    message: first?.message ?? "Geçersiz istek gövdesi.",
  };
}

export { z };
