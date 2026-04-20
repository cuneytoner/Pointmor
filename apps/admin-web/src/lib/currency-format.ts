const DEFAULT_CURRENCY_CODE = "EUR";

function normalizeCurrencyCode(currency: string | null | undefined): string {
  const raw = (currency ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(raw) ? raw : DEFAULT_CURRENCY_CODE;
}

export function formatCurrencyFromMajor(
  amount: number,
  currency: string | null | undefined,
  localeTag: string,
): string {
  const code = normalizeCurrencyCode(currency);
  try {
    return new Intl.NumberFormat(localeTag, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const value = new Intl.NumberFormat(localeTag, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${value} ${code}`;
  }
}

export function formatCurrencyFromMinor(
  minor: number,
  currency: string | null | undefined,
  localeTag: string,
): string {
  return formatCurrencyFromMajor(minor / 100, currency, localeTag);
}
