#!/usr/bin/env node
// E38.3 — daily retention runner.
//
// Invoked by `.github/workflows/retention-cron.yml` at 03:00 UTC daily.
// Calls the three retention RPCs against production Supabase and logs
// the row counts. Returns non-zero on any RPC error so the workflow
// run fails visibly (and the operator gets a GitHub notification).
//
// Honours `/privacy` retention claims:
//   - purge_expired_attempts: drop attempts older than 36 months
//   - anonymize_expired_anticheat: NULL flags + timing on attempts > 12mo
//   - anonymize_expired_edu_respondents: NULL respondent_name + email > 12mo
//
// Env (required, set as GitHub Actions repo secrets):
//   SUPABASE_URL                  — project URL
//   SUPABASE_SERVICE_ROLE_KEY     — service-role JWT (NEVER ship to client)
//
// Env (optional):
//   DRY_RUN=1                     — connect + list targets, do not invoke
//
// Exit codes (returned by main(), surfaced via process.exit at entry):
//   0 — all RPCs succeeded (or dry-run completed)
//   1 — config error (missing env)
//   2 — at least one RPC returned an error

import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const RPCS = [
  { name: "purge_expired_attempts", description: "Delete attempts older than 36 months" },
  { name: "anonymize_expired_anticheat", description: "NULL anti-cheat data older than 12 months" },
  {
    name: "anonymize_expired_edu_respondents",
    description: "NULL edu respondent name + email older than 12 months",
  },
];

function readEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[retention] missing required env: ${name}`);
    return null;
  }
  return value;
}

// Dependency-injected so the unit test can pass a mocked createClient
// without re-importing or mocking the @supabase/supabase-js module.
export async function main(deps = { createClient }) {
  const url = readEnv("SUPABASE_URL");
  if (!url) return 1;
  const key = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) return 1;

  const dryRun = process.env.DRY_RUN === "1";

  console.log(`[retention] target: ${url}`);
  console.log(`[retention] mode: ${dryRun ? "DRY_RUN (no RPC calls)" : "live"}`);
  console.log("[retention] schedule: daily 03:00 UTC via GH Actions");

  if (dryRun) {
    for (const { name, description } of RPCS) {
      console.log(`[retention] would call: ${name}() — ${description}`);
    }
    console.log("[retention] dry-run complete; exit 0");
    return 0;
  }

  const supabase = deps.createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let exitCode = 0;
  for (const { name } of RPCS) {
    const startedAt = Date.now();
    const { data, error } = await supabase.rpc(name);
    const elapsedMs = Date.now() - startedAt;

    if (error) {
      console.error(`[retention] ${name}() FAILED in ${elapsedMs}ms:`, error.message);
      exitCode = 2;
      continue;
    }
    console.log(`[retention] ${name}() ok in ${elapsedMs}ms — rows affected: ${data}`);
  }

  return exitCode;
}

// Entry point — only invoke main() when run as a script, NOT when
// imported by a test. Comparing argv[1] to the script path is the
// standard ESM pattern for "is this the entry point?".
const isEntry = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntry) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error("[retention] uncaught:", err);
      process.exit(2);
    });
}
