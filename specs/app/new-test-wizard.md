# New test wizard — test plan

**Route:** `/app/tests/new`
**Component(s) under test:** `src/routes/app.tests.new.tsx`
**Playwright project:** `e2e-chromium`
**Spec file:** `e2e/specs/app/new-test-wizard.spec.ts`

---

## Context

A four-step wizard that guides an educator through creating a test:

1. **Step 1 – Basics** — title (required) + optional description.
2. **Step 2 – Audience** — optional respondent group select.
3. **Step 3 – Questions** — add at least one question from the mock store.
4. **Step 4 – Share** — read-only share link + "Finish" button navigates to `/app/tests/$testId`.

Navigation between steps is via the URL search param `?step=N`. The Next button on step 1 is disabled until the title field is non-empty. The Publish button on step 3 is disabled until at least one question is added.

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

### TC-03: Step 3 — adding a question enables Publish; removing it disables Publish and shows validation error

**Prerequisites:** Educator session; consent primed; navigate to `/app/tests/new?step=3`.

**When** step 3 loads with no questions selected.

**Then** the `new-test-wizard-validation-questions` error paragraph shows "Pridaj aspoň jednu otázku." and the Publish button is disabled.

**When** the user clicks "Pridať otázku" (`new-test-wizard-question-add-button`).

**Then** `new-test-wizard-question-row-0` is visible, the validation paragraph is hidden, and the Publish button is enabled.

---

### TC-04: Full happy path — publishes test and reaches step 4 with a share link

**Prerequisites:** Educator session; consent primed; navigate to `/app/tests/new`.

**When** the user fills in title "E2E Wizard Test", advances through steps 1, 2, adds one question on step 3, and clicks "Publikovať".

**Then** the wizard transitions to step 4, the step-4 card title reads "Zdieľanie", and the share-link input value matches `/t/<shareId>`.

---

### TC-05: Step 4 Finish button navigates to the test detail route

**Prerequisites:** Complete the full wizard flow (see TC-04). Step 4 is rendered.

**When** the user clicks the Finish button (`new-test-wizard-publish-button`) on step 4.

**Then** the page URL contains `/app/tests/` followed by the created test ID.

---

## Edge cases

_(none for this session — covered by the five TCs above)_

---

## Out of scope

- Template pre-fill (`?templateId=…`) — covered by a future TC batch.
- Step 2 audience selection with a real group — covered by audiences spec.
- Clipboard copy behaviour on step 4 — not assertable without browser permission grants.
