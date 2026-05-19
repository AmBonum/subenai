// Phase 9d — bundle secret-leak guard.
//
// Hard gate (exit 1 on hit). Any of the patterns below baked into the
// client bundle would leak server-side credentials to every visitor:
// - SUPABASE_SERVICE_ROLE_KEY / "service_role": Supabase admin JWT,
//   bypasses every RLS policy. Catastrophic if exposed.
// - STRIPE_SECRET_KEY / sk_test_ / sk_live_: full Stripe account API
//   access.
// - RESEND_API_KEY / re_: outbound e-mail on our domain.
//
// Allowlist: VITE_SUPABASE_ANON_KEY (and its JWT body) IS expected in
// the client bundle — that's the public anon key, gated by RLS. We do
// NOT match on "eyJ" (JWT header) or "anon" for that reason.
//
// Scan root defaults to `dist/client` but accepts a positional argv
// override so the vitest case can point it at a tmp fixture:
//   node scripts/check-bundle-no-secrets.mjs <root>

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "service_role",
  "STRIPE_SECRET_KEY",
  "sk_test_",
  "sk_live_",
  "RESEND_API_KEY",
];

const ROOT = process.argv[2] ?? "dist/client";

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (full.endsWith(".js")) yield full;
  }
}

if (!existsSync(ROOT)) {
  console.warn(
    `check:bundle-no-secrets SKIP — ${ROOT} does not exist (run \`npm run build\` first).`,
  );
  process.exit(0);
}

const hits = [];
for (const file of walk(ROOT)) {
  const src = readFileSync(file, "utf-8");
  for (const needle of FORBIDDEN) {
    if (src.includes(needle)) hits.push({ file, needle });
  }
}

if (hits.length === 0) {
  console.log(`check:bundle-no-secrets PASS — no secret strings in ${ROOT}`);
  process.exit(0);
}

console.error(`check:bundle-no-secrets FAIL — found secret-class strings in production bundle:`);
for (const { file, needle } of hits.slice(0, 20)) {
  console.error(`  - ${file}: "${needle}"`);
}
if (hits.length > 20) console.error(`  ... and ${hits.length - 20} more`);
process.exit(1);
