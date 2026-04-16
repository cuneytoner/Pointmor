import type { StoreMessagingSettings } from "../../generated/prisma/client.js";

/**
 * `quietHoursStart` / `quietHoursEnd` kiracı `timezone` içinde HH:mm (24s).
 * Geceyi aşan aralık desteklenir (örn. 22:00–08:00).
 */
export function isWithinQuietHours(
  settings: Pick<
    StoreMessagingSettings,
    "quietHoursStart" | "quietHoursEnd" | "timezone"
  >,
  now: Date = new Date(),
): boolean {
  const start = settings.quietHoursStart?.trim();
  const end = settings.quietHoursEnd?.trim();
  if (!start || !end) return false;

  const tz = settings.timezone?.trim() || "UTC";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const cur = h * 60 + m;

  const parseHm = (s: string): number | null => {
    const [hh, mm] = s.split(":").map((x) => Number(x.trim()));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return hh * 60 + mm;
  };

  const a = parseHm(start);
  const b = parseHm(end);
  if (a === null || b === null) return false;
  if (a === b) return false;
  if (a < b) return cur >= a && cur < b;
  return cur >= a || cur < b;
}
