/**
 * Ortam bazlı güvenlik politikası: startup doğrulama ve health/preflight özetleri.
 * Redis client burada tutulmaz (security-state).
 */

import { customerBearerFallbackAllowed } from "./customer-session-cookie.js";

export type SecurityStateBackendName = "memory" | "redis";

export function redisUrl(): string | null {
  const u = process.env.REDIS_URL?.trim();
  return u || null;
}

export function resolveSecurityStateBackend(): SecurityStateBackendName {
  const b = process.env.SECURITY_STATE_BACKEND?.trim().toLowerCase();
  if (b === "redis") return "redis";
  if (b === "memory") return "memory";
  return redisUrl() ? "redis" : "memory";
}

/** Üretim ve demo benzeri sıkı profil (yerel geliştirme genelde false). */
export function isStrictSecurityProfile(): boolean {
  const appEnv = process.env.APP_ENV?.trim().toLowerCase();
  if (appEnv === "demo") return true;
  return process.env.NODE_ENV === "production";
}

export function securityStateAllowMemoryFallback(): boolean {
  return process.env.SECURITY_STATE_ALLOW_MEMORY_FALLBACK === "true";
}

/** Sıkı profilde bellek modu için ikinci, açık onay (geçici / tek düğüm istisnası). */
export function securityStateAckInProcessMemory(): boolean {
  return process.env.SECURITY_STATE_ACK_IN_PROCESS_MEMORY === "true";
}

export function securityStateMemoryFallbackJustification(): string | null {
  const j = process.env.SECURITY_STATE_MEMORY_FALLBACK_JUSTIFICATION?.trim();
  return j || null;
}

function parseIsoDateMsFromEnv(key: string): number | null {
  const raw = process.env[key]?.trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) {
    throw new Error(`${key} must be a valid ISO 8601 timestamp (UTC recommended). Got: ${raw}`);
  }
  return ms;
}

function daysUntil(ms: number): number {
  return (ms - Date.now()) / 86_400_000;
}

/** Sıkı profilde legacy internal job (secret + HMAC kapalı) bu tarihten sonra başlamaz. */
export function internalJobLegacyAuthExpiresAtMs(): number | null {
  return parseIsoDateMsFromEnv("INTERNAL_JOB_LEGACY_AUTH_EXPIRES_AT");
}

/** Sıkı profilde bellek fallback acil durum penceresi (opsyonel ama strongly recommended). */
export function securityStateMemoryFallbackExpiresAtMs(): number | null {
  return parseIsoDateMsFromEnv("SECURITY_STATE_MEMORY_FALLBACK_EXPIRES_AT");
}

export function customerJtiCutoffAtMs(): number | null {
  return parseIsoDateMsFromEnv("CUSTOMER_PORTAL_JTI_REQUIRED_AFTER");
}

export function customerBearerSunsetAtMs(): number | null {
  return parseIsoDateMsFromEnv("CUSTOMER_BEARER_LEGACY_SUNSET_AFTER");
}

/** Preflight secret taşıma yöntemi: strict profilde varsayılan header-only. */
export function preflightAllowQuerySecret(): boolean {
  const raw = process.env.POINTMOR_PREFLIGHT_ALLOW_QUERY?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return !isStrictSecurityProfile();
}

/** Replay: Redis kullanılıyorken hata durumunda bellek fallback (varsayılan kapalı). */
export function replayRedisFailOpen(): boolean {
  const replay = process.env.SECURITY_STATE_REDIS_UNAVAILABLE_REPLAY?.trim().toLowerCase();
  if (replay === "open") return true;
  if (replay === "closed") return false;
  const legacy = process.env.SECURITY_STATE_REDIS_UNAVAILABLE?.trim().toLowerCase();
  return legacy === "open";
}

