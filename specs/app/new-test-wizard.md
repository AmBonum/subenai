# New test wizard — test plan

**Route:** `/app/tests/new`
**Component(s) under test:** `src/routes/app.tests.new.tsx`, `src/components/app/tests/QuestionPickerDialog.tsx`, `useCreateTest` (`src/lib/platform/queries.ts`)
**Playwright project:** `e2e-chromium`
**Spec file:** `e2e/specs/app/new-test-wizard.spec.ts`

---

## Context

A four-step wizard that guides an educator through creating a test:

1. **Step 1 – Basics** — title (required) + optional description.
2. **Step 2 – Audience** — optional respondent group select.
3. **Step 3 – Questions** — pick at least one approved question from the
   library via `QuestionPickerDialog` (backed by the `questions` table,
   `useLibraryQuestions`).
4. **Step 4 – Share** — read-only share link + "Finish" button navigates to `/app/tests/$testId`.

Navigation between steps is via the URL search param `?step=N`. The Next button on step 1 is disabled until the title field is non-empty. The Publish button on step 3 is disabled until at least one question is picked.

**Publish** (`useCreateTest`) is two-phase: INSERT into `tests` (DB
generates the id — the mock emulates this via `generateIds: ["tests"]`),
then RPC `replace_test_questions(p_test_id, p_question_ids)` with the
picked ids in display order. An RPC failure rejects the mutation —
`onError` shows `toast.error(err.message)` (the raw Supabase error
message, not a localized string) and the wizard stays on step 3.

---

## Happy paths

### TC-01: Step 1 card renders with correct heading and progress indicator

**Prerequisites:** Educator session seeded; consent primed; navigate to `/app/tests/new`.

**When** the wizard loads at step 1.

**Then** the wizard root is visible, the progress indicator shows "Krok 1 zo 4", the step-1 card title reads "Základy", and the first progress-bar segment is active (testid `new-test-wizard-progress-bar-1`).

---

### TC-02: Step 1 Next button is disabled when title is empty, enabled after typing

**Prerequisites:** Educator session; consent primed; navigate to `/app/tests/new` (step 1).

**When** the title input is empty.

**Then** the Next button (`new-test-wizard-step-1-next`) is disabled.

**When** the user types "Moj testovací test" into the title input.

**Then** the Next button is enabled.

**When** the user clears the title input.

**Then** the Next button is disabled again.

---

### TC-03: Step 3 — picking a question enables Publish; empty state shows validation error

**Prerequisites:** Educator session; consent primed; two approved questions seeded in the `questions` table; navigate to `/app/tests/new?step=3`.

**When** step 3 loads with no questions selected.

**Then** the `new-test-wizard-validation-questions` error paragraph shows "Pridaj aspoň jednu otázku." and the Publish button is disabled.

**When** the user opens the picker via the empty-state CTA (`new-test-wizard-step-3-empty-cta`), checks one question, and confirms (`question-picker-submit-button`).

**Then** `new-test-wizard-question-row-0` is visible with the picked prompt, the validation paragraph is hidden, and the Publish button is enabled.

---

### TC-04: Happy publish — `replace_test_questions` carries both question ids in order

**Prerequisites:** Educator session; two approved questions (q1, q2) seeded; `replace_test_questions` RPC mocked with a recording resolver; `generateIds: ["tests"]` so the INSERT returns a row with an id.

**When** the user fills in title "E2E Wizard Test", advances through steps 1–2, picks q1 then q2 on step 3, and clicks "Publikovať".

**Then** the wizard transitions to step 4 (success UI) and the share-link input value matches `/t/<shareId>` (12 alphanumeric chars), **and** the RPC was called exactly once with `p_question_ids: [q1.id, q2.id]` (picked order) and a non-empty `p_test_id`.

---

### TC-05: Step 4 Finish button navigates to the test detail route

**Prerequisites:** Complete the full wizard flow (see TC-04). Step 4 is rendered.

**When** the user clicks the Finish button (`new-test-wizard-publish-button`) on step 4.

**Then** the page URL contains `/app/tests/` followed by the created test ID.

---

## Negative paths

### TC-06: Publish failure — RPC 500 → error toast, wizard does NOT show success

**Prerequisites:** Educator session; two approved questions seeded; `errors: { replace_test_questions: { status: 500, message: "replace failed (e2e)" } }` in the mock.

**When** the user completes steps 1–3 with two questions and clicks "Publikovať".

**Then** a sonner error toast appears carrying the RPC error message
("replace failed (e2e)" — actual behavior is `toast.error(err.message)`,
i.e. the raw error message rather than localized Slovak copy), step 4 is
never rendered, and the wizard stays on step 3.

---

## Edge cases

_(none for this session — covered by the TCs above)_

---

## Out of scope

- Template pre-fill (`?templateId=…`) — covered by a future TC batch.
- Step 2 audience selection with a real group — covered by audiences spec.
- Clipboard copy behaviour on step 4 — not assertable without browser permission grants.
