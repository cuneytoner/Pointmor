export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
  if (raw) return raw.replace(/\/$/, "");
  if (import.meta.env.DEV) {
    console.warn(
      "[Pointmor Admin] VITE_API_BASE_URL tanımsız; http://127.0.0.1:3000 kullanılıyor.",
    );
    return "http://127.0.0.1:3000";
  }
  return "";
}