/** Revoke okuma: Redis hata (varsayılan kapalı = iptal varsayımı). */
export function revokeReadRedisFailOpen(): boolean {
  const v = process.env.SECURITY_STATE_REDIS_UNAVAILABLE_REVOKE_READ?.trim().toLowerCase();
  if (v === "open") return true;
  if (v === "closed") return false;
  const legacy = process.env.SECURITY_STATE_REDIS_UNAVAILABLE?.trim().toLowerCase();
  return legacy === "open";
}

function internalJobSecretsConfigured(): boolean {
  return Boolean(
    process.env.RETENTION_JOB_SECRET?.trim() || process.env.HQ_INSIGHT_JOB_SECRET?.trim(),
  );
}

function internalJobRequireHmacEnv(): boolean {
  const v = process.env.INTERNAL_JOB_REQUIRE_HMAC?.trim().toLowerCase();
  return v === "true" || v === "1";
}

/**
 * Uygulama ayağa kalkmadan önce çağrılmalı. Yanlış Redis/memory kombinasyonunda fail-fast.
 */
export function validateStartupSecurityConfig(): void {
  const url = redisUrl();
  const explicitBackend = process.env.SECURITY_STATE_BACKEND?.trim().toLowerCase();

  if (explicitBackend === "redis" && !url) {
    throw new Error(
      "SECURITY_STATE_BACKEND=redis requires REDIS_URL. Fix configuration or use SECURITY_STATE_BACKEND=auto|memory with an explicit memory opt-in where appropriate.",
    );
  }

  const resolved = resolveSecurityStateBackend();
  const strict = isStrictSecurityProfile();
  const allowMemory = securityStateAllowMemoryFallback();
  const ackMemory = securityStateAckInProcessMemory();

  if (strict && resolved === "memory" && !allowMemory) {
    throw new Error(
      "Strict profile (NODE_ENV=production or APP_ENV=demo): in-process security state is not allowed without SECURITY_STATE_ALLOW_MEMORY_FALLBACK=true. Set REDIS_URL for shared replay/revoke, or explicitly acknowledge single-node memory risk.",
    );
  }

  if (strict && resolved === "memory" && allowMemory && !ackMemory) {
    throw new Error(
      "Strict profile: SECURITY_STATE_ALLOW_MEMORY_FALLBACK=true requires SECURITY_STATE_ACK_IN_PROCESS_MEMORY=true (second explicit ack). Use only for temporary single-node / emergency; prefer REDIS_URL.",
    );
  }

  if (strict && resolved === "memory" && allowMemory && !securityStateMemoryFallbackJustification()) {
    console.warn(
      "[pointmor] SECURITY_STATE_MEMORY_FALLBACK_JUSTIFICATION is unset; set a short ops reason (e.g. single-node-demo-week-12) for audit trail.",
    );
  }

  const memFallbackExpiry = securityStateMemoryFallbackExpiresAtMs();
  if (strict && resolved === "memory" && allowMemory) {
    if (memFallbackExpiry === null) {
      throw new Error(
        "Strict profile memory fallback requires SECURITY_STATE_MEMORY_FALLBACK_EXPIRES_AT (ISO UTC) to define a temporary emergency window.",
      );
    } else {
      const days = daysUntil(memFallbackExpiry);
      if (days <= 0) {
        throw new Error(
          "SECURITY_STATE_MEMORY_FALLBACK_EXPIRES_AT is in the past for strict profile memory mode. Disable memory fallback or extend this temporary emergency window explicitly.",
        );
      }
      if (days <= 14) {
        console.warn(
          `[pointmor] In-process security state fallback expires in ~${Math.ceil(days)} days (${process.env.SECURITY_STATE_MEMORY_FALLBACK_EXPIRES_AT}); move to REDIS_URL-backed shared state.`,
        );
      }
    }
  }

  const legacyJobExpiry = internalJobLegacyAuthExpiresAtMs();
  if (strict && internalJobSecretsConfigured() && !internalJobRequireHmacEnv()) {
    if (legacyJobExpiry === null) {
      throw new Error(
        "Strict profile with legacy internal-job auth requires INTERNAL_JOB_LEGACY_AUTH_EXPIRES_AT (ISO UTC). Set an explicit cutover date and migrate to INTERNAL_JOB_REQUIRE_HMAC=true.",
      );
    }
    if (legacyJobExpiry !== null && Date.now() > legacyJobExpiry) {
      throw new Error(
        "INTERNAL_JOB_LEGACY_AUTH_EXPIRES_AT is in the past: enable INTERNAL_JOB_REQUIRE_HMAC=true for cron callers or remove job secrets until HMAC is configured.",
      );
    }
    if (legacyJobExpiry !== null) {
      const days = daysUntil(legacyJobExpiry);
      if (days > 0 && days <= 14) {
        console.warn(
          `[pointmor] Internal job legacy auth expires in ~${Math.ceil(days)} days (${process.env.INTERNAL_JOB_LEGACY_AUTH_EXPIRES_AT}); plan INTERNAL_JOB_REQUIRE_HMAC migration.`,
        );
      }
    }
  }

  const jtiCutoff = customerJtiCutoffAtMs();
  if (strict) {
    if (jtiCutoff === null) {
      console.warn(
        "[pointmor] CUSTOMER_PORTAL_JTI_REQUIRED_AFTER is unset; jti-less customer tokens remain transition-compatible. Set a rollout cutoff date.",
      );
    } else {
      const days = daysUntil(jtiCutoff);
      if (days > 0 && days <= 21) {
        console.warn(
          `[pointmor] Customer JTI cutoff is in ~${Math.ceil(days)} days (${process.env.CUSTOMER_PORTAL_JTI_REQUIRED_AFTER}); expect forced customer re-login for legacy sessions.`,
        );
      }
    }
  }

  const bearerCutoff = customerBearerSunsetAtMs();
  if (strict) {
    if (bearerCutoff === null) {
      console.warn(
        "[pointmor] CUSTOMER_BEARER_LEGACY_SUNSET_AFTER is unset; bearer fallback can remain open in transition mode.",
      );
    } else {
      const days = daysUntil(bearerCutoff);
      if (days > 0 && days <= 21) {
        console.warn(
          `[pointmor] Customer bearer legacy sunset is in ~${Math.ceil(days)} days (${process.env.CUSTOMER_BEARER_LEGACY_SUNSET_AFTER}); monitor legacy bearer metrics before cutoff.`,
        );
      }
    }
    if (customerBearerFallbackAllowed() && bearerCutoff === null) {
      console.warn(
        "[pointmor] CUSTOMER_ALLOW_BEARER_FALLBACK is active without CUSTOMER_BEARER_LEGACY_SUNSET_AFTER. Add a sunset date to avoid indefinite legacy mode.",
      );
    }
  }

  if (strict && replayRedisFailOpen()) {
    console.warn(
      "[pointmor] SECURITY_STATE_REDIS_UNAVAILABLE_REPLAY=open (or legacy SECURITY_STATE_REDIS_UNAVAILABLE=open): replay may fall back to process memory on Redis errors; avoid in multi-instance production.",
    );
  }

  if (strict && revokeReadRedisFailOpen()) {
    console.warn(
      "[pointmor] Revoke read fail-open is enabled: Redis errors may treat sessions as not revoked.",
    );
  }

  if (strict && internalJobSecretsConfigured() && !internalJobRequireHmacEnv()) {
    const ack = process.env.INTERNAL_JOB_LEGACY_AUTH_ACKNOWLEDGED?.trim().toLowerCase();
    if (ack !== "true" && ack !== "1") {
      console.warn(
        "[pointmor] Temporary: INTERNAL_JOB_LEGACY_AUTH_ACKNOWLEDGED=true acknowledges legacy secret auth until INTERNAL_JOB_REQUIRE_HMAC is enabled (see apps/api/.env.example).",
      );
    }
  }

  if (strict && process.env.POINTMOR_PREFLIGHT_SECRET?.trim() && preflightAllowQuerySecret()) {
    console.warn(
      "[pointmor] POINTMOR_PREFLIGHT_ALLOW_QUERY=true in strict profile; prefer header-only (X-Pointmor-Preflight-Secret).",
    );
  }
}

