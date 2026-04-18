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

process.env.SEED_FULL_DEMO = "1";
process.env.FORCE_RESEED_DEMO = process.env.FORCE_RESEED_DEMO ?? "1";

await import("./seed.ts");
