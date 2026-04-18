/** Vitest: Prisma modülü import edilmeden önce DATABASE_URL gerekir (CI / yerel). */
if (!process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL =
    "postgresql://vitest:vitest@127.0.0.1:5432/pointmor_vitest_placeholder";
}

/** Testlerde imzalı oturum yerine bellek içi store (deterministik, ek sırra gerek yok). */
process.env.SESSION_BACKEND = process.env.SESSION_BACKEND ?? "memory";
