export type LocaleCode = "en" | "tr" | "es" | "de" | "zh";

export const SUPPORTED_LOCALES: LocaleCode[] = ["en", "tr", "es", "de", "zh"];

export function isLocaleCode(v: string | null): v is LocaleCode {
  return (
    v === "en" ||
    v === "tr" ||
    v === "es" ||
    v === "de" ||
    v === "zh"
  );
}
