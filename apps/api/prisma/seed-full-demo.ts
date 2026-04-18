/**
 * Full demo seed guard.
 * Heavy demo seed must run only in explicit demo environment.
 */
if (process.env.APP_ENV !== "demo") {
  console.error("db:seed:full:demo engellendi: APP_ENV=demo zorunlu.");
  process.exit(1);
}

if (process.env.ALLOW_FULL_DEMO_SEED !== "true") {
  console.error(
    "db:seed:full:demo engellendi: ALLOW_FULL_DEMO_SEED=true zorunlu.",
  );
  process.exit(1);
}

if (process.env.CONFIRM_FULL_DEMO_SEED !== "I_UNDERSTAND_FULL_DEMO_SEED") {
  console.error(
    "db:seed:full:demo engellendi: CONFIRM_FULL_DEMO_SEED=I_UNDERSTAND_FULL_DEMO_SEED zorunlu.",
  );
  process.exit(1);
}

if (process.env.SKIP_FULL_DEMO_DB_URL_CHECK !== "1") {
  const needle =
    process.env.FULL_DEMO_SEED_DB_URL_SUBSTR?.trim() || "pointmor_demo";
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes(needle)) {
    console.error(
      `db:seed:full:demo engellendi: DATABASE_URL içinde "${needle}" bekleniyor (yanlış DB koruması). Atlamak için SKIP_FULL_DEMO_DB_URL_CHECK=1.`,
    );
    process.exit(1);
  }
}

process.env.SEED_FULL_DEMO = "1";
process.env.FORCE_RESEED_DEMO = process.env.FORCE_RESEED_DEMO ?? "1";

await import("./seed.ts");