/**
 * Strict + legacy secret internal-job modunda cutover tarihi geçtiyse true.
 * Süreç cutover öncesi başlamış olsa bile runtime’da legacy path kapatılır (restart şartı kalkar).
 */
export function isStrictInternalJobLegacyAuthPastCutoff(): boolean {
  if (!isStrictSecurityProfile()) return false;
  if (internalJobRequireHmacEnv()) return false;
  if (!internalJobSecretsConfigured()) return false;
  const ms = internalJobLegacyAuthExpiresAtMs();
  if (ms === null) return false;
  return Date.now() > ms;
}

/**
 * Strict profilde geçici bellek fallback penceresi bittiyse true (REDIS’e geçiş veya yeniden yapılandırma gerekir).
 */
export function isStrictMemoryFallbackEmergencyWindowExpired(): boolean {
  if (!isStrictSecurityProfile()) return false;
  if (resolveSecurityStateBackend() !== "memory") return false;
  if (!securityStateAllowMemoryFallback() || !securityStateAckInProcessMemory()) return false;
  const ms = securityStateMemoryFallbackExpiresAtMs();
  if (ms === null) return false;
  return Date.now() > ms;
}

export type SecurityPreflightSnapshot = {
  profile: "strict" | "relaxed";
  securityStateBackend: SecurityStateBackendName;
  redisUrlConfigured: boolean;
  memoryFallbackExplicitlyAllowed: boolean;
  memoryFallbackAcknowledged: boolean;
  memoryFallbackJustification: string | null;
  memoryFallbackExpiresAt: string | null;
  memoryFallbackEmergencyMode: boolean;
  replayRedisFailOpen: boolean;
  revokeReadRedisFailOpen: boolean;
  customerBearerFallbackAllowed: boolean;
  customerBearerLegacySunsetAfter: string | null;
  customerJtiRequiredAfter: string | null;
  internalJobRequireHmac: boolean;
  internalJobSecretsConfigured: boolean;
  internalJobLegacyAuthExpiresAt: string | null;
  preflightSecretConfigured: boolean;
  preflightAllowQuerySecret: boolean;
};

