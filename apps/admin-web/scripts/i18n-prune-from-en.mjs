/**
 * Rebuilds locale JSON to match en.json keys only (deep).
 * For each leaf: keep old translation if present, else copy English.
 * Usage: node scripts/i18n-prune-from-en.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "../src/i18n/locales");

function prune(old, template) {
  if (typeof template === "string") {
    return typeof old === "string" && old.length > 0 ? old : template;
  }
  if (template && typeof template === "object" && !Array.isArray(template)) {
    const out = {};
    for (const k of Object.keys(template)) {
      const o = old && typeof old === "object" && !Array.isArray(old) ? old[k] : undefined;
      out[k] = prune(o, template[k]);
    }
    return out;
  }
  return template;
}

const enPath = path.join(localesDir, "en.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));

for (const name of fs.readdirSync(localesDir)) {
  if (!name.endsWith(".json") || name === "en.json") continue;
  const p = path.join(localesDir, name);
  let old = {};
  try {
    old = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    old = {};
  }
  const next = prune(old, en);
  fs.writeFileSync(p, JSON.stringify(next, null, 2) + "\n", "utf8");
  console.log("updated", name);
}
