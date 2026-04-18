import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "pointmor_admin_token";

export type AuthContextValue = {
  token: string | null;
  setToken: (t: string | null) => void;
  refreshKey: number;
  bumpRefresh: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const cookiesOnlyAdminSession =
  import.meta.env.VITE_ADMIN_SESSION_COOKIES_ONLY === "true";

function readToken(): string | null {
  if (cookiesOnlyAdminSession) return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(readToken);
  const [refreshKey, setRefreshKey] = useState(0);

  const setToken = useCallback((t: string | null) => {
    setTokenState(t);
    if (cookiesOnlyAdminSession) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      if (t) localStorage.setItem(STORAGE_KEY, t);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const bumpRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (cookiesOnlyAdminSession) return;
    const u = new URL(window.location.href);
    const q = u.searchParams.get("token");
    if (q?.trim()) {
      setToken(q.trim());
      u.searchParams.delete("token");
      const next = `${u.pathname}${u.search}${u.hash}`;
      window.history.replaceState({}, "", next);
    }
  }, [setToken]);

  const value = useMemo(
    () => ({ token, setToken, refreshKey, bumpRefresh }),
    [token, setToken, refreshKey, bumpRefresh],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
