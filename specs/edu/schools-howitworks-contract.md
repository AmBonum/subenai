# `/schools` "Ako to funguje" — end-to-end contract test plan

**Area:** `specs/edu/`
**Component(s) under test:**
- `src/routes/test.zostav.lazy.tsx` (Composer form, EduSettings, submit)
- `src/components/composer/edu/intake/EduSettings.tsx` (toggle + password)
- `src/components/composer/edu/intake/EduSuccessDialog.tsx` (3-field dialog)
- `src/components/composer/edu/intake/RespondentIntakeForm.tsx` (intake form)
- `src/components/composer/edu/dashboard/AuthorPasswordGate.tsx` (gate form)
- `src/components/composer/edu/dashboard/AggregateStats.tsx` (5-number summary)
- `src/components/composer/edu/dashboard/RespondentsTable.tsx` (table, sort, delete)
- `src/routes/test.zostava.$id.vysledky.lazy.tsx` (results page orchestration)
- `src/lib/edu/types.ts` (`rowsToCsv`)
**Routes:** `/test/zostav`, `/test/zostava/$id`, `/test/zostava/$id/vysledky`
**API endpoints:**
- `POST /api/test-sets` (create test set with edu mode)
- `POST /api/begin-edu-attempt` (issue attempt JWT)
- `POST /api/finish-edu-attempt` (persist attempt row)
- `POST /api/verify-author-password` (issue author session cookie)
- `DELETE /api/verify-author-password` (logout — clear cookie)
- `POST /api/results-data` (aggregate + respondent rows)
- `POST /api/delete-edu-respondent` (delete one attempt row)
**Data dependencies:**
- `public.test_sets` with `collects_responses = true` and `author_password_hash` (bcrypt via `hash_test_set_password` RPC)
- `public.attempts` with `respondent_name`, `respondent_email`, `final_score` (non-null for edu rows)
- `public.audit_log` — **P0 FINDING: not written by `delete-edu-respondent.ts` as of 2026-05-19** (see Risks section)
- `EDU_JWT_SECRET` / `JWT_SECRET` env vars in CF Pages `.dev.vars`
- Supabase service-role key in `SUPABASE_SERVICE_ROLE_KEY`
**Source stories:**
- `tasks/stories/E12.1-edu-schema.md` (AC-1 through AC-6)
- `tasks/stories/E12.2-composer-edu-toggle.md` (AC-1 through AC-6)
- `tasks/stories/E12.3-respondent-intake.md` (AC-1 through AC-7)
- `tasks/stories/E12.4-results-dashboard.md` (AC-1 through AC-10)
**Last updated:** 2026-05-19

---

## Context

Epic E12 (Education mode) enables teachers, lecturers, and HR managers to create password-protected tests that collect respondents' names, e-mails, and GDPR consent before the test starts, and then view per-respondent results via a password-gated dashboard. The `/schools` marketing page describes this workflow as a 4-step process ("Ako to funguje krok za krokom"). This plan verifies that every public-facing promise on that page maps to real, working behavior — not just rendered text. It is the contract counterpart to `specs/marketing/schools.md`, which only checks landing-page rendering.

The plan is complementary to `specs/marketing/schools.md` (which covers the `/schools` landing rendering) and to `specs/quiz/composer.md` (which covers non-edu composer micro-interactions). It does not duplicate those plans.

---

## Missing `data-testid` attributes (flag for generator before implementation)

The generator must add these testids to source files before writing any TC selector. No testid may be inferred from class names or element position.

### `src/routes/test.zostav.lazy.tsx`
| Suggested test-id | Element |
|---|---|
| `composer-edu-settings-section` | The `<section>` wrapping `<EduSettings>` inside the composer form |
| `composer-edu-success-dialog` | The `<EduSuccessDialog>` root (or its `DialogContent`) |

### `src/components/composer/edu/intake/EduSettings.tsx`
| Suggested test-id | Element |
|---|---|
| `edu-settings-toggle` | The `<button role="switch">` for "Zbierať odpovede s menom a e-mailom" |
| `edu-settings-password-input` | The `<input type="password">` for "Heslo na pozeranie výsledkov" |
| `edu-settings-password-hint` | The `<p>` helper text below the password input |

### `src/components/composer/edu/intake/EduSuccessDialog.tsx`
| Suggested test-id | Element |
|---|---|
| `edu-success-public-link` | The `<p>` displaying the public respondent URL value |
| `edu-success-results-link` | The `<p>` displaying the results URL value |
| `edu-success-password-value` | The `<p>` displaying the plaintext password value |
| `edu-success-ack-checkbox` | The acknowledge `<input type="checkbox">` |
| `edu-success-close-button` | The "Hotovo, zatvoriť" `<Button>` |

### `src/components/composer/edu/intake/RespondentIntakeForm.tsx`
| Suggested test-id | Element |
|---|---|
| `intake-form-root` | The `<form>` element |
| `intake-form-disclosure` | The disclosure `<div>` (author + retention paragraph) |
| `intake-form-name-input` | The name `<input>` |
| `intake-form-email-input` | The email `<input>` |
| `intake-form-consent-checkbox` | The GDPR consent `<input type="checkbox">` |
| `intake-form-submit-button` | The submit `<Button>` |
| `intake-form-error-message` | The `<p role="alert">` error paragraph |

### `src/components/composer/edu/dashboard/AuthorPasswordGate.tsx`
The file already has `data-testid="vysledky-gate-password-input"`. Also needed:

| Suggested test-id | Element |
|---|---|
| `vysledky-gate-submit-button` | The submit `<button>` ("Otvoriť výsledky →") |
| `vysledky-gate-error-message` | The `<p role="alert">` error paragraph |

