/** Birleşik `className` — ek bağımlılık yok. */
export function cx(...parts: Array<string | undefined | false | null>): string {
  return parts.filter(Boolean).join(" ");
}
