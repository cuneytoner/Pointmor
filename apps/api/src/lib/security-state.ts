import { createClient, type RedisClientType } from "redis";

export type SecurityStateBackend = "memory" | "redis";

export type ConsumeReplayResult = "ok" | "replay" | "unavailable";

/**
 * Webhook / internal job replay, admin imzalı oturum iptali ve müşteri JWT jti iptali için ortak durum.
 * Redis yoksa veya `SECURITY_STATE_BACKEND=memory` ise süreç içi Map kullanılır (çoklu instance’ta zayıf).
 */
export interface SecurityStatePort {
  consumeReplayKey(
    scope: string,
    key: string,
    ttlSeconds: number,
  ): Promise<ConsumeReplayResult>;
  isAdminJtiRevoked(jti: string): Promise<boolean>;
  markAdminJtiRevoked(jti: string, ttlSeconds: number): Promise<void>;
  isCustomerJtiRevoked(jti: string): Promise<boolean>;
  markCustomerJtiRevoked(jti: string, ttlSeconds: number): Promise<void>;
  shutdown(): Promise<void>;
}

const MAX_MEMORY_KEYS = 12_000;

function pruneMapByExpiry(nowSec: number, m: Map<string, number>): void {
  for (const [k, exp] of m) {
    if (exp <= nowSec) m.delete(k);
  }
  while (m.size > MAX_MEMORY_KEYS) {
    const first = m.keys().next();
    if (first.done) break;
    m.delete(first.value);
  }
}

class MemorySecurityState implements SecurityStatePort {
  private readonly replay = new Map<string, number>();
  private readonly adminRevoke = new Map<string, number>();
  private readonly customerRevoke = new Map<string, number>();

  async consumeReplayKey(
    scope: string,
    key: string,
    ttlSeconds: number,
  ): Promise<ConsumeReplayResult> {
    const now = Math.floor(Date.now() / 1000);
    const k = `${scope}:${key}`;
    pruneMapByExpiry(now, this.replay);
    const exp = this.replay.get(k);
    if (exp && exp > now) return "replay";
    this.replay.set(k, now + Math.max(1, ttlSeconds));
    return "ok";
  }

  async isAdminJtiRevoked(jti: string): Promise<boolean> {
    const now = Math.floor(Date.now() / 1000);
    pruneMapByExpiry(now, this.adminRevoke);
    const exp = this.adminRevoke.get(jti);
    return Boolean(exp && exp > now);
  }

  async markAdminJtiRevoked(jti: string, ttlSeconds: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    this.adminRevoke.set(jti, now + Math.max(1, ttlSeconds));
    pruneMapByExpiry(now, this.adminRevoke);
  }

  async isCustomerJtiRevoked(jti: string): Promise<boolean> {
    const now = Math.floor(Date.now() / 1000);
    pruneMapByExpiry(now, this.customerRevoke);
    const exp = this.customerRevoke.get(jti);
    return Boolean(exp && exp > now);
  }

  async markCustomerJtiRevoked(jti: string, ttlSeconds: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    this.customerRevoke.set(jti, now + Math.max(1, ttlSeconds));
    pruneMapByExpiry(now, this.customerRevoke);
  }

  async shutdown(): Promise<void> {
    this.replay.clear();
    this.adminRevoke.clear();
    this.customerRevoke.clear();
  }
}

let sharedRedis: RedisClientType | null = null;

function redisUrl(): string | null {
  const u = process.env.REDIS_URL?.trim();
  return u || null;
}

function redisFailOpen(): boolean {
  const v = process.env.SECURITY_STATE_REDIS_UNAVAILABLE?.trim().toLowerCase();
  return v === "open";
}

async function ensureRedisConnected(client: RedisClientType): Promise<void> {
  if (!client.isOpen) {
    await client.connect();
  }
}

class RedisSecurityState implements SecurityStatePort {
  private readonly client: RedisClientType;

  constructor(client: RedisClientType) {
    this.client = client;
  }

  async consumeReplayKey(
    scope: string,
    key: string,
    ttlSeconds: number,
  ): Promise<ConsumeReplayResult> {
    const redisKey = `pm:replay:${scope}:${key}`;
    try {
      await ensureRedisConnected(this.client);
      const ok = await this.client.set(redisKey, "1", {
        NX: true,
        EX: Math.max(1, ttlSeconds),
      });
      if (ok === null) return "replay";
      return "ok";
    } catch {
      return "unavailable";
    }
  }

  async isAdminJtiRevoked(jti: string): Promise<boolean> {
    try {
      await ensureRedisConnected(this.client);
      const n = await this.client.exists(`pm:revoke:admin:${jti}`);
      return n === 1;
    } catch {
      return redisFailOpen() ? false : true;
    }
  }

