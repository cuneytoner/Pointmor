import type { LocaleCode } from "../i18n/locale";

/**
 * Pazarlama sitesi tabanı. Üretimde gerçek domain; geliştirmede placeholder.
 * Kayıt akışı: ödeme veya haftalık sınırlı ücretsiz — seçim marketing sayfasında.
 */
export function getMarketingBaseUrl(): string {
  const raw = (import.meta.env.VITE_MARKETING_BASE_URL ?? "").trim();
  if (raw) return raw.replace(/\/$/, "");
  if (import.meta.env.DEV) {
    return "https://example.com";
  }
  return "";
}

/** Hesap oluştur: marketing kayıt sayfası; admin girişinden geldiği query ile izlenebilir. */
export function buildMarketingSignupUrl(locale: LocaleCode): string {
  const base = getMarketingBaseUrl();
  const path = "/signup";
  const q = new URLSearchParams({
    utm_source: "pointmor_admin",
    utm_medium: "login",
    entry: "create_account",
    locale,
    /** Marketing’de A/B: ücretli ödeme vs haftalık ücretsiz kota — landing’de sunulur */
    funnel: "checkout_or_free_week",
  });
  return base ? `${base}${path}?${q.toString()}` : `#`;
}

export function buildMarketingForgotPasswordUrl(locale: LocaleCode): string {
  const base = getMarketingBaseUrl();
  const path = "/forgot-password";
  const q = new URLSearchParams({
    utm_source: "pointmor_admin",
    utm_medium: "login",
    entry: "forgot_password",
    locale,
  });
  return base ? `${base}${path}?${q.toString()}` : `#`;
}
