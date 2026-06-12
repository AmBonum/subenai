# Public respondent flow — test plan

**Route:** `/t/:shareId`
**Component(s) under test:** `src/routes/t.$shareId.tsx`, `src/components/respondent/TakeTestFlow.tsx`, `src/components/respondent/QuestionStep.tsx`, `src/components/respondent/IntakeStep.tsx`, `src/lib/respondent/queries.ts`
**Playwright project:** `e2e-chromium`
**Spec file:** `e2e/specs/respondent/take-test.spec.ts`
**POM:** `e2e/poms/respondent/TakeTestPage.ts`

---

## Context

The anonymous respondent flow. The route resolves the published test + its
question set in one SECURITY DEFINER RPC, then drives the runner through
three session RPCs:

1. **Resolve** — `get_respondent_test_by_share_id(p_share_id)` returns
   `{ test, questions }`, or `null` for unknown / unpublished tests.
   Share-id format is validated **client-side first** (zod regex
   `^[a-zA-Z0-9]{6,12}$` in `TakeTestInputSchema`); a malformed id never
   reaches the RPC. A thrown RPC error is caught by the route and mapped to
   the same not-found state (there is no separate error screen).
2. **Intake stage** — always rendered first. GDPR consent checkbox is
   mandatory; `intake_fields` (when present on the test) are rendered as
   inputs and `required` fields gate submission client-side. Submit calls
   `start_respondent_session(p_share_id, p_intake, p_consent_given, p_segment)`
   → `{ session_id, session_token }`.
3. **Questions stage** — one `submit_respondent_answer` per answered
   question. Back-navigation re-mounts the step with the stored answer
   pre-selected; re-submitting an **unchanged** answer skips the RPC
   entirely; a **changed** answer replaces the stored record (deduped by
   `question_id`) and fires one more submit.
