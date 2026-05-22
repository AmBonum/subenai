/**
 * E49 Phase 1c — seed runner for the live-Supabase fixture data.
 *
 * Usage:
 *   npx tsx e2e/scripts/seed-e49-data.ts --apply     # (default) seed
 *   npx tsx e2e/scripts/seed-e49-data.ts --cleanup   # delete all e2e-e49-* rows
 *   npx tsx e2e/scripts/seed-e49-data.ts --verify    # exit 1 if any survive
 *
 * Connection
 * ----------
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_TEST_KEY (preferred) or
 * SUPABASE_SERVICE_ROLE_KEY (fallback for the prod-via-dashboard
 * execution path). Aborts if neither is set.
 *
 * Apply path
 * ----------
 * `--apply` executes `e2e/seed/sql/e49-e2e-data.sql` via `psql` using the
 * local Supabase DB URL. For local development this expects
 * `DATABASE_URL` (preferred) or the convention
 * `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
 *
 * For PROD (dashboard) execution, the user pastes the SQL file body into
 * the dashboard SQL editor — see the report header in the SQL file. The
 * runner refuses to apply against the prod project ref unless
 * `E49_E2E_SEED_FORCE_PROD=1` is set explicitly.
 *
 * Cleanup + verify use the Supabase admin REST client (which works
 * uniformly against local and prod) and the explicit ID set from
 * `e2e/fixtures/e49-fixtures.ts` — Postgres uuid columns don't support
 * LIKE, so we `.in(...)` the deterministic UUIDs instead of guessing.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  E49_LARGE_SESSION_COUNT,
  E49_ARCHIVED_SESSION_COUNT,
  E49_QUESTION_IDS,
  E49_SESSION_IDS_SYMBOLIC,
  E49_TEST_IDS,
  E49_USER_IDS,
  e49ArchivedSessionId,
  e49LargeSessionId,
} from "../fixtures/e49-fixtures";

const PROD_PROJECT_REF = "lwxichbuvcakscntjkzs";
const DEFAULT_LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

type Mode = "apply" | "cleanup" | "verify";

function parseMode(argv: readonly string[]): Mode {
  if (argv.includes("--cleanup")) return "cleanup";
  if (argv.includes("--verify")) return "verify";
  return "apply";
}

function getEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

function getServiceCredentials(): { url: string; key: string } {
  const url = getEnv("SUPABASE_URL") ?? getEnv("VITE_SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_TEST_KEY") ?? getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url) {
    throw new Error("E49 seed: SUPABASE_URL (or VITE_SUPABASE_URL) is not set.");
  }
  if (!key) {
    throw new Error(
      "E49 seed: neither SUPABASE_SERVICE_ROLE_TEST_KEY nor SUPABASE_SERVICE_ROLE_KEY is set.",
    );
  }
  return { url, key };
}

function isProd(url: string): boolean {
  return url.includes(PROD_PROJECT_REF);
}

function guardProd(url: string, mode: Mode): void {
  if (!isProd(url)) return;
  if (mode === "apply" && getEnv("E49_E2E_SEED_FORCE_PROD") !== "1") {
    throw new Error(
      `E49 seed: refused to --apply against prod (${PROD_PROJECT_REF}). ` +
        "Run the SQL via the dashboard SQL editor instead, or set " +
        "E49_E2E_SEED_FORCE_PROD=1 to override (only the user seed normally lives in prod).",
    );
  }
}

function readSqlFile(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sqlPath = path.resolve(here, "../seed/sql/e49-e2e-data.sql");
  if (!existsSync(sqlPath)) {
    throw new Error(`E49 seed: SQL file not found at ${sqlPath}`);
  }
  return readFileSync(sqlPath, "utf8");
}

function runPsql(sql: string): void {
  const dbUrl = getEnv("DATABASE_URL") ?? DEFAULT_LOCAL_DB_URL;
  try {
    execFileSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-q"], {
      input: sql,
      stdio: ["pipe", "inherit", "inherit"],
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(
      `E49 seed: psql apply failed against ${dbUrl}. ` +
        "If psql is not installed locally, paste the SQL file body into " +
        "the Supabase dashboard SQL editor manually. " +
        `(${reason})`,
    );
  }
}

interface CountResult {
  table: string;
  remaining: number;
}

async function cleanupRows(client: SupabaseClient): Promise<CountResult[]> {
  const largeIds = Array.from({ length: E49_LARGE_SESSION_COUNT }, (_, i) =>
    e49LargeSessionId(i + 1),
  );
  const archivedIds = Array.from({ length: E49_ARCHIVED_SESSION_COUNT }, (_, i) =>
    e49ArchivedSessionId(i + 1),
  );
  const allSessionIds = [...E49_SESSION_IDS_SYMBOLIC, ...largeIds, ...archivedIds];

  // Order matters: children → parents.
  const ops: { table: string; column: string; ids: readonly string[] }[] = [
    { table: "session_answers", column: "session_id", ids: allSessionIds },
    { table: "sessions", column: "id", ids: allSessionIds },
    { table: "test_questions", column: "test_id", ids: E49_TEST_IDS },
    { table: "tests", column: "id", ids: E49_TEST_IDS },
    { table: "questions", column: "id", ids: E49_QUESTION_IDS },
  ];

  const results: CountResult[] = [];
  for (const op of ops) {
    const { error, count } = await client
      .from(op.table)
      .delete({ count: "exact" })
      .in(op.column, op.ids as string[]);
    if (error) {
      throw new Error(`E49 cleanup: delete ${op.table} failed — ${error.message}`);
    }
    results.push({ table: op.table, remaining: count ?? 0 });
  }

  // audit_log scoped to our four actor ids. Best-effort: the table may
  // have INSERT-only RLS, so we tolerate "permission denied" silently.
  const { error: auditErr } = await client
    .from("audit_log")
    .delete()
    .in("actor_id", E49_USER_IDS as unknown as string[]);
  if (auditErr && !/permission/i.test(auditErr.message)) {
    throw new Error(`E49 cleanup: audit_log delete failed — ${auditErr.message}`);
  }

  // user_roles: keep the 'user' rows seeded by handle_new_user; only the
  // admin promotion row matters for state convergence. Remove the
  // explicit admin row if E49_DROP_USERS is set (uncommon — we keep
  // users across runs to save the rate-limited auth provisioning).
  if (getEnv("E49_DROP_USERS") === "1") {
    await client.auth.admin.deleteUser(E49_USER_IDS[0]).catch(() => undefined);
    await client.auth.admin.deleteUser(E49_USER_IDS[1]).catch(() => undefined);
    await client.auth.admin.deleteUser(E49_USER_IDS[2]).catch(() => undefined);
    await client.auth.admin.deleteUser(E49_USER_IDS[3]).catch(() => undefined);
  }

  return results;
}

async function verifyCleanup(client: SupabaseClient): Promise<CountResult[]> {
  const largeIds = Array.from({ length: E49_LARGE_SESSION_COUNT }, (_, i) =>
    e49LargeSessionId(i + 1),
  );
  const archivedIds = Array.from({ length: E49_ARCHIVED_SESSION_COUNT }, (_, i) =>
    e49ArchivedSessionId(i + 1),
  );
  const allSessionIds = [...E49_SESSION_IDS_SYMBOLIC, ...largeIds, ...archivedIds];

  const checks: { table: string; column: string; ids: readonly string[] }[] = [
    { table: "session_answers", column: "session_id", ids: allSessionIds },
    { table: "sessions", column: "id", ids: allSessionIds },
    { table: "test_questions", column: "test_id", ids: E49_TEST_IDS },
    { table: "tests", column: "id", ids: E49_TEST_IDS },
    { table: "questions", column: "id", ids: E49_QUESTION_IDS },
  ];

  const results: CountResult[] = [];
  for (const op of checks) {
    const { count, error } = await client
      .from(op.table)
      .select("*", { count: "exact", head: true })
      .in(op.column, op.ids as string[]);
    if (error) {
      throw new Error(`E49 verify: count ${op.table} failed — ${error.message}`);
    }
    results.push({ table: op.table, remaining: count ?? 0 });
  }
  return results;
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const { url, key } = getServiceCredentials();
  guardProd(url, mode);

  if (mode === "apply") {
    const sql = readSqlFile();
    console.log(
      `[E49 seed] applying SQL via psql (${getEnv("DATABASE_URL") ?? DEFAULT_LOCAL_DB_URL})`,
    );
    runPsql(sql);
    console.log("[E49 seed] apply OK");
    return;
  }

  const client = createClient(url, key);

  if (mode === "cleanup") {
    const counts = await cleanupRows(client);
    for (const c of counts) {
      console.log(`[E49 cleanup] ${c.table}: deleted ${c.remaining}`);
    }
    return;
  }

  // verify
  const counts = await verifyCleanup(client);
  let total = 0;
  for (const c of counts) {
    console.log(`[E49 verify] ${c.table}: remaining ${c.remaining}`);
    total += c.remaining;
  }
  if (total !== 0) {
    console.error(`[E49 verify] FAIL — ${total} e2e-e49-* row(s) survived cleanup.`);
    process.exit(1);
  }
  console.log("[E49 verify] OK — zero e2e-e49-* rows.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
