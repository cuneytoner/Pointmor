export function formatCountForLocale(value: number, localeTag: string): string {
  return new Intl.NumberFormat(localeTag, {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPointsForLocale(value: number, localeTag: string): string {
  return new Intl.NumberFormat(localeTag, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}
