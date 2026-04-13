import type { LocaleCode } from "../i18n/locale";

/** BCP 47 tags for `Intl` (dates, numbers). */
export const LOCALE_BCP47: Record<LocaleCode, string> = {
  en: "en-US",
  tr: "tr-TR",
  es: "es-ES",
  de: "de-DE",
  zh: "zh-CN",
};

export function toIntlLocale(locale: LocaleCode): string {
  return LOCALE_BCP47[locale];
}

/** Geçmiş bir ISO zamanı için göreli ifade (ör. "2 minutes ago"). */
export function formatRelativePast(iso: string, locale: LocaleCode): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  const tag = toIntlLocale(locale);
  const rtf = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });
  if (diffSec < 45) return rtf.format(-Math.max(1, diffSec), "second");
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return rtf.format(-diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return rtf.format(-diffDay, "day");
  return new Date(iso).toLocaleString(tag);
}
