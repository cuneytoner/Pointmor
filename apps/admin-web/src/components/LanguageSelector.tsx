import {
  useLocale,
  useLocaleActions,
  SUPPORTED_LOCALES,
} from "../contexts/LocaleContext";
import type { LocaleCode } from "../i18n/locale";
import { useTranslation } from "../hooks/useTranslation";
import { LanguageFlag } from "./LanguageFlag";

function shortLabel(code: LocaleCode): string {
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
              <LanguageFlag code={code} />
              <span className="lang-selector__short">{shortLabel(code)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
