import { useCallback } from "react";
import { useLocale } from "../contexts/LocaleContext";
import { translate } from "../i18n/bundles";

/**
 * Central `t()` for UI copy. Missing keys fall back to English, then to the key path.
 * Use `{{param}}` in JSON — never concatenate translated strings with `+`.
 */
export function useTranslation() {
  const locale = useLocale();
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    [locale],
  );
  return { t, locale };
}
