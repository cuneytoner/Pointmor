import { isLocaleCode, type LocaleCode } from "../i18n/locale";

/** Tenant bazlı dil tercihi (PWA + public menü). */
export function tenantLanguageStorageKey(tenantSlug: string): string {
  return `pointmor.lang.${tenantSlug}`;
}

function normalizeLang(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Öncelik: URL `lang` → localStorage (tenant) → navigator.languages → varsayılan.
 * Desteklenmeyen dil → defaultLanguage.
 */
export function resolveLanguage(input: {
  langParam?: string | null;
  tenantSlug: string;
  supportedLanguages: string[];
  defaultLanguage: string;
  navigatorLanguages?: readonly string[];
}): string {
  let fromStorage: string | null = null;
  try {
    if (typeof localStorage !== "undefined") {
      fromStorage = localStorage.getItem(tenantLanguageStorageKey(input.tenantSlug));
    }
  } catch {
    /* ignore */
  }

  const canon = new Map<string, string>();
  for (const l of input.supportedLanguages) {
    const n = normalizeLang(l);
    if (n) canon.set(n, l);
  }

  const pickSupported = (raw: string): string | null => {
    const base = normalizeLang(raw.split("-")[0] ?? raw);
    if (!base) return null;
    if (canon.has(base)) return canon.get(base)!;
    return null;
  };

  const seq: string[] = [];
  if (input.langParam) seq.push(input.langParam);
  if (fromStorage) seq.push(fromStorage);
  if (input.navigatorLanguages) {
    for (const l of input.navigatorLanguages) {
      if (l) seq.push(l);
    }
  }

  for (const c of seq) {
    const p = pickSupported(c);
    if (p) return p;
  }

  const def = pickSupported(input.defaultLanguage);
  if (def) return def;
  return input.supportedLanguages[0] ?? "en";
}

/** Uygulama i18n locale kodlarıyla kesişim — UI çevirileri için. */
export function resolveUiLocale(
  resolvedLang: string,
  fallback: LocaleCode = "en",
): LocaleCode {
  const base = normalizeLang(resolvedLang.split("-")[0] ?? resolvedLang);
  if (isLocaleCode(base)) return base;
  return fallback;
}
