import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getApiBaseUrl } from "../lib/api-base";
import { useTranslation } from "../hooks/useTranslation";

const STORAGE_KEY = "pointmor.activeBranchId";

/**
 * Kiracı üst çubuğu — çok şubede analiz / önizleme bağlamı (header `x-pointmor-active-branch`).
 */
export function LocationBranchSwitcher() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!token?.trim()) return;
    let cancelled = false;
    const base = getApiBaseUrl();
    void fetch(`${base}/cashier/branches`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(rows)
          ? (rows as Array<{ id: string; name: string }>)
          : [];
        setBranches(list);
        let saved = "";
        try {
          saved = localStorage.getItem(STORAGE_KEY) ?? "";
        } catch {
          saved = "";
        }
        if (saved && list.some((b) => b.id === saved)) {
          setValue(saved);
        } else if (list.length === 1) {
          const only = list[0]!;
          setValue(only.id);
          try {
            localStorage.setItem(STORAGE_KEY, only.id);
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        if (!cancelled) setBranches([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (branches.length < 2) return null;

  return (
    <label className="admin-app__location-switcher">
      <span className="admin-app__location-switcher-label">{t("shell.activeLocation")}</span>
      <select
        className="admin-app__location-select"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          try {
            localStorage.setItem(STORAGE_KEY, v);
          } catch {
            /* ignore */
          }
          window.dispatchEvent(new CustomEvent("pointmor-active-branch"));
        }}
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </label>
  );
}