### `src/components/composer/edu/dashboard/AggregateStats.tsx`
| Suggested test-id | Element |
|---|---|
| `agg-stats-root` | The outermost `<section>` |
| `agg-stats-count` | The `<dd>` cell for respondent count |
| `agg-stats-avg` | The `<dd>` cell for average |
| `agg-stats-median` | The `<dd>` cell for median |
| `agg-stats-min-max` | The `<dd>` cell for min/max |
| `agg-stats-pass-value` | The `<dd>` cell for pass count + rate |
| `agg-stats-band-0` | The `<li>` bar for band "0–24" |
| `agg-stats-band-1` | The `<li>` bar for band "25–49" |
| `agg-stats-band-2` | The `<li>` bar for band "50–74" |
| `agg-stats-band-3` | The `<li>` bar for band "75–100" |

### `src/components/composer/edu/dashboard/RespondentsTable.tsx`
| Suggested test-id | Element |
|---|---|
| `resp-table-root` | The outermost `<section>` |
| `resp-table-search` | The `<input type="search">` |
| `resp-table-table` | The `<table>` element |
| `resp-table-row-{id}` | Each `<tr>` (replace `{id}` with `row.id`) |
| `resp-table-delete-btn-{id}` | The delete `<button>` in each row |
| `resp-table-empty` | The empty-state `<p>` |

### `src/routes/test.zostava.$id.vysledky.lazy.tsx`
Already has `data-testid="vysledky-auth-gate"`, `data-testid="vysledky-gate-heading"`, `data-testid="vysledky-dashboard"`. Also needed:

| Suggested test-id | Element |
|---|---|
| `vysledky-download-csv-button` | The "Stiahnuť CSV" `<Button>` |
| `vysledky-logout-button` | The "Odhlásiť" `<Button>` |
| `vysledky-dashboard-heading` | The `<h1>` inside the ready dashboard |
| `vysledky-meta-line` | The `<p>` with question count / threshold / respondent count |

---

## Test data setup

No `seedEduTest` factory exists in `e2e/seed/` as of 2026-05-19. The generator must create `e2e/seed/edu-test.ts` with the following shape (add to `e2e/seed/index.ts` exports):

```typescript
// e2e/seed/edu-test.ts
// Creates a real edu test_set row + N respondent attempt rows in the
// local Supabase via service-role client. Returns the IDs needed to
// drive e2e tests without going through the Composer UI.
//
// Usage:
//   const edu = await seedEduTest({ password: "password123" });
//   // navigate to edu.respondent_url → intake form
//   // navigate to edu.results_url → password gate

export interface SeedEduTestOptions {
  /** Plaintext password that will be hashed server-side via hash_test_set_password RPC. */
  password: string;
  /** passing_threshold 0–100. Default 70. */
  passingThreshold?: number;
  /** Question IDs to include. Must be valid IDs from the local bank. Default: first 5 from QUESTIONS. */
  questionIds?: string[];
  /** creator_label shown in dashboard header. Default: "E2E Edu Test". */
  creatorLabel?: string;
  /** Respondent attempt rows to pre-seed. Pass scores; the factory generates names + emails. */
  respondents?: Array<{ name: string; email: string; score: number }>;
}

export interface SeedEduTestResult {
  /** UUID of the created test_set row. */
  id: string;
  /** Full URL path usable in page.goto(): `/test/zostava/${id}` */
  respondent_url: string;
  /** Full URL path usable in page.goto(): `/test/zostava/${id}/vysledky` */
  results_url: string;
  /** The plaintext password supplied by caller (NOT stored anywhere; caller holds it). */
  password: string;
  /** UUIDs of created attempt rows (in same order as `respondents` input). */
  attempt_ids: string[];
}

export async function seedEduTest(opts: SeedEduTestOptions): Promise<SeedEduTestResult>;
```

Implementation notes for the generator:

