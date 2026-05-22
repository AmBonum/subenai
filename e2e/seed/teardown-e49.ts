/**
 * E49 Phase 1c — teardown helper invoked from `e2e/global-teardown.ts`.
 *
 * Skipped silently if SUPABASE_URL + service-role key aren't available
 * (matches the E48 cleanup behaviour — CI without Supabase still passes).
 *
 * Uses the explicit ID set from `e2e/fixtures/e49-fixtures.ts` because
 * Postgres uuid columns don't support LIKE; `.in(...)` is the safe
 * PostgREST equivalent.
 *
 * Honours:
 *   - CI_SKIP_SEED_CLEANUP=1  (handled by the caller, not here)
 *   - E49_TEARDOWN_VERIFY=1   re-counts rows post-delete; exits 1 if any survive
 *   - E49_DROP_USERS=1        also drops the four TU-* auth.users rows
 */

import { createClient } from "@supabase/supabase-js";

import {
  E49_ARCHIVED_SESSION_COUNT,
  E49_LARGE_SESSION_COUNT,
  E49_QUESTION_IDS,
  E49_SESSION_IDS_SYMBOLIC,
  E49_TEST_IDS,
  E49_USER_IDS,
  e49ArchivedSessionId,
  e49LargeSessionId,
} from "../fixtures/e49-fixtures";

function readCreds(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_TEST_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return null;
  return { url, key };
}

function allSessionIds(): string[] {
  const large = Array.from({ length: E49_LARGE_SESSION_COUNT }, (_, i) => e49LargeSessionId(i + 1));
  const archived = Array.from({ length: E49_ARCHIVED_SESSION_COUNT }, (_, i) =>
    e49ArchivedSessionId(i + 1),
  );
  return [...E49_SESSION_IDS_SYMBOLIC, ...large, ...archived];
}

export async function cleanupE49(): Promise<{ deleted: number } | { skipped: true }> {
  const creds = readCreds();
  if (!creds) {
    console.log("[E49 seed cleanup] skipped — SUPABASE_URL or service-role key not set");
    return { skipped: true };
  }
  const client = createClient(creds.url, creds.key);
  const sessionIds = allSessionIds();

  const ops: { table: string; column: string; ids: string[] }[] = [
    { table: "session_answers", column: "session_id", ids: sessionIds },
    { table: "sessions", column: "id", ids: sessionIds },
    { table: "test_questions", column: "test_id", ids: [...E49_TEST_IDS] },
    { table: "tests", column: "id", ids: [...E49_TEST_IDS] },
    { table: "questions", column: "id", ids: [...E49_QUESTION_IDS] },
  ];

  let deleted = 0;
  for (const op of ops) {
    const { error, count } = await client
      .from(op.table)
      .delete({ count: "exact" })
      .in(op.column, op.ids);
    if (error) {
      // Don't crash the whole teardown — surface and continue.
      console.warn(`[E49 seed cleanup] delete ${op.table} failed: ${error.message}`);
      continue;
    }
    deleted += count ?? 0;
  }

  // audit_log: scope to the four TU-* actor ids. RLS may forbid DELETE on
  // audit_log in some environments; tolerate "permission denied".
  const { error: auditErr } = await client
    .from("audit_log")
    .delete()
    .in("actor_id", [...E49_USER_IDS]);
  if (auditErr && !/permission|denied/i.test(auditErr.message)) {
    console.warn(`[E49 seed cleanup] audit_log delete failed: ${auditErr.message}`);
  }

  if (process.env.E49_DROP_USERS === "1") {
    for (const id of E49_USER_IDS) {
      await client.auth.admin.deleteUser(id).catch((err) => {
        console.warn(`[E49 seed cleanup] deleteUser ${id} failed: ${err?.message ?? err}`);
      });
    }
  }

  if (process.env.E49_TEARDOWN_VERIFY === "1") {
    let remaining = 0;
    for (const op of ops) {
      const { count } = await client
        .from(op.table)
        .select("*", { count: "exact", head: true })
        .in(op.column, op.ids);
      remaining += count ?? 0;
    }
    if (remaining > 0) {
      console.error(`[E49 seed cleanup] VERIFY FAILED — ${remaining} row(s) survived`);
      process.exit(1);
    }
  }

  console.log(`[E49 seed cleanup] deleted ${deleted} row(s) across fixtures`);
  return { deleted };
}
