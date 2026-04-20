import { getApiBaseUrl } from "./api-base";
import type { LocaleCode } from "../i18n/locale";

export async function downloadComplianceExport(
  token: string,
  pathWithQuery: string,
  filename: string,
  locale?: LocaleCode,
): Promise<void> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  const requestUrl = new URL(`${base}${path}`);
  if (locale) requestUrl.searchParams.set("lang", locale);
  const res = await fetch(requestUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (!res.ok) throw new Error("export_failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
