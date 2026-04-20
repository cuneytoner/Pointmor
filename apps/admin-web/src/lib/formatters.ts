import type { LocaleCode } from "../i18n/locale";
import { toIntlLocale } from "./locale-intl";

type NumericInput = number | string | null | undefined;

function resolveLocale(locale?: LocaleCode): string {
  return locale ? toIntlLocale(locale) : "tr-TR";
}

function toNumber(value: NumericInput): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function formatCount(value: NumericInput, locale?: LocaleCode): string {
  return new Intl.NumberFormat(resolveLocale(locale), {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

export function formatPoints(value: NumericInput, locale?: LocaleCode): string {
  const n = toNumber(value);
  const isInteger = Number.isInteger(n);
  return new Intl.NumberFormat(resolveLocale(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: isInteger ? 0 : 2,
  }).format(n);
}

export function formatCurrencyValue(value: NumericInput, locale?: LocaleCode): string {
  return new Intl.NumberFormat(resolveLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

export function formatPercent(value: number | null, locale?: LocaleCode): string {
  if (value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(resolveLocale(locale), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value * 100) + "%";
}

export function formatDateLabel(iso: string, locale?: LocaleCode): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(resolveLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTimeLabel(iso: string, locale?: LocaleCode): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(resolveLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDateRangeLabel(startIso: string, endIso: string, locale?: LocaleCode): string {
  return `${formatDateLabel(startIso, locale)} – ${formatDateLabel(endIso, locale)}`;
}