1. Use `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `process.env` (same pattern as other seed helpers).
2. Call `supabase.rpc("hash_test_set_password", { password: opts.password })` to get the bcrypt hash, then INSERT into `test_sets` with `collects_responses: true, author_password_hash: hash`.
3. For each `opts.respondents` entry, INSERT into `attempts` with `test_set_id`, `respondent_name`, `respondent_email`, `final_score`, `share_id` (UUID), `total_time_ms` (any value e.g. 60000), `percentile` (can be 0 for seeds — not asserted in most TCs).
4. Add a cleanup helper `cleanupEduTest(id: string): Promise<void>` that DELETEs attempts and test_set row; call from `test.afterEach` in specs that use this seed.
5. Export type `SeedEduTestResult` from `e2e/seed/index.ts`.

---

## Out of scope

- `/schools` landing page rendering — covered by `specs/marketing/schools.md`. This plan does NOT re-test that the 4-step text renders correctly; it tests that the 4-step workflow functions correctly.
- Composer non-edu micro-interactions (pack chip toggle, question picker filter, threshold slider) — covered by `specs/quiz/composer.md`.
- Anonymous quiz flow on `/test/zostava/$id` when `collects_responses = false` — covered by `specs/quiz/shared-set.md`.
- Raw RPC unit tests (`verify_test_set_password`, `hash_test_set_password`) — covered by `tests/db/` and `tests/functions/`.
- Stripe / sponsorship flow — not related to edu mode.
- Email delivery of invitation messages — the platform does not send emails; the author copy-pastes the template. Not testable as an e2e behavior.
- Admin-panel respondent management (AH-7.3) — separate feature.
- Composer URL-share mode (non-DB) — out of scope for edu mode; that path is explicitly disabled when `collectsResponses = true`.
- Password reset flow — E12.2 AC-2 explicitly states "žiadny reset cez e-mail"; there is no reset path to test.
- Visual / pixel regression — Tailwind tokens, colors, SVG illustrations.
- i18n for locales other than `sk-SK` — today's only supported locale.

---

## Happy paths

### TC-01: Complete end-to-end flow — Step 1 → 2 → 3 → 4 (UI-driven, no seed)

**AC reference:** E12.2 AC-1, AC-2, AC-3, AC-4; E12.3 AC-1, AC-2, AC-3, AC-4; E12.4 AC-2, AC-3, AC-5

**Prerequisites**:
- Dev server running at `http://localhost:8080` with a real local Supabase instance.
- `.dev.vars` contains `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Consent pre-seeded via `primeConsent(context, "all")` so the cookie banner does not block interactions.
- Clean browser session — no auth cookie, no prior edu session cookie.
- Viewport 1280×800.

**When** the user navigates to `http://localhost:8080/test/zostav`
**and** selects at least 5 questions using the question picker (`data-testid="composer-question-picker"`)
**and** scrolls to the Settings section (`data-testid="composer-settings"`) and clicks the toggle labelled "Zbierať odpovede s menom a e-mailom" (`data-testid="edu-settings-toggle"`)
**and** types a password of 10 characters into the password input (`data-testid="edu-settings-password-input"`)
**and** clicks the button labelled "Vytvoriť edu test" (`data-testid="composer-submit-button"`)
**Then** the `EduSuccessDialog` appears (`data-testid="composer-edu-success-dialog"`) containing a public respondent URL (`data-testid="edu-success-public-link"`), a results URL (`data-testid="edu-success-results-link"`), and the plaintext password (`data-testid="edu-success-password-value"`)
**and** the dialog cannot be dismissed until the acknowledge checkbox (`data-testid="edu-success-ack-checkbox"`) is checked
**and** after checking the acknowledge checkbox and clicking "Hotovo, zatvoriť" (`data-testid="edu-success-close-button"`) the dialog closes and the copied respondent URL includes the path `/test/zostava/`
**and** navigating to the respondent URL shows the intake form (`data-testid="intake-form-root"`) with the heading "Pred testom: kto si?", the disclosure paragraph (`data-testid="intake-form-disclosure"`), and the submit button labelled "Pokračovať na test →" (`data-testid="intake-form-submit-button"`) initially disabled
**and** after filling in a name (minimum 2 chars), a valid email, and checking the GDPR consent checkbox (`data-testid="intake-form-consent-checkbox"`), the submit button becomes enabled
**and** after clicking submit, the intake form disappears and the quiz test flow is rendered (at least one question is visible)
**and** after completing all questions and viewing the results screen, the attempt is persisted (navigating to the results URL shows the password gate `data-testid="vysledky-auth-gate"` with heading "Výsledky edu testu")
**and** entering the correct password in `data-testid="vysledky-gate-password-input"` and clicking "Otvoriť výsledky →" (`data-testid="vysledky-gate-submit-button"`) redirects to the same URL and renders the dashboard (`data-testid="vysledky-dashboard"`) showing count = 1 in `data-testid="agg-stats-count"`

---

### TC-02: Step 4 — Summary 5-number aggregate renders correctly (API-seeded, 7 respondents)

**AC reference:** E12.4 AC-5 (aggregate stats)

**Prerequisites**:
- `seedEduTest({ password: "testpass99", passingThreshold: 70, respondents: [ { name: "A B", email: "a@e2e.test", score: 10 }, { name: "C D", email: "c@e2e.test", score: 30 }, { name: "E F", email: "e@e2e.test", score: 50 }, { name: "G H", email: "g@e2e.test", score: 70 }, { name: "I J", email: "i@e2e.test", score: 80 }, { name: "K L", email: "k@e2e.test", score: 90 }, { name: "M N", email: "m@e2e.test", score: 100 } ] })` run in `test.beforeEach`; result stored in variable `edu`.
- Author session cookie pre-injected via `signEduAuthorToken(edu.id, process.env.JWT_SECRET)` inserted into the browser context as `subenai_edu_author` with path `/test/zostava/${edu.id}`.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user navigates to `http://localhost:8080/test/zostava/${edu.id}/vysledky`
**Then** the dashboard (`data-testid="vysledky-dashboard"`) is rendered without showing the password gate
**and** `data-testid="agg-stats-count"` contains the text "7"
**and** `data-testid="agg-stats-avg"` contains the text "61.4 %" (sum=430, avg=430/7≈61.4, rounded to 1 decimal per `computeAggregate`)
**and** `data-testid="agg-stats-min-max"` contains "10" and "100"
**and** `data-testid="agg-stats-median"` contains "70.0 %" (sorted: 10,30,50,70,80,90,100 → middle index 3 = 70)
**and** `data-testid="agg-stats-pass-value"` contains "4" and "57.1" (scores ≥ 70: 70,80,90,100 → 4/7 = 57.142… → 57.1 %)

---

### TC-03: Step 4 — Distribution 4 bands render correct counts (API-seeded)

**AC reference:** E12.4 AC-5 (distribution histogram)

**Prerequisites**:
- `seedEduTest({ password: "testpass99", passingThreshold: 70, respondents: [ { name: "R1", email: "r1@e2e.test", score: 10 }, { name: "R2", email: "r2@e2e.test", score: 30 }, { name: "R3", email: "r3@e2e.test", score: 60 }, { name: "R4", email: "r4@e2e.test", score: 85 } ] })` run in `test.beforeEach`.
- Author session cookie pre-injected (same pattern as TC-02).
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user navigates to `http://localhost:8080/test/zostava/${edu.id}/vysledky`
**Then** the dashboard renders and `data-testid="agg-stats-band-0"` (label "0–24") displays the count 1
**and** `data-testid="agg-stats-band-1"` (label "25–49") displays the count 1
**and** `data-testid="agg-stats-band-2"` (label "50–74") displays the count 1
**and** `data-testid="agg-stats-band-3"` (label "75–100") displays the count 1

---

## Negative scenarios

### TC-04: Step 4 — Wrong password returns generic 401 error message (brute-force lockout on 6th attempt)

