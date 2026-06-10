// AH-14 — bundle leak guard (blocking).
//
// Scans the built client bundle for leaked mock *module code*. The mock
// stores (`@/lib/**/mock-store`, `mock-data`, `mock-user-data`) and their
// seed constants (`MOCK_*`) must never ship to the client. AH-14 removed
// the last production importers (the /t/$shareId respondent reads now go
// through the get_respondent_test_by_share_id RPC; the dead /app/sets
// viewer + answer-sets-mock-store were deleted), so this guard is now
// blocking (process.exit(1) on any hit).
//
// MATCHING PRECISION: we match module *specifiers* (path immediately
// followed by `.js`, a quote, or end-of-path) and seed identifiers
// (`MOCK_` followed by an identifier char) — NOT bare prose. This avoids
// false positives from user-facing copy that legitimately mentions the
// word "mock-store" (e.g. i18n explainer strings) while still catching a
// real `import "@/lib/.../mock-store"` or a `mock-store-<hash>.js` chunk.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Each pattern targets a real-leak signature, not incidental prose.
const FORBIDDEN = [
  // Mock module specifiers: `mock-store"`, `mock-store'`, `mock-store.js`,
  // `mock-store-AbC123.js` (emitted chunk). The trailing class rejects
  // prose like "z mock-store;" or "the mock-store fields".
  /mock-store(-[A-Za-z0-9_]+)?\.js\b/,
  /mock-store["'`]/,
  /mock-data(-[A-Za-z0-9_]+)?\.js\b/,
  /mock-data["'`]/,
  /mock-user-data(-[A-Za-z0-9_]+)?\.js\b/,
  /mock-user-data["'`]/,
  // Seed constants are SCREAMING_SNAKE_CASE — `MOCK_` followed by an
  // identifier char never appears in prose.
  /\bMOCK_[A-Z0-9_]/,
];
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
  for (const pattern of FORBIDDEN) {
    const m = src.match(pattern);
    if (m) hits.push({ file, needle: m[0] });
  }
}

if (hits.length === 0) {
  console.log("check:bundle-no-mocks PASS — no leaked mock module code in dist/");
  process.exit(0);
}

console.error("check:bundle-no-mocks FAIL — found mock module code in production bundle:");
for (const { file, needle } of hits.slice(0, 20)) {
  console.error(`  - ${file}: "${needle}"`);
}
if (hits.length > 20) console.error(`  ... and ${hits.length - 20} more`);
process.exit(1);
