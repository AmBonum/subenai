# `/app/tests` — test plan

**Area:** `specs/app/`
**Component(s) under test:** `src/routes/app.tests.index.tsx`
**Routes:** `/app/tests`
**API endpoints:**
- `GET /rest/v1/tests` — list query (`useTests`)
**Data dependencies:** `tests` table (seeded via `seedTest` factory)
**Last updated:** 2026-05-19

---

## Context

`/app/tests` is the educator's test-management index page. It lists all tests
owned by (or shared with) the authenticated educator and exposes four surfaces:

1. **Page header** — eyebrow "Testy", title "Moje testy", subtitle
   "Spravuj draft, publikuj a sleduj výsledky.", and a "Nový test" button.
2. **Filter toolbar** — a text search input, a status-tab strip (Všetky /
   Drafty / Publikované / Archív), a branch/segmentation select, and a
   "Vyčistiť filtre" button.
3. **Test cards** — a 2-column grid of cards, each showing title, description,
   status badge, version, question count, and "Otvoriť" + "Zdieľať" action
   buttons. "Otvoriť" navigates to `/app/tests/$testId`.
4. **Empty state** — a card with the text "Žiadne testy v tomto filtri." when
   no tests match the current filters.

---

## Out of scope

- The "Zdieľať" (share) button and share dialog — covered by a separate plan.
- The "Nový test" wizard at `/app/tests/new` — covered by a separate plan.
- The test editor at `/app/tests/$testId` — covered by `test-editor.spec.ts`.
- Branch/segmentation select filtering — the branch dropdown only shows values
  derived from seeded `segmentation` arrays; full branch-filter coverage is
  deferred to a dedicated plan.
- RLS / server-side auth — covered by the Phase 9 pgTAP suite.

---

## Happy paths

### TC-01: Empty state renders when educator has no tests

**Prerequisites:**
- Educator session primed via `setupEducator`.
- `tests` table seeded with zero rows.

**When** the user navigates to `/app/tests`
**Then** the page root (`data-testid="tests-list-root"`) is visible
**and** the "Nový test" button (`data-testid="tests-list-new-test-button"`) is visible
**and** the empty-state card (`data-testid="tests-list-empty-state"`) is visible and contains the text "Žiadne testy v tomto filtri."
**and** no test row cards are in the DOM

---

### TC-02: List renders when tests are seeded

**Prerequisites:**
- Educator session primed via `setupEducator`.
- Two tests seeded via `seedTest`: one with `status: "draft"`, one with
  `status: "published"`.

**When** the user navigates to `/app/tests`
**Then** the empty-state card is NOT in the DOM
**and** a card row for each seeded test is visible (`data-testid="tests-list-row-<id>"`)
**and** the title element for each card shows the correct title (`data-testid="tests-list-row-title-<id>"`)

---

### TC-03: Status filter hides non-matching tests

**Prerequisites:**
- Educator session primed via `setupEducator`.
- Two tests seeded: one `status: "draft"`, one `status: "published"`.

**When** the user navigates to `/app/tests`
**and** clicks the "Drafty" tab (`data-testid="tests-list-status-filter"`)
**Then** the draft test row card is visible
**and** the published test row card is NOT in the DOM

---

### TC-04: "Nový test" button navigates to `/app/tests/new`

**Prerequisites:**
- Educator session primed via `setupEducator`.
- `tests` table seeded with zero rows (simplest state).

**When** the user navigates to `/app/tests`
**and** clicks "Nový test" (`data-testid="tests-list-new-test-button"`)
**Then** the page URL changes to `/app/tests/new`

---

### TC-05: Clicking "Otvoriť" navigates to the test editor

**Prerequisites:**
- Educator session primed via `setupEducator`.
- One test seeded via `seedTest`.

**When** the user navigates to `/app/tests`
**and** clicks "Otvoriť" for the seeded test (`data-testid="tests-list-row-open-<id>"`)
**Then** the page URL changes to `/app/tests/<id>`
