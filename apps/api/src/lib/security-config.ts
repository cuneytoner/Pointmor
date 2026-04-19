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

function parseIsoDateMs(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const ms = Date.parse(raw.trim());
  return Number.isFinite(ms) ? ms : null;
}

/** Sıkı profilde legacy internal job (secret + HMAC kapalı) bu tarihten sonra başlamaz. */
export function internalJobLegacyAuthExpiresAtMs(): number | null {
  return parseIsoDateMs(process.env.INTERNAL_JOB_LEGACY_AUTH_EXPIRES_AT);
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

  const legacyJobExpiry = internalJobLegacyAuthExpiresAtMs();
  if (strict && internalJobSecretsConfigured() && !internalJobRequireHmacEnv()) {
    if (legacyJobExpiry !== null && Date.now() > legacyJobExpiry) {
      throw new Error(
        "INTERNAL_JOB_LEGACY_AUTH_EXPIRES_AT is in the past: enable INTERNAL_JOB_REQUIRE_HMAC=true for cron callers or remove job secrets until HMAC is configured.",
      );
    }
    if (legacyJobExpiry !== null) {
      const days = (legacyJobExpiry - Date.now()) / (86_400_000);
      if (days > 0 && days <= 14) {
        console.warn(
          `[pointmor] Internal job legacy auth expires in ~${Math.ceil(days)} days (${process.env.INTERNAL_JOB_LEGACY_AUTH_EXPIRES_AT}); plan INTERNAL_JOB_REQUIRE_HMAC migration.`,
        );
      }
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
}

export type SecurityPreflightSnapshot = {
  profile: "strict" | "relaxed";
  securityStateBackend: SecurityStateBackendName;
  redisUrlConfigured: boolean;
  memoryFallbackExplicitlyAllowed: boolean;
  memoryFallbackAcknowledged: boolean;
  memoryFallbackJustification: string | null;
  replayRedisFailOpen: boolean;
  revokeReadRedisFailOpen: boolean;
  customerBearerFallbackAllowed: boolean;
  customerBearerLegacySunsetAfter: string | null;
  customerJtiRequiredAfter: string | null;
  internalJobRequireHmac: boolean;
  internalJobSecretsConfigured: boolean;
  internalJobLegacyAuthExpiresAt: string | null;
  preflightSecretConfigured: boolean;
};

export function getSecurityPreflightSnapshot(): SecurityPreflightSnapshot {
  return {
    profile: isStrictSecurityProfile() ? "strict" : "relaxed",
    securityStateBackend: resolveSecurityStateBackend(),
    redisUrlConfigured: Boolean(redisUrl()),
    memoryFallbackExplicitlyAllowed: securityStateAllowMemoryFallback(),
    memoryFallbackAcknowledged: securityStateAckInProcessMemory(),
    memoryFallbackJustification: securityStateMemoryFallbackJustification(),
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
  };
}
