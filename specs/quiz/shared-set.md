# Shared-set routes — test plan

**Routes under test:** `/test/zostava/$id` · `/test/zostava/$id/vysledky`
**Components under test:**
- `src/routes/test.zostava.$id.lazy.tsx`
- `src/routes/test.zostava.$id.vysledky.lazy.tsx`
- `src/components/quiz/flow/TestFlow.tsx`
**Auth:** anonymous (no login required)
**Date:** 2026-05-19

---

## How these routes work

`/test/zostava/$id` fetches a `test_sets` row via Supabase REST. It resolves
`question_ids` from the static QUESTIONS bundle via `resolveQuestions()` and
renders a landing card (heading, question count, "Spustiť test →" CTA). On
click it mounts `<TestFlow kind="composer">` in-page; results appear in-page
— no URL change.

`/test/zostava/$id/vysledky` is the **edu author dashboard** protected by
`/api/results-data` (HTTP 401 when unauthenticated). The browser renders an
`AuthorPasswordGate` heading ("Výsledky edu testu") without valid credentials.

---

## Happy paths

### TC-01: `/test/zostava/$id` renders landing for a seeded set

**Prerequisites:**
- Viewport: default desktop (1280×720)
- Consent pre-seeded to "all"
- Supabase `test_sets` table mocked with one row: id = `"aaaaaaaa-1111-2222-3333-000000000001"`,
  `creator_label = "E-shop onboarding Q1"`, `question_ids = ["p-sms-posta-1", "p-sms-dpd-1", "p-sms-tatra-1", "p-sms-slsp-1", "p-sms-csob-1"]`,
  `passing_threshold = 70`, `collects_responses = false`

**When** the user navigates to `/test/zostava/aaaaaaaa-1111-2222-3333-000000000001`
**Then** the page heading reads "E-shop onboarding Q1"
**and** the question-count line contains "📋 5 otázok"
**and** the "Spustiť test →" CTA button is visible and enabled

---

### TC-02: Not-found state when set id does not exist

**Prerequisites:**
- Consent pre-seeded to "all"
- Supabase `test_sets` table mocked with zero rows (empty array)

**When** the user navigates to `/test/zostava/does-not-exist`
**Then** the not-found heading reads "Test nenájdený"
**and** the not-found body reads "Tento odkaz neukazuje na žiadnu zostavu. Mohol byť odstránený alebo URL je preklepnuté."
**and** the "Spustiť test →" CTA is not present

---

### TC-03: Clicking "Spustiť test →" shows the first question

**Prerequisites:**
- Same mock as TC-01 (seeded set)
- Consent pre-seeded to "all"

**When** the user navigates to the shared-set landing page
**and** clicks the "Spustiť test →" button
**Then** the question card becomes visible
**and** the progress indicator reads "Otázka 1 / 5"

---

### TC-04: Completing all questions shows the in-page results view

**Prerequisites:**
- Same mock as TC-01 (seeded set)
- Consent pre-seeded to "all"

**When** the user navigates to the shared-set landing, clicks start,
  and answers all 5 questions by choosing option `a` on each
**Then** the results score value becomes visible in-page
**and** the URL has not changed (still `/test/zostava/aaaaaaaa-1111-2222-3333-000000000001`)

---

## Negative scenarios

### TC-05: `/vysledky` route shows the password gate heading when unauthenticated

**Prerequisites:**
- `/api/results-data` mocked to return HTTP 401 (no session)
- Consent pre-seeded to "all"

**When** the user navigates to `/test/zostava/aaaaaaaa-1111-2222-3333-000000000001/vysledky`
**Then** the auth-gate heading reads "Výsledky edu testu"
**and** the password input is visible
**and** the results dashboard (respondents table, aggregate stats) is NOT visible