4. **Finalize** — answering the last question calls
   `finalize_respondent_session(p_session_id, p_score, p_session_token)`
   once, then renders the thank-you card. The card shows no score
   (results belong to the test author) and offers the public quick test
   as the exit CTA ("Otestuj si svoje scam radary — rýchly test
   zadarmo" → `/test`) plus a close button.

**Mid-take resume:** after `start_respondent_session` succeeds the flow
snapshots `{ sessionId, sessionToken, intake, answers, qIdx,
questionOrder }` into **sessionStorage** (key
`iiq_respondent_session_v1:<shareId>`; sessionStorage by design — it dies
with the tab so respondent PII never outlives the browsing session). A
reload resumes the SAME session: intake is skipped, the saved question
order and index are restored, and no second `start_respondent_session`
fires. Re-submitting an answer is safe (`submit_respondent_answer`
upserts on `(session_id, question_id)`). Finalize clears the snapshot.

A password preflight (`/api/tests/check-password`) runs before the runner;
it is a Cloudflare Pages Function not served by the Vite dev server, so the
spec stubs it with `{ has_password: false }` (the route also fails open on
non-OK responses).

All Supabase traffic is mocked via `mockSupabase` (`e2e/mocks/supabase`);
RPC resolvers record their bodies so the spec asserts call counts and
payloads.

---

## Happy paths

### TC-01: Full take — resolve, intake consent, two answers, finalize once

**Prerequisites:** Resolve RPC mocked with a published test (empty
`intake_fields`, fixed order) and 2 questions: Q1 single-choice
(options + `correct: [0]`), Q2 free-text (`options: null`). Session RPCs
mocked with recording resolvers. Consent cookie primed; check-password
stubbed open.

**When** the respondent opens `/t/<valid shareId>`.

**Then** the intake stage shows the test title and description verbatim.

**When** they tick the consent checkbox, submit the intake, pick a Q1
option, click "Ďalej", type a free-text answer for Q2, and click "Odoslať".

**Then** the thank-you card renders ("Hotovo!") with the quick-test CTA
("Otestuj si svoje scam radary — rýchly test zadarmo", `href="/test"`)
and the close button ("Zatvoriť"); `start_respondent_session` was called
once with `p_consent_given: true`, `submit_respondent_answer` exactly
twice (Q1 then Q2), and `finalize_respondent_session` **exactly once**.

---

### TC-02: Back-navigation — answer kept, unchanged re-submit skipped, changed re-submit fired

**Prerequisites:** Same seed as TC-01.

**When** the respondent answers Q1 with option B and advances, then clicks
"Späť".

**Then** Q1 re-renders with option B still selected (radio checked).

**When** they click "Ďalej" again **without changing** the answer.

**Then** Q2 renders and `submit_respondent_answer` was NOT called again
(still exactly 1 call).

**When** they go back once more, change the answer to option A, advance,
answer Q2, and finish.

**Then** the changed Q1 answer fired one more submit (Q1 submitted twice
total: B then A), Q2 once — 3 submits overall — and finalize was called
exactly once with the score computed over the **deduped** answer set.

> Note: an "unchanged Q2 re-visit" is not reachable — Q2 is the last
> question and submitting it finalizes the session immediately. The
> unchanged-skip invariant is therefore asserted on Q1.

---

### TC-06: Intake fields — required field gates the quiz

**Prerequisites:** Resolve RPC seeded with
`intake_fields: [{ id: "if_name", label: "Meno", type: "text", required: true, pii: true }]`.
Session RPCs mocked with recording resolvers.

**When** the respondent ticks consent and submits the intake **without**
filling the required field.

**Then** the intake error shows "Vyplň povinné polia: Meno", the questions
stage is NOT entered, and `start_respondent_session` was never called.

**When** they fill "Meno" with "Anna" and submit again.

**Then** the first question renders and `start_respondent_session` was
called exactly once with `p_intake: { if_name: "Anna" }`.

---

### TC-07: Mid-test reload resumes the same session

**Prerequisites:** Same seed as TC-01.

**When** the respondent grants consent, starts the session, answers Q1,
and **reloads the page** while Q2 is displayed.

**Then** the flow resumes directly on Q2 — the intake stage is skipped
(`respondent-flow-intake-submit-button` absent) and the saved index is
restored from the sessionStorage snapshot.

**When** they answer Q2 and finish.

**Then** `start_respondent_session` was called exactly **once** total
(asserted via the recording mock — the reload did NOT start a ghost
session), `finalize_respondent_session` fired once with the ORIGINAL
`p_session_id`, and `submit_respondent_answer` was called twice (Q1
pre-reload, Q2 post-reload).

---

## Negative paths

### TC-03: Unknown share id — RPC returns null

**Prerequisites:** Resolve RPC mocked to return `null`; session RPCs
mocked with recording resolvers.

**When** the respondent opens `/t/<well-formed but unknown shareId>`.

**Then** the not-found card renders with the Slovak copy
"Test nebol nájdený alebo už nie je dostupný." and the back-home link
"Späť na úvod"; the resolve RPC was called (at least once — React
StrictMode on the dev server double-invokes the resolve effect) and **no
session RPC** (`start` / `submit` / `finalize`) was fired.

---

### TC-04: Malformed share id — client-side regex rejects before any RPC

**Prerequisites:** Resolve + session RPCs mocked with recording resolvers.

**When** the respondent opens `/t/123e4567-e89b-12d3-a456-426614174000`
(UUID with dashes — fails `^[a-zA-Z0-9]{6,12}$`).

**Then** the not-found card renders and the resolve RPC was **never
called** (`resolveRespondentTest` returns `null` from the zod gate before
hitting Supabase — verified against `src/lib/respondent/queries.ts`).

---

### TC-05: Resolve RPC fails (500) — graceful not-found, no crash

**Prerequisites:** `errors: { get_respondent_test_by_share_id: { status: 500 } }`
in the mock; session RPCs mocked with recording resolvers.

**When** the respondent opens `/t/<valid shareId>`.

**Then** the route catches the thrown RPC error and renders the same
not-found card (actual behavior per `useResolveRespondentTest` — resolve
failures map to `not_found`, there is no dedicated error screen) with
"Test nebol nájdený alebo už nie je dostupný." verbatim; the runner root
and thank-you card are absent (no soft success) and no session RPC fired.

---

## Out of scope

- Password-gated tests (`RespondentPasswordGate`) — the gate's verify
  endpoint is a Cloudflare Pages Function; covered by its own future plan.
- Random question order (`question_order_mode: "random"`) — shuffle
  determinism is unit-tested in `tests/` (`resolveQuestionOrder`).
- Session-token grace-window semantics — server-side concern, unit +
  SQL-tested.
- `submit_respondent_answer` failure mid-quiz (Slovak retry copy
  "Nepodarilo sa odoslať odpoveď. Skús to znova.") — unit-tested in
  `tests/components/respondent/TakeTestFlow.test.tsx`.
