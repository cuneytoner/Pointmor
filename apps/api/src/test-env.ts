/** Vitest: Prisma modülü import edilmeden önce DATABASE_URL gerekir (CI / yerel). */
if (!process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL =
    "postgresql://vitest:vitest@127.0.0.1:5432/pointmor_vitest_placeholder";
}

/** Testlerde imzalı oturum yerine bellek içi store (deterministik, ek sırra gerek yok). */
process.env.SESSION_BACKEND = process.env.SESSION_BACKEND ?? "memory";

/** Replay / revoke için Redis’e bağlanmadan deterministik bellek store. */
process.env.SECURITY_STATE_BACKEND = process.env.SECURITY_STATE_BACKEND ?? "memory";

/** CI’da APP_ENV=demo vb. sıkı profil açılırsa buildApp fail etmesin. */
process.env.SECURITY_STATE_ALLOW_MEMORY_FALLBACK =
  process.env.SECURITY_STATE_ALLOW_MEMORY_FALLBACK ?? "true";
process.env.SECURITY_STATE_ACK_IN_PROCESS_MEMORY =
  process.env.SECURITY_STATE_ACK_IN_PROCESS_MEMORY ?? "true";
