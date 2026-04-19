/** İşletim görünürlüğü: metrik benzeri sayaçlar (log/monitoring ile birlikte kullanılır). */

const counters = {
  customer_auth_bearer_legacy: 0,
  customer_bearer_sunset_blocked: 0,
  customer_jti_required_reject: 0,
  customer_token_missing_jti: 0,
  internal_job_legacy_auth: 0,
  preflight_query_secret_used: 0,
  replay_redis_memory_fallback: 0,
} as const;

export type RuntimeSecurityMetricKey = keyof typeof counters;

export function bumpRuntimeSecurityMetric(key: RuntimeSecurityMetricKey, n = 1): void {
  (counters as Record<string, number>)[key] =
    ((counters as Record<string, number>)[key] ?? 0) + n;
}

export function snapshotRuntimeSecurityMetrics(): Record<RuntimeSecurityMetricKey, number> {
  return { ...counters };
}

export function resetRuntimeSecurityMetricsForTests(): void {
  for (const k of Object.keys(counters) as RuntimeSecurityMetricKey[]) {
    (counters as Record<string, number>)[k] = 0;
  }
}
