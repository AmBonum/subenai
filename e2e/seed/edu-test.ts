// HTTP-based edu test factory for e2e tests.
//
// All mutations go through real CF Functions endpoints — same path as a real
// user. No service-role client here; the Playwright process only needs
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for TC-11's DB-read assertion.
//
// Cleanup note: test data accumulates in the dev DB across runs because
// there is no admin-protected DELETE endpoint for test sets. This is
// acceptable for local dev. TC-isolated set_ids ensure counter isolation.

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";

// First 5 question IDs from the live question bank (src/lib/quiz/bank/questions.ts).
// These must exist in the local QUESTIONS array or /api/test-sets will reject them.
const DEFAULT_QUESTION_IDS = [
  "p-sms-posta-1",
  "p-sms-dpd-1",
  "p-sms-tatra-1",
  "p-sms-slsp-1",
  "p-sms-csob-1",
];

export interface SeedEduTestOptions {
  /** Plaintext password sent to /api/test-sets — server bcrypt-hashes it. */
  password: string;
  /** passing_threshold 0–100. Default 70. */
  passingThreshold?: number;
  /** Question IDs to include. Must be valid IDs from the live bank. */
  questionIds?: string[];
  /** creator_label shown in dashboard header. */
  creatorLabel?: string;
  /** Respondent rows to pre-seed via begin + finish endpoints. */
  respondents?: Array<{ name: string; email: string; score: number }>;
  /** Base URL override. Defaults to process.env.BASE_URL ?? http://localhost:8080 */
  baseUrl?: string;
}

export interface SeedEduTestResult {
  /** UUID of the created test_set row. */
  id: string;
  /** Full URL path usable in page.goto(): /test/zostava/${id} */
  respondent_url: string;
  /** Full URL path usable in page.goto(): /test/zostava/${id}/vysledky */
  results_url: string;
  /** The plaintext password supplied by caller. */
  password: string;
  /** UUIDs of created attempt rows (in same order as respondents input). */
  attempt_ids: string[];
}

function makeShareId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function seedEduTest(opts: SeedEduTestOptions): Promise<SeedEduTestResult> {
  const base = opts.baseUrl ?? BASE_URL;
  const questionIds = opts.questionIds ?? DEFAULT_QUESTION_IDS;
  const passingThreshold = opts.passingThreshold ?? 70;

  // Step 1: create the test set
  const createRes = await fetch(`${base}/api/test-sets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      question_ids: questionIds,
      passing_threshold: passingThreshold,
      max_questions: questionIds.length,
      creator_label: opts.creatorLabel ?? "E2E Edu Test",
      collects_responses: true,
      author_password: opts.password,
    }),
  });

  if (!createRes.ok) {
    const body = (await createRes.json()) as { error?: string };
    throw new Error(
      `seedEduTest: POST /api/test-sets failed (${createRes.status}): ${body.error ?? "unknown"}`,
    );
  }

  const created = (await createRes.json()) as { id: string; url: string; results_url: string };
  const setId = created.id;

  // Step 2: seed respondent attempts via begin + finish
  const attemptIds: string[] = [];

  for (const r of opts.respondents ?? []) {
    // begin-edu-attempt: get a respondent JWT
    const beginRes = await fetch(`${base}/api/begin-edu-attempt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        set_id: setId,
        name: r.name,
        email: r.email,
        consent: true,
        hp_url: "",
      }),
    });

    if (!beginRes.ok) {
      const body = (await beginRes.json()) as { error?: string };
      throw new Error(
        `seedEduTest: begin-edu-attempt for ${r.email} failed (${beginRes.status}): ${body.error ?? "unknown"}`,
      );
    }

    const { token } = (await beginRes.json()) as { token: string };

    // finish-edu-attempt: persist the attempt with the given score
    const finishRes = await fetch(`${base}/api/finish-edu-attempt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        share_id: makeShareId(),
        final_score: r.score,
        base_score: r.score,
        total_penalty: 0,
        percentile: 50,
        personality: "vigilant",
        total_time_ms: 60000,
        breakdown: {},
        insights: [],
        stats: {},
        flags: {},
        answers: {},
      }),
    });

    if (!finishRes.ok) {
      const body = (await finishRes.json()) as { error?: string };
      throw new Error(
        `seedEduTest: finish-edu-attempt for ${r.email} failed (${finishRes.status}): ${body.error ?? "unknown"}`,
      );
    }

    const finished = (await finishRes.json()) as { attempt_id?: string };
    if (finished.attempt_id) {
      attemptIds.push(finished.attempt_id);
    }
  }

  return {
    id: setId,
    respondent_url: `/test/zostava/${setId}`,
    results_url: `/test/zostava/${setId}/vysledky`,
    password: opts.password,
    attempt_ids: attemptIds,
  };
}
