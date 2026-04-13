import {
  useLocale,
  useLocaleActions,
  SUPPORTED_LOCALES,
} from "../contexts/LocaleContext";
import type { LocaleCode } from "../i18n/locale";
import { useTranslation } from "../hooks/useTranslation";

/** Görsel tutarlılık için bölgesel bayrak (emoji). */
const LOCALE_FLAGS: Record<LocaleCode, string> = {
  en: "🇬🇧",
  tr: "🇹🇷",
  es: "🇪🇸",
  de: "🇩🇪",
  zh: "🇨🇳",
};

function shortLabel(code: LocaleCode): string {
  if (code === "zh") return "中文";
  return code.toUpperCase();
}

type LanguageSelectorProps = {
  /** `topbar`: koyu üst çubuk; `login`: açık kart arka planı */
  variant: "topbar" | "login";
};

export function LanguageSelector({ variant }: LanguageSelectorProps) {
  const locale = useLocale();
  const { setLocale } = useLocaleActions();
  const { t } = useTranslation();

  return (
    <div
      className={`lang-selector lang-selector--${variant}`}
      role="group"
      aria-label={t("shell.language")}
    >
      <div className="lang-selector__track">
        {SUPPORTED_LOCALES.map((code) => {
          const active = locale === code;
          const fullName = t(`lang.${code}`);
          return (
            <button
              key={code}
              type="button"
              className={`lang-selector__pill${active ? " lang-selector__pill--active" : ""}`}
              onClick={() => setLocale(code)}
              title={fullName}
              aria-label={fullName}
              aria-pressed={active}
            >
              <span className="lang-selector__flag" aria-hidden>
                {LOCALE_FLAGS[code]}
              </span>
              <span className="lang-selector__short">{shortLabel(code)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
