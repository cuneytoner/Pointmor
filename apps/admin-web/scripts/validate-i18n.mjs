#!/usr/bin/env node
/**
 * Compares locale JSON trees to `en.json` (source of truth).
 * - missing keys in non-EN locales
 * - extra keys in non-EN locales
 * - rough scan for `t("...")` / t('...') keys in src/ vs EN keys (unused / missing in code)
 */
import { readFileSync, readdirSync } from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const localesDir = join(root, "src", "i18n", "locales");
const srcDir = join(root, "src");

function flatten(obj, prefix = "") {
  const out = new Set();
  if (obj === null || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.add(path);
    else if (v && typeof v === "object") {
      for (const x of flatten(v, path)) out.add(x);
    }
  }
  return out;
}

function loadJson(name) {
  const p = join(localesDir, name);
  return JSON.parse(readFileSync(p, "utf8"));
}

const en = loadJson("en.json");
const enKeys = flatten(en);
const localeFiles = ["tr.json", "es.json", "de.json"];

let exit = 0;

for (const f of localeFiles) {
  const tree = loadJson(f);
  const keys = flatten(tree);
  const missing = [...enKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !enKeys.has(k));
  if (missing.length) {
    console.error(`[i18n] ${f} missing ${missing.length} key(s) vs en.json:`);
    missing.slice(0, 40).forEach((k) => console.error(`  - ${k}`));
    if (missing.length > 40) console.error(`  … +${missing.length - 40} more`);
    exit = 1;
  }
  if (extra.length) {
    console.warn(`[i18n] ${f} has ${extra.length} extra key(s) vs en.json:`);
    extra.slice(0, 20).forEach((k) => console.warn(`  - ${k}`));
    exit = 1;
  }
}

/** Collect t("a.b.c") / t('a.b.c') from .ts / .tsx */
function scanTKeys() {
  const keys = new Set();
  const walk = (dir) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) {
        const rel = relative(srcDir, p).replace(/\\/g, "/");
        if (rel.startsWith("i18n/locales")) continue;
        walk(p);
      } else if (/\.(tsx?)$/.test(name.name)) {
        const s = readFileSync(p, "utf8");
        const re = /\bt\s*\(\s*["']([a-zA-Z0-9_.]+)["']/g;
        let m;
        while ((m = re.exec(s))) keys.add(m[1]);
      }
    }
  };
  walk(srcDir);
  return keys;
}

const codeKeys = scanTKeys();
const missingInEn = [...codeKeys].filter((k) => !enKeys.has(k));
const possiblyUnused = [...enKeys].filter((k) => !codeKeys.has(k));

if (missingInEn.length) {
  console.warn(
    `[i18n] Keys used in t("…") but not found in en.json (${missingInEn.length}):`,
  );
  missingInEn.sort().forEach((k) => console.warn(`  - ${k}`));
}

if (possiblyUnused.length) {
  console.warn(
    `[i18n] Keys in en.json not matched by simple t("key") scan (${possiblyUnused.length}) — may be dynamic or false positives:`,
  );
  possiblyUnused.sort().slice(0, 50).forEach((k) => console.warn(`  - ${k}`));
  if (possiblyUnused.length > 50)
    console.warn(`  … +${possiblyUnused.length - 50} more`);
}

if (exit === 0) console.log("[i18n] Locale file structures match en.json.");

process.exit(exit);
