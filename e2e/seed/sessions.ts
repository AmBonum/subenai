import type { Database } from "../../src/integrations/supabase/types";
import { nextId, pad } from "./counters";
import { seedTest, type TestRow } from "./tests";
import { seedQuestion, type QuestionRow } from "./questions";
import { seedRespondent, type RespondentRow } from "./respondents";
import { EDUCATOR_SESSION } from "../fixtures/auth";

/**
 * `seedSession` maps to the `sessions` table (the respondent session row
 * created on test start; `sessions.test_id` references the parent test).
 */
export type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

export type SessionAnswerRow = Database["public"]["Tables"]["session_answers"]["Row"];

export function seedSession(overrides: Partial<SessionRow> = {}): SessionRow {
  const n = nextId("session");
  return {
    id: `sess_e2e_${pad(n)}`,
    test_id: "tst_e2e_001",
    version: 1,
    respondent_id: null,
    intake_data: {},
    consent_given: true,
    started_at: "2026-05-19T00:00:00.000Z",
    finished_at: null,
    score: null,
    status: "in_progress",
    segment: null,
    ip_hash: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// E49 Phase 1 — Test sessions detail seed helper.
//
// `seedE49TestWithSessions` mirrors the "Preconditions (shared)" block from
// `specs/app/test-sessions-detail.md`. It returns the rows needed to drive
// the Results-tab list AND the per-session side-sheet through the existing
// `mockSupabase` route layer; nothing is written to a real database, so no
// teardown registration is required (the in-memory mock state is rebuilt
// per test via `setupEducator` -> `resetSeedCounters` -> `mockSupabase`).
//
// Identity hierarchy under test (matches `SessionDetailSheet.respondentLabel`):
//   - `sess-completed-named`     -> intake_data.name set     -> shows name
//   - `sess-completed-email-only`-> intake_data.email only   -> shows e-mail
//   - `sess-completed-anon`      -> intake_data empty + anonymized respondent
//                                                            -> "Anonymný respondent"
// ---------------------------------------------------------------------------

export interface SeedE49Input {
  /** Test id used as the parent for every session row. */
  testId?: string;
  /** Owner id for the parent test. Defaults to EDUCATOR_SESSION.user.id. */
  ownerId?: string;
  /**
   * Second educator's test id used to assert IDOR — its session row is
   * owned by a DIFFERENT educator and must not leak through RLS.
   */
  foreignTestId?: string;
  /** Second educator's session id (under foreignTestId). */
  foreignSessionId?: string;
  /**
   * Optional empty-test id for the "no respondents" empty-state TC.
   * When present, an extra `tests` row with zero linked sessions is
   * included so the test plan's TC-13 fixture has a target.
   */
  emptyTestId?: string;
}

export interface SeedE49Sessions {
  named: SessionRow;
  emailOnly: SessionRow;
  anon: SessionRow;
  inProgress: SessionRow;
  abandoned: SessionRow;
  foreign: SessionRow;
}

export interface SeedE49Tables {
  tests: TestRow[];
  sessions: SessionRow[];
  session_answers: SessionAnswerRow[];
  questions: QuestionRow[];
  respondents: RespondentRow[];
}

export interface SeedE49Result {
  testId: string;
  foreignTestId: string;
  emptyTestId: string | null;
  sessions: SeedE49Sessions;
  tables: SeedE49Tables;
}

const T0 = "2026-05-19T10:00:00.000Z";
const T0_PLUS_5 = "2026-05-19T10:05:30.000Z"; // 5m 30s later — completed
const T0_PLUS_3 = "2026-05-19T10:03:15.000Z";
const T0_PLUS_8 = "2026-05-19T10:08:42.000Z";

const NAMED_AUDIT_HASH = "ab12cd34ef56gh78ij90kl"; // last 6 -> "90kl" + padding
const EMAIL_AUDIT_HASH = "zz99yy88xx77ww66vv55uu";
const ANON_AUDIT_HASH = "11223344556677889900AA";

/**
 * Seed a published test owned by the educator plus the five session
 * fixtures the test plan's "Preconditions (shared)" block contracts,
 * plus a foreign-owned session for the IDOR TC.
 *
 * The helper purposefully does NOT call `mockSupabase` itself — the
 * spec layers the returned `tables` shape into `setupEducator`'s
 * `extras.tables` so `setupEducator` remains the single source of
 * truth for the educator's signed-in shell.
 */
export function seedE49TestWithSessions(input: SeedE49Input = {}): SeedE49Result {
  const testId = input.testId ?? "e49-test-001";
  const ownerId = input.ownerId ?? EDUCATOR_SESSION.user.id;
  const foreignTestId = input.foreignTestId ?? "e49-test-other";
  const foreignSessionId = input.foreignSessionId ?? "sess-foreign-001";
  const emptyTestId = input.emptyTestId ?? null;

  // Two questions: one the respondent answers correctly, one incorrectly —
  // gives TC-11 both a "Správna odpoveď" and a "Nesprávna odpoveď" row.
  const qCorrect = seedQuestion({
    id: "q-e49-correct",
    prompt: "Aké je hlavné mesto Slovenska?",
    type: "short_text",
    correct: "Bratislava",
  });
  const qWrong = seedQuestion({
    id: "q-e49-wrong",
    prompt: "Koľko je 7 × 8?",
    type: "short_text",
    correct: "56",
  });

  // Respondents — one named, one e-mail only, one fully anonymized.
  const respNamed = seedRespondent({
    id: "resp-e49-named",
    email: "jana.novakova@example.com",
    display_name: "Jana Nováková",
  });
  const respEmail = seedRespondent({
    id: "resp-e49-email-only",
    email: "anon-email@example.com",
    display_name: null,
  });
  const respAnon = seedRespondent({
    id: "resp-e49-anon",
    email: null,
    display_name: null,
    anonymized_at: "2026-05-19T09:00:00.000Z",
  });

  // Parent test owned by the signed-in educator.
  const parentTest = seedTest({
    id: testId,
    slug: "e49-test-001",
    share_id: "e49-share-001",
    owner_id: ownerId,
    title: "E49 Test sessions detail",
    status: "published",
    published_at: "2026-05-18T00:00:00.000Z",
  });

  // Foreign test owned by a DIFFERENT educator. The `mockSupabase` envelope
  // applies `eq(test_id, ...)` filters from the query chain — RLS isn't
  // modelled, but the test selects by `sessions.id` and we rely on the
  // queries layer (`useUserSession`) doing a `maybeSingle()`; the result
  // is that fetching `sess-foreign-001` under `e49-test-001` triggers the
  // `sessionBelongsToTest` guard in SessionDetailSheet and renders
  // `session-detail-not-found`.
  const foreignTest = seedTest({
    id: foreignTestId,
    slug: "e49-test-other",
    share_id: "e49-share-other",
    owner_id: "00000000-0000-0000-0000-00000000ffff",
    title: "Other owner's test",
    status: "published",
  });

  const sessions: SeedE49Sessions = {
    named: seedSession({
      id: "sess-completed-named",
      test_id: testId,
      respondent_id: respNamed.id,
      intake_data: { name: "Jana Nováková", email: "jana.novakova@example.com" },
      consent_given: true,
      started_at: T0,
      finished_at: T0_PLUS_5,
      score: 85,
      status: "completed",
      ip_hash: NAMED_AUDIT_HASH,
    }),
    emailOnly: seedSession({
      id: "sess-completed-email-only",
      test_id: testId,
      respondent_id: respEmail.id,
      // Note: no `name` key — only `email`. Triggers the e-mail fallback.
      intake_data: { email: "anon-email@example.com" },
      consent_given: true,
      started_at: T0,
      finished_at: T0_PLUS_3,
      score: 60,
      status: "completed",
      ip_hash: EMAIL_AUDIT_HASH,
    }),
    anon: seedSession({
      id: "sess-completed-anon",
      test_id: testId,
      respondent_id: respAnon.id,
      intake_data: {},
      consent_given: true,
      started_at: T0,
      finished_at: T0_PLUS_8,
      score: 40,
      status: "completed",
      ip_hash: ANON_AUDIT_HASH,
    }),
    inProgress: seedSession({
      id: "sess-in-progress",
      test_id: testId,
      respondent_id: null,
      intake_data: { name: "Peter In-Progress" },
      consent_given: true,
      started_at: T0,
      finished_at: null,
      score: null,
      status: "in_progress",
      ip_hash: null,
    }),
    abandoned: seedSession({
      id: "sess-abandoned",
      test_id: testId,
      respondent_id: null,
      intake_data: { name: "Marek Abandoned" },
      consent_given: true,
      started_at: T0,
      finished_at: null,
      score: null,
      status: "abandoned",
      ip_hash: "deadbeefdeadbeefdeadbe",
    }),
    foreign: seedSession({
      id: foreignSessionId,
      test_id: foreignTestId,
      respondent_id: null,
      intake_data: { name: "Foreign respondent" },
      consent_given: true,
      started_at: T0,
      finished_at: T0_PLUS_5,
      score: 99,
      status: "completed",
      ip_hash: "ffffffffffffffffffff00",
    }),
  };

  // Per-question answers — only the "named" completed session populates
  // both correctness branches; the in-progress session is intentionally
  // left with ZERO `session_answers` rows so TC-15 exercises the empty
  // in-progress state.
  const session_answers: SessionAnswerRow[] = [
    {
      session_id: sessions.named.id,
      question_id: qCorrect.id,
      value: "Bratislava",
      is_correct: true,
      time_ms: 4200,
    },
    {
      session_id: sessions.named.id,
      question_id: qWrong.id,
      value: "54",
      is_correct: false,
      time_ms: 8100,
    },
    {
      session_id: sessions.abandoned.id,
      question_id: qCorrect.id,
      value: "Brno",
      is_correct: false,
      time_ms: 12000,
    },
  ];

  const tests: TestRow[] = [parentTest, foreignTest];
  if (emptyTestId) {
    tests.push(
      seedTest({
        id: emptyTestId,
        slug: "e49-test-empty",
        share_id: "e49-share-empty",
        owner_id: ownerId,
        title: "Empty E49 test",
        status: "published",
        published_at: "2026-05-18T00:00:00.000Z",
      }),
    );
  }

  return {
    testId,
    foreignTestId,
    emptyTestId,
    sessions,
    tables: {
      tests,
      sessions: [
        sessions.named,
        sessions.emailOnly,
        sessions.anon,
        sessions.inProgress,
        sessions.abandoned,
        sessions.foreign,
      ],
      session_answers,
      questions: [qCorrect, qWrong],
      respondents: [respNamed, respEmail, respAnon],
    },
  };
}