export function getSecurityPreflightSnapshot(): SecurityPreflightSnapshot {
  return {
    profile: isStrictSecurityProfile() ? "strict" : "relaxed",
    securityStateBackend: resolveSecurityStateBackend(),
    redisUrlConfigured: Boolean(redisUrl()),
    memoryFallbackExplicitlyAllowed: securityStateAllowMemoryFallback(),
    memoryFallbackAcknowledged: securityStateAckInProcessMemory(),
    memoryFallbackJustification: securityStateMemoryFallbackJustification(),
    memoryFallbackExpiresAt:
      process.env.SECURITY_STATE_MEMORY_FALLBACK_EXPIRES_AT?.trim() || null,
    memoryFallbackEmergencyMode: resolveSecurityStateBackend() === "memory",
    replayRedisFailOpen: replayRedisFailOpen(),
    revokeReadRedisFailOpen: revokeReadRedisFailOpen(),
    customerBearerFallbackAllowed: customerBearerFallbackAllowed(),
    customerBearerLegacySunsetAfter:
      process.env.CUSTOMER_BEARER_LEGACY_SUNSET_AFTER?.trim() || null,
    customerJtiRequiredAfter: process.env.CUSTOMER_PORTAL_JTI_REQUIRED_AFTER?.trim() || null,
    internalJobRequireHmac: internalJobRequireHmacEnv(),
    internalJobSecretsConfigured: internalJobSecretsConfigured(),
    internalJobLegacyAuthExpiresAt: process.env.INTERNAL_JOB_LEGACY_AUTH_EXPIRES_AT?.trim() || null,
    preflightSecretConfigured: Boolean(process.env.POINTMOR_PREFLIGHT_SECRET?.trim()),
    preflightAllowQuerySecret: preflightAllowQuerySecret(),
  };
}
