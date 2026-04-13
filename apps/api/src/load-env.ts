/**
 * Geliştirmede `apps/api/.env` kaynak olmalı; sistem ortamındaki DATABASE_URL
 * (ör. yanlışlıkla ayarlı `file:./dev.db`) Prisma/API ile çakışmasın.
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const envPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.env",
);

config({
  path: envPath,
  override: process.env.NODE_ENV !== "production",
});
