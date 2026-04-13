import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type LocaleCode,
  isLocaleCode,
} from "../i18n/locale";

const STORAGE_KEY = "pointmor_locale";

export type { LocaleCode } from "../i18n/locale";
export { SUPPORTED_LOCALES } from "../i18n/locale";

type LocaleContextValue = {
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readInitial(): LocaleCode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && isLocaleCode(v)) return v;
  } catch {
    /* ignore */
  }
  return "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(readInitial);

  const setLocale = useCallback((l: LocaleCode) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleCode {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale requires LocaleProvider");
  return ctx.locale;
}

export function useLocaleActions(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocaleActions requires LocaleProvider");
  return ctx;
}
