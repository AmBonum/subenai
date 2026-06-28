#!/usr/bin/env node
// Bundle-size budget gate. Fails the build when a JS chunk (or the total)
// grows past its gzipped budget — the transfer-relevant number. Budgets
// live in perf-budget.json; run `node scripts/check-bundle-budget.mjs --report`
// to print current sizes when (re)baselining after an intentional change.
//
// Chunk filenames carry a Vite content hash (index-VvUKstk8.js) that can
// itself contain hyphens (base64url: react-pdf.browser-no5FtS-T.js), so we
// match budgets by logical-name PREFIX (longest, boundary-aware) rather than
// trying to strip the hash.
import { readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS_DIR = join(ROOT, "dist", "client", "assets");
const BUDGET_FILE = join(ROOT, "perf-budget.json");
const REPORT = process.argv.includes("--report");

function gzipKb(path) {
  return Math.round((gzipSync(readFileSync(path)).length / 1024) * 100) / 100;
}

// Longest boundary-aware prefix match: "react-pdf.browser" matches
// "react-pdf.browser-<hash>.js" but "index" does not swallow "index.lazy-…".
function capFor(file, budget) {
  let best = null;
  for (const key of Object.keys(budget.chunks)) {
    if (!file.startsWith(key)) continue;
    const next = file[key.length];
    if (next !== "-" && next !== ".") continue;
    if (best === null || key.length > best.length) best = key;
  }
  return best === null ? budget.defaultChunkGzipKb : budget.chunks[best];
}

let entries;
try {
  entries = readdirSync(ASSETS_DIR).filter((f) => f.endsWith(".js"));
} catch {
  console.error(`[bundle-budget] ${ASSETS_DIR} not found — run \`npm run build\` first.`);
  process.exit(1);
}

const chunks = entries
  .map((f) => ({ file: f, gzip: gzipKb(join(ASSETS_DIR, f)) }))
  .sort((a, b) => b.gzip - a.gzip);
const totalGzip = Math.round(chunks.reduce((s, c) => s + c.gzip, 0) * 100) / 100;

if (REPORT) {
  console.log(`\nGzipped JS chunks (${chunks.length}), total ${totalGzip} kB:\n`);
  for (const c of chunks) console.log(`  ${String(c.gzip).padStart(8)} kB  ${c.file}`);
  console.log("");
  process.exit(0);
}

const budget = JSON.parse(readFileSync(BUDGET_FILE, "utf8"));
const failures = [];

if (totalGzip > budget.totalGzipKb) {
  failures.push(`total gzipped JS ${totalGzip} kB > budget ${budget.totalGzipKb} kB`);
}
for (const c of chunks) {
  const cap = capFor(c.file, budget);
  if (c.gzip > cap) failures.push(`chunk ${c.file} ${c.gzip} kB > budget ${cap} kB`);
}

if (failures.length) {
  console.error("\n[bundle-budget] FAIL — budget exceeded:\n");
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(
    "\nIf the growth is intentional, re-baseline with " +
      "`node scripts/check-bundle-budget.mjs --report` and bump perf-budget.json " +
      "in the same commit (with a reason).\n",
  );
  process.exit(1);
}

console.log(
  `[bundle-budget] OK — total ${totalGzip} kB across ${chunks.length} chunks, all within budget.`,
);
