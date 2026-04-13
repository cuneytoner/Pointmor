import type { MessageTree } from "./resolve";
import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import tr from "./locales/tr.json";
import type { LocaleCode } from "./locale";
import { getMessage, interpolate } from "./resolve";

export const bundles: Record<LocaleCode, MessageTree> = {
  en: en as MessageTree,
  tr: tr as MessageTree,
  es: es as MessageTree,
  de: de as MessageTree,
};

export function translate(
  locale: LocaleCode,
  key: string,
  params?: Record<string, string | number>,
): string {
  const fromLocale = getMessage(bundles[locale], key);
  const fromEn = getMessage(bundles.en, key);
  const raw = fromLocale ?? fromEn ?? key;
  return interpolate(raw, params);
}
