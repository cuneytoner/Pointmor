import type { LocaleCode } from "../i18n/locale";

type LanguageFlagProps = {
  code: LocaleCode;
};

function Star({ fill = "#fff" }: { fill?: string }) {
  return (
    <polygon
      points="15.8 5.4 16.3 6.8 17.8 6.8 16.6 7.7 17.1 9.1 15.8 8.2 14.6 9.1 15.1 7.7 13.9 6.8 15.4 6.8"
      fill={fill}
    />
  );
}

export function LanguageFlag({ code }: LanguageFlagProps) {
  if (code === "tr") {
    return (
      <svg className="lang-selector__flag" viewBox="0 0 24 16" aria-hidden="true" focusable="false">
        <rect width="24" height="16" rx="2" fill="#e30a17" />
        <circle cx="10" cy="8" r="4" fill="#fff" />
        <circle cx="11.2" cy="8" r="3.2" fill="#e30a17" />
        <Star />
      </svg>
    );
  }

  if (code === "es") {
    return (
      <svg className="lang-selector__flag" viewBox="0 0 24 16" aria-hidden="true" focusable="false">
        <rect width="24" height="16" rx="2" fill="#aa151b" />
        <rect y="4" width="24" height="8" fill="#f1bf00" />
        <rect x="5" y="6.4" width="2.1" height="3.2" rx="0.35" fill="#c60b1e" />
      </svg>
    );
  }

  if (code === "de") {
    return (
      <svg className="lang-selector__flag" viewBox="0 0 24 16" aria-hidden="true" focusable="false">
        <rect width="24" height="16" rx="2" fill="#000" />
        <rect y="5.33" width="24" height="5.34" fill="#dd0000" />
        <rect y="10.67" width="24" height="5.33" fill="#ffce00" />
      </svg>
    );
  }

  return (
    <svg className="lang-selector__flag" viewBox="0 0 24 16" aria-hidden="true" focusable="false">
      <rect width="24" height="16" rx="2" fill="#012169" />
      <path d="M0 0h3.2L24 13.85V16h-3.2L0 2.15V0Z" fill="#fff" />
      <path d="M24 0h-3.2L0 13.85V16h3.2L24 2.15V0Z" fill="#fff" />
      <path d="M0 0h1.8L24 14.8V16h-1.8L0 1.2V0Z" fill="#c8102e" />
      <path d="M24 0h-1.8L0 14.8V16h1.8L24 1.2V0Z" fill="#c8102e" />
      <path d="M10 0h4v16h-4V0Z" fill="#fff" />
      <path d="M0 6h24v4H0V6Z" fill="#fff" />
      <path d="M10.8 0h2.4v16h-2.4V0Z" fill="#c8102e" />
      <path d="M0 6.8h24v2.4H0V6.8Z" fill="#c8102e" />
    </svg>
  );
}