**AC reference:** E12.4 AC-3 (rate limit 5/15min/IP/set_id); E12.4 AC-9

**Prerequisites**:
- `seedEduTest({ password: "correctpassword1" })` run in `test.beforeEach`; result in variable `edu`.
- No prior author session cookie for this set.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.
- `EDU_AUTHOR_PER_KEY_PER_15MIN` env var not overridden in `.dev.vars` (defaults to 5).

**When** the user navigates to `http://localhost:8080/test/zostava/${edu.id}/vysledky`
**and** the password gate (`data-testid="vysledky-auth-gate"`) is visible
**and** the user enters the wrong password "badpassword" into `data-testid="vysledky-gate-password-input"` and submits 5 times in succession (waiting for the error after each attempt)
**Then** each of the first 5 attempts returns the error message "Nesprávne heslo, alebo sa zostava nenašla." (`data-testid="vysledky-gate-error-message"`)
**and** on the 6th attempt with any password, the server returns 429 and the error message "Príliš veľa pokusov. Skús to znova o 15 minút." is visible in `data-testid="vysledky-gate-error-message"`
**and** the dashboard (`data-testid="vysledky-dashboard"`) is not rendered after any of the 6 attempts

**Risk reference:** "Brute-force heslá" (E12.4 Riziká table)

---

### TC-05: Step 4 — Correct password after lockout window clears and authenticates (time simulation)

**AC reference:** E12.4 AC-3 (rate limit window expires); E12.4 AC-4

**Prerequisites**:
- Same setup as TC-04; lockout has been triggered (6th attempt already failed).
- `page.clock.fastForward(15 * 60 * 1000 + 1000)` used to advance the worker's in-process clock by 15 min + 1 s (see Note below).
- Viewport 1280×800.

**When** the user types the correct password "correctpassword1" into `data-testid="vysledky-gate-password-input"` and submits
**Then** the server returns 200 and sets the `subenai_edu_author` HttpOnly cookie
**and** the dashboard (`data-testid="vysledky-dashboard"`) is rendered

**Note for generator:** `ipRateLimit` state lives in the CF Pages Function Worker isolate module scope (see `functions/_lib/security.ts`). The clock-advance approach only works if the Worker shares the same process as the browser (i.e., local dev via `wrangler pages dev`). If the dev server runs in a separate Node process, the generator must alternatively: (a) restart the dev server between TC-04 and TC-05, or (b) expose a test-only reset endpoint (`/__test__/reset-rate-limit`) gated by `NODE_ENV=test`. Document which approach is chosen in the POM. Open question: confirm with the user which dev server mode is used and whether clock manipulation is viable.

---

### TC-06: Step 3 — Intake form blocks submission without GDPR consent

**AC reference:** E12.3 AC-2 (GDPR consent gate), AC-3

**Prerequisites**:
- `seedEduTest({ password: "testpass99" })` run in `test.beforeEach`; result in variable `edu`.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user navigates to `http://localhost:8080/test/zostava/${edu.id}`
**and** the intake form (`data-testid="intake-form-root"`) is visible
**and** the user fills in a valid name (e.g. "Jana Nováková") in `data-testid="intake-form-name-input"`
**and** fills in a valid email (e.g. "jana@skola.sk") in `data-testid="intake-form-email-input"`
**and** does NOT check the GDPR consent checkbox (`data-testid="intake-form-consent-checkbox"`)
**and** attempts to click the submit button (`data-testid="intake-form-submit-button"`)
**Then** the submit button is `disabled` (its `disabled` attribute is set) and clicking it does not trigger a network request to `/api/begin-edu-attempt`
**and** the intake form remains visible

---

### TC-07: Step 2 — Password shorter than 8 characters prevents "Vytvoriť edu test" button from enabling

**AC reference:** E12.2 AC-2 (minimum 8 characters validation)

**Prerequisites**:
- Browser at `http://localhost:8080/test/zostav` with at least 5 questions selected.
- Edu toggle (`data-testid="edu-settings-toggle"`) is ON (clicked).
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user types a 7-character password "abc1234" into `data-testid="edu-settings-password-input"`
**Then** the password input has `aria-invalid="true"` (error border is applied)
**and** the status summary text visible in `data-testid="composer-selection-summary"` contains "Heslo musí mať aspoň 8 znakov"
**and** the "Vytvoriť edu test" button (`data-testid="composer-submit-button"`) is `disabled`

---

### TC-08: Step 4 — Dashboard is not accessible without a valid session cookie (401 gate)

**AC reference:** E12.4 AC-2 (no content visible before auth)

**Prerequisites**:
- `seedEduTest({ password: "testpass99" })` run in `test.beforeEach`; result in variable `edu`.
- No `subenai_edu_author` cookie present in the browser context.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user navigates directly to `http://localhost:8080/test/zostava/${edu.id}/vysledky`
**Then** the page renders the password gate (`data-testid="vysledky-auth-gate"`) with the heading "Výsledky edu testu" (`data-testid="vysledky-gate-heading"`)
**and** the dashboard (`data-testid="vysledky-dashboard"`) is not present in the DOM
**and** no respondent names or scores are visible in the page body

---

### TC-09: Step 3 — Already-attempted email returns 409 "already_attempted" error message

**AC reference:** E12.3 AC-3 (duplicate detection per set_id + email)

**Risk reference:** "Bot filluje real email niekoho iného" (E12.3 Riziká table)

**Prerequisites**:
- `seedEduTest({ password: "testpass99", respondents: [{ name: "Already Done", email: "done@e2e.test", score: 80 }] })` run in `test.beforeEach`; result in variable `edu`.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user navigates to `http://localhost:8080/test/zostava/${edu.id}`
**and** fills in the name "Someone Else", email "done@e2e.test", checks the consent checkbox
**and** clicks "Pokračovať na test →" (`data-testid="intake-form-submit-button"`)
**Then** the server returns 409 and the error paragraph (`data-testid="intake-form-error-message"`) is visible with the text "Tento test si už pod týmto e-mailom absolvoval/a. Pre opakovanie kontaktuj autora."
**and** the test flow does not start (no quiz question is visible)

