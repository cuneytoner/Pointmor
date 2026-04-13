export type LocaleCode = "en" | "tr" | "es" | "de";

export const SUPPORTED_LOCALES: LocaleCode[] = ["en", "tr", "es", "de"];

export function isLocaleCode(v: string | null): v is LocaleCode {
  return v === "en" || v === "tr" || v === "es" || v === "de";
}
