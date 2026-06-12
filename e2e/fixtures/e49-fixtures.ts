/**
 * E49 Phase 1c — symbolic constants for the deterministic test-data
 * fixtures seeded via `supabase/scripts/seed-e49-e2e-users.sql` +
 * `e2e/seed/sql/e49-e2e-data.sql`.
 *
 * Specs MUST reference these constants, never the literal UUIDs — both
 * for readability and so a teardown script can compute the cleanup
 * set from the same source of truth.
 *
 * UUID convention (so a teardown can `.in(...)` cleanly even though
 * Postgres uuid columns don't support LIKE):
 *   - first 8 chars: `e2e00001`        (project / phase tag)
 *   - next 4 chars : `e49a`            (epic tag)
 *   - next 4 chars : `4001`            (RFC-4122 v4 marker — version+variant nibble)
 *   - next 4 chars : `8001`            (variant nibble + sub-namespace)
 *   - last 12 chars: meaningful suffix per row
 *
 * The TS-level type `Uuid` is just a brand alias for `string` — the
 * runtime values are validated by Postgres on insert.
 */

export type Uuid = string;

// ---------------------------------------------------------------------------
// Users — must match `supabase/scripts/seed-e49-e2e-users.sql`.
// ---------------------------------------------------------------------------

// LOCAL Docker Supabase only. The literal default is fine for the
// throwaway local stack; for any shared/remote project the password
// must come from the env override and never be committed (2026-06-12
// security audit — the old literal was seeded to prod and burned).
export const E49_PASSWORD = process.env.E2E_E49_PASSWORD ?? "E2E-e49-pwd-do-not-reuse";

export const E49_USERS = {
  educatorA: {
    id: "e2e00001-e49a-4001-8001-0000aaaaaa01",
    email: "e2e-e49-educator-a@subenai.test",
    displayName: "E2E E49 Educator A",
    role: "user",
  },
  educatorB: {
    id: "e2e00001-e49a-4001-8001-0000bbbbbb02",
    email: "e2e-e49-educator-b@subenai.test",
    displayName: "E2E E49 Educator B",
    role: "user",
  },
  respondent: {
    id: "e2e00001-e49a-4001-8001-0000cccccc03",
    email: "e2e-e49-respondent@subenai.test",
    displayName: "E2E E49 Respondent",
    role: "user",
  },
  admin: {
    id: "e2e00001-e49a-4001-8001-0000dddddd04",
    email: "e2e-e49-admin@subenai.test",
    displayName: "E2E E49 Admin",
    role: "admin",
  },
} as const;

export const E49_USER_IDS = [
  E49_USERS.educatorA.id,
  E49_USERS.educatorB.id,
  E49_USERS.respondent.id,
  E49_USERS.admin.id,
] as const satisfies readonly Uuid[];

// ---------------------------------------------------------------------------
// Tests — 9 fixtures matching the "Test-data fixtures" table in
// `tasks/PLAN-2026-05-22-E49-test-scenarios.md`.
// ---------------------------------------------------------------------------

export const E49_TESTS = {
  emptyPublished: "e2e00001-e49a-4001-8001-00007e570001",
  typicalPublished: "e2e00001-e49a-4001-8001-00007e570002",
  pwProtected: "e2e00001-e49a-4001-8001-00007e570003",
  largePublished: "e2e00001-e49a-4001-8001-00007e570004",
  archived: "e2e00001-e49a-4001-8001-00007e570005",
  draftEmpty: "e2e00001-e49a-4001-8001-00007e570006",
  withXssRespondent: "e2e00001-e49a-4001-8001-00007e570007",
  foreignPublished: "e2e00001-e49a-4001-8001-00007e57b001",
  foreignWithSessions: "e2e00001-e49a-4001-8001-00007e57b002",
} as const;

export const E49_TEST_IDS = Object.values(E49_TESTS) as readonly Uuid[];

// ---------------------------------------------------------------------------
// Questions library — 5 questions plus a stale-question target.
// ---------------------------------------------------------------------------

export const E49_QUESTIONS = {
  q001ArrayCorrect: "e2e00001-e49a-4001-8001-0000ffff0001",
  q002ArrayCorrect: "e2e00001-e49a-4001-8001-0000ffff0002",
  q003ArrayCorrect: "e2e00001-e49a-4001-8001-0000ffff0003",
  q004StringCorrect: "e2e00001-e49a-4001-8001-0000ffff0004",
  q005NullCorrect: "e2e00001-e49a-4001-8001-0000ffff0005",
} as const;