---

### TC-10: Step 4 — Respondent attempt JWT used as author cookie is rejected (role mismatch)

**AC reference:** E12.4 AC-9 (JWT role claim separation); E12.4 Riziká "Token leak"

**Prerequisites**:
- `seedEduTest({ password: "testpass99" })` run in `test.beforeEach`; result in variable `edu`.
- A respondent-role JWT (signed with `signEduAttemptToken({ set_id: edu.id, name: "x", email: "x@e2e.test" }, JWT_SECRET)`) injected into the browser context as cookie named `subenai_edu_author` with path `/test/zostava/${edu.id}`.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user navigates to `http://localhost:8080/test/zostava/${edu.id}/vysledky`
**Then** `/api/results-data` returns 401 with error `token_wrong_role` (because `verifyEduAuthorToken` checks `claims.role === "author"`)
**and** the password gate (`data-testid="vysledky-auth-gate"`) is rendered (not the dashboard)

---

## Edge cases

### TC-11: Step 2 — Bcrypt hash is stored in DB, not plaintext (regression sentinel)

**AC reference:** E12.1 AC-1 (`author_password_hash TEXT` with `$2a$` prefix); E12.2 (senior deviation: browser sends plaintext over HTTPS → CF Function hashes via RPC)

**Prerequisites**:
- `seedEduTest({ password: "plaintextpw1" })` run in `test.beforeEach`; result in variable `edu`.
- A direct Supabase service-role SELECT on `test_sets` is accessible inside the test via `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`.
- Viewport not relevant (DB assertion only).

**When** the test queries `SELECT author_password_hash FROM test_sets WHERE id = edu.id` using the service-role client
**Then** the returned `author_password_hash` value starts with `$2a$` or `$2b$` (bcrypt prefix)
**and** `author_password_hash` does NOT equal the string "plaintextpw1"
**and** `author_password_hash` length is between 55 and 65 characters (bcrypt output length)

**Note:** If the service-role client is not available inside test context (e.g., Supabase not reachable from the Playwright worker), the generator must fall back to calling `POST /api/verify-author-password` with the plaintext password and asserting 200 (verifies that `verify_test_set_password` RPC can match it), then calling with a bcrypt-looking string `$2a$10$wronghash` and asserting 401. This proves the DB stores a verifiable hash without reading the hash directly.

---

### TC-12: Step 4 — CSV download produces a file with correct row count and UTF-8 BOM (client-side Blob, not server roundtrip)

**AC reference:** E12.4 AC-5 (CSV export); E12.4 Subtasks `rowsToCsv` (RFC 4180, UTF-8 BOM)

**Prerequisites**:
- `seedEduTest({ password: "testpass99", respondents: [ { name: "Ján Novák", email: "jan@e2e.test", score: 75 }, { name: "Mária Horáková", email: "maria@e2e.test", score: 55 } ] })` run in `test.beforeEach`; result in variable `edu`.
- Author session cookie pre-injected (same pattern as TC-02).
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user navigates to the dashboard and it renders successfully
**and** the user clicks the button labelled "Stiahnuť CSV" (`data-testid="vysledky-download-csv-button"`)
**Then** the browser triggers a file download with a filename matching the pattern `*-${edu.id.slice(0,8)}.csv`
**and** the downloaded file content starts with the UTF-8 BOM byte sequence `\xEF\xBB\xBF`
**and** the file contains exactly 3 lines (1 header + 2 data rows) split by `\r\n`
**and** the header line equals `Meno,Email,Skóre,Percentil,Vyhovel,Čas (s),Dátum`
**and** one data line contains `"Ján Novák"` (RFC 4180: no wrapping needed as no commas) and "75"
**and** one data line contains `"Mária Horáková"` and "55"

**Note:** The download is triggered by a `<a download>` click on a Blob URL — no `Content-Type` header comes from the server. The generator must use `page.waitForEvent("download")` and read the download buffer to assert content.

---

### TC-13: Step 4 — Delete respondent removes row from table (confirm dialog required, no audit log written)

**AC reference:** E12.4 AC-5 ("Vymaž respondenta")

**P0 FINDING — Audit log NOT implemented:** The `/api/delete-edu-respondent` CF Function (`functions/api/delete-edu-respondent.ts`) performs a Supabase `DELETE` but does NOT call `log_audit_event` (the `public.log_audit_event` RPC from migration `20260518200000_audit_log_insert_fn.sql`). The `/schools` marketing page and E12.4 AC-5 both mention "audit log" as a feature. This is a **contract violation** — see Risks section. The TC below tests what IS implemented; the generator must add a comment marking the audit-log assertion as `// TODO: unblock when log_audit_event is called from delete-edu-respondent (P0 finding)`.

**Prerequisites**:
- `seedEduTest({ password: "testpass99", respondents: [ { name: "Delete Me", email: "delete@e2e.test", score: 60 }, { name: "Keep Me", email: "keep@e2e.test", score: 80 } ] })` run in `test.beforeEach`; result in variable `edu`.
- Author session cookie pre-injected (same pattern as TC-02).
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user navigates to the dashboard and it renders with 2 rows in the respondents table
**and** the user clicks the delete button (`data-testid="resp-table-delete-btn-${attemptId}"`) for the row with name "Delete Me"
**and** the window confirmation dialog appears with text containing "Delete Me" and "delete@e2e.test" and the user accepts it
**Then** the table re-renders with 1 row (only "Keep Me" visible)
**and** `data-testid="agg-stats-count"` updates to "1"
**and** the `data-testid="resp-table-root"` does not contain the text "Delete Me"

---

