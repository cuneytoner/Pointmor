/**
 * Saf yardımcılar — moving average, düşüş tespiti, ISO hafta anahtarı (spam önleme).
 */

/** Önceki döneme göre %20+ düşüş (eşik: current < prev * (1 - dropFraction)). */
export function detectRelativeDrop(
  current: number,
  previous: number,
  opts: { minPrevious: number; dropFraction: number },
): boolean {
  if (previous < opts.minPrevious) return false;
  return current < previous * (1 - opts.dropFraction);
}

/** Günlük seri üzerinden hareketli ortalama (son `window` gün). */
export function movingAverageDaily(dailyCounts: number[], window: number): number {
  if (dailyCounts.length === 0 || window <= 0) return 0;
  const slice = dailyCounts.slice(-window);
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/**
 * Son `recentDays` günün toplamı, hemen önceki `baselineDays` günlük hacme göre
 * beklenenin altında mı (moving-baseline; yanlış pozitifi azaltır).
 */
export function dropVsTrailingBaseline(
  dailyOldestFirst: number[],
  recentDays: number,
  baselineDays: number,
  opts: { dropFraction: number; minBaselineSum: number },
): boolean {
  if (dailyOldestFirst.length < recentDays + baselineDays) return false;
  const recent = dailyOldestFirst.slice(-recentDays).reduce((a, b) => a + b, 0);
  const baselineWindow = dailyOldestFirst.slice(-(recentDays + baselineDays), -recentDays);
  const baselineSum = baselineWindow.reduce((a, b) => a + b, 0);
  if (baselineSum < opts.minBaselineSum) return false;
  const expected = (baselineSum / baselineDays) * recentDays;
  return recent < expected * (1 - opts.dropFraction);
}

/** ISO hafta anahtarı: `2026-W16` (dedupe / batch slot). */
export function isoWeekKey(d: Date): string {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const y = utc.getUTCFullYear();
  return `${y}-W${String(weekNo).padStart(2, "0")}`;
}