export const E49_QUESTION_IDS = Object.values(E49_QUESTIONS) as readonly Uuid[];

// ---------------------------------------------------------------------------
// Sessions under E49_TESTS.typicalPublished — identity-shape variety.
// ---------------------------------------------------------------------------

export const E49_SESSIONS = {
  typicalCompletedNamed: "e2e00001-e49a-4001-8001-000055550001",
  typicalCompletedEmailOnly: "e2e00001-e49a-4001-8001-000055550002",
  typicalCompletedAnon: "e2e00001-e49a-4001-8001-000055550003",
  typicalInProgress: "e2e00001-e49a-4001-8001-000055550004",
  typicalAbandoned: "e2e00001-e49a-4001-8001-000055550005",
  // Password-protected — single completed session.
  pwCompleted: "e2e00001-e49a-4001-8001-0000555599a1",
  // XSS-respondent — 6 representative payloads.
  xssScript: "e2e00001-e49a-4001-8001-0000555599b1",
  xssImg: "e2e00001-e49a-4001-8001-0000555599b2",
  xssRtl: "e2e00001-e49a-4001-8001-0000555599b3",
  xssCsvFormula: "e2e00001-e49a-4001-8001-0000555599b4",
  xssCsvPlus: "e2e00001-e49a-4001-8001-0000555599b5",
  xssCsvAt: "e2e00001-e49a-4001-8001-0000555599b6",
  // Archived — 12 sessions (only first one is symbolic; rest generated).
  archivedFirst: "e2e00001-e49a-4001-8001-00005555a001",
  // Foreign-with-sessions — exactly one foreign session for IDOR.
  foreignSession: "e2e00001-e49a-4001-8001-00005555f001",
} as const;

export const E49_SESSION_IDS_SYMBOLIC = Object.values(E49_SESSIONS) as readonly Uuid[];

/**
 * Deterministic helpers for bulk-generated session IDs (large + archived
 * fixtures). These produce valid hex UUIDs in the same namespace as
 * `E49_SESSIONS` by hex-encoding `index` into the last 12 chars.
 *
 *   large   : `e2e00001-e49a-4001-8001-1arge<hex8>`
 *   archived: `e2e00001-e49a-4001-8001-a1c<hex9>`  (a1c = "arc")
 */
function hexPad(index: number, width: number): string {
  return index.toString(16).padStart(width, "0");
}

export function e49LargeSessionId(index: number): Uuid {
  // "1a19e" is a hex-only mnemonic for "large".
  return `e2e00001-e49a-4001-8001-1a19e${hexPad(index, 7)}` as Uuid;
}

export function e49ArchivedSessionId(index: number): Uuid {
  // "a9c" is a hex-only mnemonic for "arc(hived)".
  return `e2e00001-e49a-4001-8001-a9c${hexPad(index, 9)}` as Uuid;
}

/** Number of sessions seeded for `E49_TESTS.largePublished`. */
export const E49_LARGE_SESSION_COUNT = 47;

/** Number of sessions seeded for `E49_TESTS.archived`. */
export const E49_ARCHIVED_SESSION_COUNT = 12;

/**
 * The XSS payloads embedded in `intake_data.name` for the
 * `withXssRespondent` test. Kept inline (rather than imported from
 * `tests/security/e48-payloads.ts`) because the full payload battery
 * lives at Layer A; here we ship 6 representative ones the live-Supabase
 * fixture row physically materialises.
 */
export const E49_XSS_PAYLOADS = [
  "<script>alert(1)</script>",
  '"><img src=x onerror=alert(1)>',
  "‮gnirts.lams", // RTL override
  "=cmd|'/c calc'!A1",
  "+1+2",
  "@SUM(A1:A10)",
] as const;

// ---------------------------------------------------------------------------
// Shared identity / convenience exports.
// ---------------------------------------------------------------------------

export const E49_TEST_TYPICAL = E49_TESTS.typicalPublished;
export const E49_TEST_FOREIGN = E49_TESTS.foreignPublished;
export const E49_TEST_FOREIGN_WITH_SESSIONS = E49_TESTS.foreignWithSessions;
export const E49_FOREIGN_SESSION = E49_SESSIONS.foreignSession;