### TC-14: Step 4 — Session cookie expires after 60 minutes (client-side page.clock simulation)

**AC reference:** E12.4 AC-9 (60-min TTL on `subenai_edu_author` cookie and JWT)

**Prerequisites**:
- `seedEduTest({ password: "testpass99" })` run in `test.beforeEach`; result in variable `edu`.
- `page.clock.install({ time: Date.now() })` called before navigation.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user navigates to the dashboard and authenticates successfully (password gate → dashboard visible)
**and** `page.clock.fastForward(61 * 60 * 1000)` advances simulated time by 61 minutes
**and** the user reloads the page (`page.reload()`)
**Then** the page performs a `POST /api/results-data` request
**and** the server returns 401 because the JWT `exp` claim is in the past
**and** the password gate (`data-testid="vysledky-auth-gate"`) is rendered instead of the dashboard

**Note:** The `Max-Age=3600` cookie attribute causes the browser to expire the cookie independently of JavaScript time. `page.clock.fastForward` only affects `Date.now()` inside the page JS — it does not manipulate the browser's cookie store expiry. The generator must verify whether `page.clock.fastForward` triggers cookie expiry in Playwright's Chromium. If it does not, the alternative is: inject an already-expired JWT token (issue one with `exp = Date.now()/1000 - 1`) directly into the cookie store via `context.addCookies()` and navigate to the results URL, then assert the 401 response and password gate render.

---

### TC-15: Step 3 — Honeypot field submission triggers spam_detected (bot simulation)

**AC reference:** E12.3 AC-2 (honeypot field); E12.7 (anti-spam)

**Risk reference:** "Bot filluje real email niekoho iného" (E12.3 Riziká table)

**Prerequisites**:
- `seedEduTest({ password: "testpass99" })` run in `test.beforeEach`; result in variable `edu`.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user navigates to `http://localhost:8080/test/zostava/${edu.id}`
**and** the intake form is visible
**and** the test evaluates `document.querySelector('[name="hp_url"]').value = "http://spam.example.com"` to simulate a bot filling the hidden honeypot field
**and** fills in name, email, checks consent, and submits
**Then** the server returns 400 with error `spam_detected`
**and** the error paragraph (`data-testid="intake-form-error-message"`) is visible
**and** the test flow does not start

---

### TC-16: Step 3 — Name below 2 characters (boundary: length 1) returns name_length error

**AC reference:** E12.3 AC-2 (name min 2 chars); E12.1 AC-3

**Prerequisites**:
- `seedEduTest({ password: "testpass99" })` run in `test.beforeEach`; result in variable `edu`.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user navigates to `http://localhost:8080/test/zostava/${edu.id}`
**and** fills in a 1-character name "X" in `data-testid="intake-form-name-input"`
**and** fills in a valid email and checks the consent checkbox
**and** submits the form
**Then** the server returns 400 with error `name_length`
**and** the error paragraph (`data-testid="intake-form-error-message"`) is visible with the text "Meno musí mať aspoň 2 a najviac 80 znakov."

---

### TC-17: Step 3 — Invalid email format returns invalid_email error

**AC reference:** E12.3 AC-3 (server-side email regex validation)

**Prerequisites**:
- `seedEduTest({ password: "testpass99" })` run in `test.beforeEach`; result in variable `edu`.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.
- Client-side email validation bypassed by sending the request directly (or by temporarily disabling the email `<input type="email">` pattern check via `page.evaluate`).

**When** the user navigates to `http://localhost:8080/test/zostava/${edu.id}`
**and** the test evaluates `document.querySelector('[type="email"]').type = "text"` to remove browser-native email validation
**and** types "notanemail" into the email field
**and** types a valid 2+ char name and checks consent
**and** submits
**Then** the server returns 400 with error `invalid_email`
**and** the error paragraph (`data-testid="intake-form-error-message"`) is visible with the text "E-mailová adresa nemá platný formát."

---

### TC-18: Step 4 — Empty state renders when no respondents exist ("Zatiaľ žiadne odpovede")

**AC reference:** E12.4 AC-6 (empty state)

**Prerequisites**:
- `seedEduTest({ password: "testpass99" })` run in `test.beforeEach` with no `respondents` array (zero attempts).
- Author session cookie pre-injected (same pattern as TC-02).
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user navigates to the dashboard and it renders
**Then** `data-testid="agg-stats-root"` is NOT present in the DOM (AggregateStats returns null when count = 0)
**and** `data-testid="resp-table-empty"` is visible with the text "Zatiaľ žiadne odpovede. Pošli respondentom verejný link."
**and** the "Stiahnuť CSV" button (`data-testid="vysledky-download-csv-button"`) is `disabled`

---

### TC-19: Step 4 — Respondents table search filters by name (case-insensitive)

**AC reference:** E12.4 AC-5 (search input — filter by name/email)

**Prerequisites**:
- `seedEduTest({ password: "testpass99", respondents: [ { name: "Ján Novák", email: "jan@e2e.test", score: 75 }, { name: "Petra Kováčová", email: "petra@e2e.test", score: 55 } ] })` run in `test.beforeEach`.
- Author session cookie pre-injected.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user navigates to the dashboard and it renders with 2 respondent rows visible
**and** the user types "petra" (lowercase) into the search input (`data-testid="resp-table-search"`)
**Then** only the row for "Petra Kováčová" is visible in `data-testid="resp-table-table"`
**and** the row for "Ján Novák" is NOT present in the visible table rows
**and** clearing the search input restores both rows

---

### TC-20: Step 4 — Respondents table is sortable by score column

**AC reference:** E12.4 AC-5 (sortable via headers); E12.4 AC-8 (`aria-sort`)

