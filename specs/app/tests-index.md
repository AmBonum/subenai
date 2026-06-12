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
   Koncepty / Publikované / Archív), a branch/segmentation select, and a
   "Vyčistiť filtre" button. Hidden in the true-empty (first-run) state.
3. **Test cards** — a 2-column grid of cards, each showing title, description,
   status badge, version, question count, an audience-group chip (group NAME,
   never the UUID — `tests-list-row-audience-<id>`, resolved via
   `useAudiences`), and "Otvoriť" + "Zdieľať" + "Duplikovať" + "Vymazať"
   action buttons (E50). "Otvoriť" navigates to `/app/tests/$testId`;
   "Vymazať" opens the destructive `ConfirmDialog` with a typed-confirm on
   the test title.
4. **Empty states (E50)** — two distinct branches:
   - **True-empty** (educator owns zero tests AND the query didn't error):
     `tests-list-empty-initial` card with headline "Zatiaľ nemáš žiadne
     testy." and a "Vytvoriť prvý test" CTA linking to `/app/tests/new`.
   - **Filter-empty** (tests exist, none match — or the query errored):
     `tests-list-empty-state` card with "Žiadne testy v tomto filtri." and
     a "Vyčistiť filtre" action (`tests-list-empty-state-clear-filters`).

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

### TC-01: True-empty state renders the first-run card with a create CTA

**Prerequisites:**
- Educator session primed via `setupEducator`.
- `tests` + `respondent_groups` tables seeded with zero rows.

**When** the user navigates to `/app/tests`
**Then** the page root (`data-testid="tests-list-root"`) is visible
**and** the "Nový test" button (`data-testid="tests-list-new-test-button"`) is visible
**and** the first-run card (`data-testid="tests-list-empty-initial"`) is visible with the headline "Zatiaľ nemáš žiadne testy." and the CTA (`tests-list-empty-initial-cta`)
**and** the filter-empty card (`tests-list-empty-state`) is NOT in the DOM
**and** no test row cards are in the DOM
**and** clicking the CTA navigates to `/app/tests/new`

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
**and** clicks the "Koncepty" tab (`data-testid="tests-list-status-filter"`)
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

---

### TC-06: Duplicate action calls `duplicate_test` with the test id and the list refetches

**Status:** un-fixme'd 2026-06-11 — the "Duplikovať" row action shipped with E50 review fix 5.

**Prerequisites:**
- Educator session primed via `setupEducator`.
- One test seeded via `seedTest`.
- `duplicate_test` RPC mocked with a recording resolver that appends the
  copied row to the seeded `tests` table (via the mock's `RpcContext`) and
  returns the new test id.

**When** the user clicks "Duplikovať" for the seeded test
(`data-testid="tests-list-row-duplicate-<id>"`)
**Then** the RPC is called exactly once with `{ p_test_id: <seeded id> }`
**and** a success toast shows "Kópia testu vytvorená."
**and** the duplicated row appears after the query-invalidation refetch.

---

### TC-07: Delete action requires typing the test title and removes the row

**Prerequisites:**
- Educator session primed via `setupEducator`.
- One test seeded via `seedTest` (title "Delete me E2E").

**When** the user clicks "Vymazať" (`data-testid="tests-list-row-delete-<id>"`)
**Then** the shared `ConfirmDialog` opens with `data-severity="destructive"`
**and** the confirm button stays disabled until the EXACT test title is typed
into the typed-confirm input (a wrong title keeps it disabled)
**and** after confirming, the row disappears from the list (DELETE + refetch)
**and** a success toast shows "Test vymazaný."
