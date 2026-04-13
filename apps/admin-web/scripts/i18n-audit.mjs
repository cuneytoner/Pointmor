/**
 * Static scan + known dynamic prefixes → unused leaf keys in en.json.
 * Run: node scripts/i18n-audit.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function flatten(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...flatten(v, p));
    else out.push(p);
  }
  return out;
}

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, acc);
    else if (/\.(tsx|ts)$/.test(ent.name)) acc.push(full);
  }
  return acc;
}

function collectStaticT(source) {
  const used = new Set();
  const re = /\bt\(\s*([`'"])([\s\S]*?)\1/g;
  let m;
  while ((m = re.exec(source))) {
    const inner = m[2];
    if (inner.includes("${")) continue;
    used.add(inner.trim());
  }
  return used;
}

/** Prefixes where any leaf under prefix may be used at runtime */
const DYNAMIC_PREFIXES = [
  "lang",
  "plans.planType",
  "subscriptions.status",
  "users.roles",
  "dashboard.activity.demo",
  "dashboard.events",
  "dashboard.activity.statusBadge",
];

function extractNavLabelKeys(source) {
  const keys = new Set();
  const re = /labelKey:\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(source))) keys.add(m[1]);
  return keys;
}

/** Passed to t() via variable (e.g. t(topbarKey)) — not a string literal in source */
const INDIRECT_T_KEYS = new Set(["shell.platformConsole", "shell.tenantApp"]);

const files = walk(path.join(root, "src"));
const used = new Set([...INDIRECT_T_KEYS]);
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  for (const k of collectStaticT(s)) used.add(k);
}

const navPath = path.join(root, "src/navigation/nav-config.tsx");
if (fs.existsSync(navPath)) {
  const navSrc = fs.readFileSync(navPath, "utf8");
  for (const k of extractNavLabelKeys(navSrc)) used.add(k);
}

const enPath = path.join(root, "src/i18n/locales/en.json");
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const allKeys = flatten(en);

function keyCovered(k) {
  if (used.has(k)) return true;
  for (const pref of DYNAMIC_PREFIXES) {
    if (k === pref || k.startsWith(`${pref}.`)) return true;
  }
  return false;
}

const unused = allKeys.filter((k) => !keyCovered(k));

console.log(
  JSON.stringify(
    {
      staticRefs: used.size,
      leafKeys: allKeys.length,
      unusedCount: unused.length,
      unused,
    },
    null,
    2,
  ),
);