**Prerequisites**:
- `seedEduTest({ password: "testpass99", respondents: [ { name: "Low", email: "low@e2e.test", score: 20 }, { name: "High", email: "high@e2e.test", score: 90 } ] })` run in `test.beforeEach`.
- Author session cookie pre-injected.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user navigates to the dashboard and it renders (default sort is by `created_at desc`)
**and** the user clicks the "Skóre" column header button
**Then** the first visible row in the table corresponds to "High" (90%) because default for score sort is `desc`
**and** the `<th scope="col" aria-sort>` for "Skóre" has value `"descending"`
**and** clicking the "Skóre" header again reverses the order so "Low" (20%) is first
**and** `aria-sort` changes to `"ascending"`

---

### TC-21: Step 2 — EduSuccessDialog cannot be closed by pressing Escape before acknowledgement

**AC reference:** E12.2 AC-4 (confirm dialog); E12.2 Subtasks (escape + outside-click blocked before acknowledge)

**Prerequisites**:
- Browser at `http://localhost:8080/test/zostav` with at least 5 questions selected and edu toggle ON and password filled.
- Edu success dialog opened by submitting the form.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the `EduSuccessDialog` (`data-testid="composer-edu-success-dialog"`) is open and the acknowledge checkbox is NOT checked
**and** the user presses the Escape key
**Then** the dialog remains open (it does not close)
**and** the "Hotovo, zatvoriť" button (`data-testid="edu-success-close-button"`) is `disabled`

---

### TC-22: Step 4 — Logout clears session and returns to password gate

**AC reference:** E12.4 AC-7 (logout button)