  async markAdminJtiRevoked(jti: string, ttlSeconds: number): Promise<void> {
    await ensureRedisConnected(this.client);
    await this.client.set(`pm:revoke:admin:${jti}`, "1", {
      EX: Math.max(1, ttlSeconds),
    });
  }

  async isCustomerJtiRevoked(jti: string): Promise<boolean> {
    try {
      await ensureRedisConnected(this.client);
      const n = await this.client.exists(`pm:revoke:customer:${jti}`);
      return n === 1;
    } catch {
      return redisFailOpen() ? false : true;
    }
  }

  async markCustomerJtiRevoked(jti: string, ttlSeconds: number): Promise<void> {
    await ensureRedisConnected(this.client);
    await this.client.set(`pm:revoke:customer:${jti}`, "1", {
      EX: Math.max(1, ttlSeconds),
    });
  }

  async shutdown(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit().catch(() => undefined);
    }
  }
}

/** Redis + bellek: Redis hata verirse replay için belleğe düşer (yalnızca SECURITY_STATE_REDIS_UNAVAILABLE=open iken). */
class HybridSecurityState implements SecurityStatePort {
  private readonly redis: RedisSecurityState | null;
  private readonly mem = new MemorySecurityState();

  constructor(redisClient: RedisClientType | null) {
    this.redis = redisClient ? new RedisSecurityState(redisClient) : null;
  }

  async consumeReplayKey(
    scope: string,
    key: string,
    ttlSeconds: number,
  ): Promise<ConsumeReplayResult> {
    if (!this.redis) return this.mem.consumeReplayKey(scope, key, ttlSeconds);
    const r = await this.redis.consumeReplayKey(scope, key, ttlSeconds);
    if (r === "unavailable" && redisFailOpen()) {
      return this.mem.consumeReplayKey(scope, key, ttlSeconds);
    }
    return r;
  }

  async isAdminJtiRevoked(jti: string): Promise<boolean> {
    if (!this.redis) return this.mem.isAdminJtiRevoked(jti);
    const redisRevoked = await this.redis.isAdminJtiRevoked(jti);
    if (await this.mem.isAdminJtiRevoked(jti)) return true;
    return redisRevoked;
  }

  async markAdminJtiRevoked(jti: string, ttlSeconds: number): Promise<void> {
    await this.mem.markAdminJtiRevoked(jti, ttlSeconds);
    if (this.redis) {
      try {
        await this.redis.markAdminJtiRevoked(jti, ttlSeconds);
      } catch {
        /* Bellekte zaten işaretlendi. */
      }
    }
  }

  async isCustomerJtiRevoked(jti: string): Promise<boolean> {
    if (!this.redis) return this.mem.isCustomerJtiRevoked(jti);
    const redisRevoked = await this.redis.isCustomerJtiRevoked(jti);
    if (await this.mem.isCustomerJtiRevoked(jti)) return true;
    return redisRevoked;
  }

  async markCustomerJtiRevoked(jti: string, ttlSeconds: number): Promise<void> {
    await this.mem.markCustomerJtiRevoked(jti, ttlSeconds);
    if (this.redis) {
      try {
        await this.redis.markCustomerJtiRevoked(jti, ttlSeconds);
      } catch {
        /* */
      }
    }
  }

  async shutdown(): Promise<void> {
    await this.mem.shutdown();
    if (this.redis) await this.redis.shutdown();
  }
}

export function resolveSecurityStateBackend(): SecurityStateBackend {
  const b = process.env.SECURITY_STATE_BACKEND?.trim().toLowerCase();
  if (b === "redis") return "redis";
  if (b === "memory") return "memory";
  return redisUrl() ? "redis" : "memory";
}

function createPort(): SecurityStatePort {
  const mode = resolveSecurityStateBackend();
  const url = redisUrl();
  if (mode === "redis" && url) {
    if (!sharedRedis) {
      sharedRedis = createClient({ url });
      sharedRedis.on("error", (err) => {
        console.error("redis_security_state_client_error", err);
      });
    }
    return new HybridSecurityState(sharedRedis);
  }
  if (mode === "redis" && !url) {
    console.warn(
      "SECURITY_STATE_BACKEND=redis ancak REDIS_URL yok; replay/revoke bellek moduna düşüldü.",
    );
  }
  return new MemorySecurityState();
}

let singleton: SecurityStatePort | null = null;

export function getSecurityState(): SecurityStatePort {
  if (!singleton) singleton = createPort();
  return singleton;
}

/** Vitest gibi ortamlarda sıfırlamak için. */
export async function resetSecurityStateForTests(): Promise<void> {
  if (singleton) {
    await singleton.shutdown();
    singleton = null;
  }
  if (sharedRedis) {
    try {
      if (sharedRedis.isOpen) await sharedRedis.quit();
    } catch {
      /* */
    }
    sharedRedis = null;
  }
}
