// AH-11.6 — bundle alarm guard.
//
// Scans the built client bundle for forbidden mock identifiers / module
// names. Currently runs in alarm-only mode (always exits 0) because the
// /t/$shareId respondent reads, /app/sets/$setId viewer,
// /app/tests/new + /app/library questions, and the composer/test-packs
// seed legitimately import from `mock-store` until AH-14 finishes the
// Supabase cutover. Flip the final `process.exit(0)` below to
// `process.exit(1)` when those carve-outs are gone.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN = ["MOCK_", "mock-store", "mock-data", "mock-user-data"];
const ROOT = "dist/client";

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (full.endsWith(".js")) yield full;
  }
}

const hits = [];
for (const file of walk(ROOT)) {
  const src = readFileSync(file, "utf-8");
  for (const needle of FORBIDDEN) {
    if (src.includes(needle)) hits.push({ file, needle });
  }
}

if (hits.length === 0) {
  console.log("check:bundle-no-mocks PASS — no forbidden mock strings in dist/");
  process.exit(0);
}

console.error("check:bundle-no-mocks FAIL — found mock strings in production bundle:");
for (const { file, needle } of hits.slice(0, 20)) {
  console.error(`  - ${file}: "${needle}"`);
}
if (hits.length > 20) console.error(`  ... and ${hits.length - 20} more`);
// ALARM-ONLY MODE: exit 0 with warning until AH-14 cleanup completes.
// Flip to `process.exit(1)` when respondent/answer-sets/quiz-bank fully migrated.
process.exit(0);