**Prerequisites**:
- `seedEduTest({ password: "testpass99" })` run in `test.beforeEach`.
- Author session cookie pre-injected; dashboard renders.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the user clicks the "Odhlásiť" button (`data-testid="vysledky-logout-button"`)
**Then** a `DELETE /api/verify-author-password` request is sent with `{ set_id: edu.id }` in the body
**and** the page transitions to the password gate state (`data-testid="vysledky-auth-gate"` visible)
**and** a subsequent `POST /api/results-data` without the cookie returns 401 (confirm by intercepting the next navigation's network request)

---

### TC-23: Step 4 — Cross-set tampering: results cookie for set A cannot access data for set B

**AC reference:** E12.4 AC-9 (cookie set-scoped; `set_mismatch` guard in `results-data.ts`)

**Risk reference:** E12.4 code review note: "PII nikdy v URL — všetko cez POST body alebo HttpOnly cookie"

**Prerequisites**:
- Two edu test sets created: `eduA = seedEduTest({ password: "passA" })` and `eduB = seedEduTest({ password: "passB", respondents: [{ name: "Secret", email: "secret@e2e.test", score: 99 }] })`.
- Author session cookie for `eduA` (not `eduB`) injected into browser context.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the test intercepts the `POST /api/results-data` request and replaces the body `set_id` with `eduB.id` while keeping the cookie for `eduA`
**Then** the server returns 403 with error `set_mismatch`
**and** the respondent data for `eduB` (including "Secret") is NOT returned in the response body

---

### TC-24: Step 1 — "Spustiť pre seba" button is disabled when edu toggle is ON

**AC reference:** E12.2 AC-3 (edu mode disables self-run; would skip intake); E12.2 Subtasks "zablokované: Spustiť pre seba"

**Prerequisites**:
- Browser at `http://localhost:8080/test/zostav` with at least 5 questions selected.
- Consent pre-seeded via `primeConsent(context, "all")`.
- Viewport 1280×800.

**When** the edu toggle (`data-testid="edu-settings-toggle"`) is in OFF state
**Then** the "Spustiť pre seba" button (`data-testid="composer-run-self-button"`) is enabled (not disabled)
**and** when the toggle is clicked to ON state
**Then** the "Spustiť pre seba" button becomes `disabled`
**and** its `title` attribute contains "Edu mód s heslom: zostavu treba zdieľať tímu cez link"

---

## Risks

This section maps every marketing promise on `/schools` "Ako to funguje" section (backed by `EduWorkflowSteps.tsx` step cards) to its implementation status. Discrepancies are flagged as P0 findings.

| Marketing promise (source: `/schools` step cards) | Implementation location | Status | Finding |
|---|---|---|---|
| Step 1: Composer lets you select predefined packs OR manual questions | `src/routes/test.zostav.lazy.tsx` — `PackPreloadChips` + `QuestionPicker` | Implemented | None |
| Step 1: Set passing threshold (default 70 %) | `src/components/composer/build/ComposerSettings.tsx` | Implemented | None |
| Step 1: Set question count 5–50 | `COMPOSER_LIMITS.minQuestions=5`, `COMPOSER_LIMITS.maxQuestions=50` in `src/lib/quiz/composer.ts` | Implemented | None |
| Step 1: Name the assembly (`creator_label`) | `ComposerSettings` — creator_label input | Implemented | None |
| Step 2: Toggle "Zbierať odpovede s menom a e-mailom" in Settings | `EduSettings.tsx` — `data-testid="edu-settings-toggle"` (to be added) | Implemented | None |
| Step 2: Password minimum 8 characters | `EDU_PASSWORD_MIN_LEN = 8` in `EduSettings.tsx` | Implemented | None |
| Step 2: Password stored only as bcrypt hash, original never saved | `functions/api/test-sets.ts` calls `hash_test_set_password` RPC; E12.2 senior deviation notes HTTPS-only transit | **Partially verified** — hash in DB confirmed by AC, but the "original not stored" guarantee requires the regression-sentinel TC-11 to run against a live DB |
| Step 2: No reset via email | `EduSettings.tsx` `password_hint.strong = "žiadny reset cez e-mail."` + no reset endpoint exists | Implemented | None |
| Step 2: Dialog shows 3 fields: respondent link, results link, password | `EduSuccessDialog.tsx` — 3 `<Field>` components | Implemented | None |
| Step 3: Public link opens intake form requiring name + email + GDPR consent | `RespondentIntakeForm.tsx` | Implemented | None |
| Step 3: Without consent the test does not start | `canSubmit` gates on `consent === true`; server rejects `consent !== true` | Implemented | None |
| Step 4: Results require password | `AuthorPasswordGate.tsx` + `verify-author-password.ts` | Implemented | None |
| Step 4: Summary shows count, avg, min, max, median, pass rate (5 numbers) | `AggregateStats.tsx` + `computeAggregate` | Implemented | None |
| Step 4: Distribution in 4 bands (0–24, 25–49, 50–74, 75–100) | `AggregateStats.tsx` `bands` array + `bucket()` in `results-data.ts` — **NOTE: bands are 0–24/25–49/50–74/75–100 NOT 0–25/25–50/50–75/75–100** as the marketing step card labels "0-24, 25-49, 50-74, 75-100" | Implemented — boundary is `<25`, `<50`, `<75`, `>=75` | None — labels match `bucket()` |
| Step 4: Respondents table with sorting and search | `RespondentsTable.tsx` | Implemented | None |
| Step 4: Delete respondent with confirmation | `RespondentsTable.tsx` `window.confirm` + `delete-edu-respondent.ts` | Implemented | None |
| **Step 4: Delete respondent writes audit log** | `functions/api/delete-edu-respondent.ts` | ✅ FIXED 2026-05-19 (was P0) | Resolved before generator dispatch. Function now writes a service-role `audit_log` row (`action="delete_edu_respondent"`, `target_type="attempt"`, `pii_access=true`, `actor_name=edu_author:${set_id}`) after every successful DELETE. Regression-pinned in `tests/functions/delete-edu-respondent.test.ts` (2 new cases). Failure mode: audit insert error → 500 `audit_failed` (distinct from `delete_failed`); retry hits 404 path. TC-13 implements the assertion fully — no TODO. |
| Step 4: CSV export | `rowsToCsv` + `downloadCsv()` in vysledky route | Implemented (client-side Blob) | **Note:** The file is generated client-side, not via a server endpoint. No `Content-Type` response header from the server exists to assert. TC-12 must use `page.waitForEvent("download")` and read the buffer. |
| Step 4: Session lasts 60 minutes, then password required again | `verify-author-password.ts` `SESSION_TTL_SECONDS = 3600` + `Max-Age=3600` cookie + JWT `exp` | Implemented server-side | TC-14 depends on whether Playwright clock manipulation triggers cookie expiry in Chromium — see TC-14 Note. |
| Step 4: Brute-force protection 5 attempts / 15 min / IP / test | `verify-author-password.ts` `ipRateLimit.consume("edu-author:${ip}:${setId}", 5, 15*60)` | Implemented — **in-process module-level Map, not KV** | The `security.ts` comment explicitly notes state resets on isolate cold-start and does not survive load-balancing across isolates. In production this is "soft" rate limiting. In local dev (single isolate) TC-04 works. |

---

## Open questions

1. **Audit log for delete (P0) — RESOLVED 2026-05-19.** Confirmed accidental omission; fixed inline before generator. Uses service-role direct insert (educator authenticates via JWT cookie, not `auth.uid()`, so `log_audit_event` RPC's admin-gate doesn't fit; pattern follows the migration comment "INSERT happens via supabaseAdmin in createServerFn handlers — RLS bypass"). TC-13 is now fully testable; no TODO needed.
2. **Clock manipulation + cookie expiry (TC-05 + TC-14):** `page.clock.fastForward` advances JavaScript time inside the page, but does not manipulate the browser's native cookie store expiry (controlled by `Max-Age`). The generator needs to confirm whether Playwright's `page.clock` API also affects the browser's cookie TTL, or whether the alternative injection path (pre-expired JWT cookie via `context.addCookies`) must be used for TC-14.
3. **Rate-limit reset between tests (TC-04 + TC-05):** `ipRateLimit` state is in the Worker's module-level `Map` (`functions/_lib/security.ts`). In a multi-test run the state from TC-04 can leak into TC-05 unless the isolate restarts. Confirm with the user whether the dev server restarts between spec files (it does if `wrangler pages dev` is restarted by Playwright's `webServer` config). If not, a test-only reset endpoint or a fresh server per test is needed.
4. **`seedEduTest` service-role availability:** The seed helper needs `SUPABASE_SERVICE_ROLE_KEY` to call `hash_test_set_password` RPC and to INSERT edu attempt rows bypassing RLS. Confirm this key is set in `.env` for test runs (or only in `.dev.vars` for the CF Function). Other seed helpers in `e2e/seed/` use `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `process.env` — if those tests pass, `seedEduTest` can follow the same pattern.
5. **TC-11 alternative path:** If the Supabase client is not importable from Playwright worker context, the generator must fall back to the verify-RPC-roundtrip approach described in TC-11. Confirm which approach to use before implementing.
6. **Histogram band labels:** The `AggregateStats.tsx` code uses `bands` labeled `"0–24"`, `"25–49"`, `"50–74"`, `"75–100"`. The `bucket()` function in `results-data.ts` assigns `<25 → 0`, `<50 → 1`, `<75 → 2`, `>=75 → 3`. Score 24 → band 0 (0–24 ✓), score 25 → band 1 (25–49 ✓), score 75 → band 3 (75–100 ✓). Consistent. But score 74 → band 2 (50–74 ✓), score 75 → band 3 (75–100 ✓). TC-03 seed scores 10/30/60/85 land in bands 0/1/2/3 respectively — correct. The plan's band boundaries match the code.
7. **`creator_label` in TC-01:** The happy-path test leaves `creator_label` empty (optional). TC-02 seeds with default `"E2E Edu Test"`. If the generator seeds with an empty label, `data-testid="vysledky-dashboard-heading"` will render "Výsledky edu testu" (the `heading_default` fallback). The plan intentionally does not assert a specific creator label in TC-01 to avoid fragility.
