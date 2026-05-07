let didLogDefaultDevApiBase = false;

export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
  if (raw) return raw.replace(/\/$/, "");
  if (import.meta.env.DEV) {
    if (!didLogDefaultDevApiBase) {
      didLogDefaultDevApiBase = true;
      console.warn(
        "[Pointmor Admin] VITE_API_BASE_URL tanımsız; http://127.0.0.1:3000 kullanılıyor. Kalıcı çözüm: apps/admin-web/.env.local içinde VITE_API_BASE_URL=http://127.0.0.1:3000",
      );
    }
    return "http://127.0.0.1:3000";
  }
  return "";
}

export function buildAuthHeaders(token?: string | null): Record<string, string> | undefined {
  const tok = token?.trim();
  if (!tok) return undefined;
  return { Authorization: `Bearer ${tok}` };
}
