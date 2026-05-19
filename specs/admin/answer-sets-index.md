# Admin answer-sets index — test plan

**Route:** `/admin/answer-sets`
**Component(s) under test:** `src/routes/admin/answer-sets.index.lazy.tsx`
**Project:** `e2e-chromium`
**Spec file:** `e2e/specs/admin/answer-sets-index.spec.ts`

---

## Context

The answer-sets index page shows a card grid of all `answer_sets` rows. Cards display the set
name, description, category badges, correct/incorrect answer counts, and usage count. A name search
input filters the grid client-side. Each card has an "Upraviť" link and a "Detail" link that both
navigate to `/admin/answer-sets/$setId`.

---

## Prerequisites (all TCs)

- Admin session active (AAL-2 satisfied).
- Cookie consent pre-seeded ("all").
- Supabase mock wired via `setupAdmin` with tables `answer_sets`, `answers`, `questions`.

---

## Happy paths

### TC-01: Empty state when no answer-sets are seeded

**Given** the `answer_sets` table is empty.
**When** the user opens `/admin/answer-sets`.
**Then** the page root (`admin-answer-sets-root`) is visible.
**and** the empty-state paragraph (`answer-sets-list-empty-state`) is visible and contains
"Žiadne sady. Vytvorte prvú kliknutím na „Nová sada\".".
**and** no answer-set cards are in the DOM.

---

### TC-02: Populated list — cards render with name and category badge

**Given** one answer-set row seeded: `id="as_e2e_01"`, `name="E2E ladená sada"`,
`branch_slugs=["financie"]`.
**When** the user opens `/admin/answer-sets`.
**Then** the card for `as_e2e_01` (`answer-sets-list-row-as_e2e_01`) is visible.
**and** the card contains the text "E2E ladená sada".
**and** the empty-state paragraph is not in the DOM.

---

### TC-03: Search filter by name narrows the card grid

**Given** two answer-set rows seeded: `"E2E Alpha"` (id `as_e2e_01`) and `"E2E Beta"` (id `as_e2e_02`).
**When** the user opens `/admin/answer-sets`.
**and** the user types "Alpha" into the search input (`answer-sets-list-search`).
**Then** the card for `as_e2e_01` is still visible.
**and** the card for `as_e2e_02` is not in the DOM.
**and** the empty-state paragraph is not in the DOM.

---

### TC-04: Search with no match shows the empty-state paragraph

**Given** one answer-set row seeded: `"E2E Alpha"` (id `as_e2e_01`).
**When** the user opens `/admin/answer-sets`.
**and** the user types "zzznomatch" into the search input.
**Then** the card for `as_e2e_01` is not in the DOM.
**and** the empty-state paragraph (`answer-sets-list-empty-state`) is visible.

---

### TC-05: Clicking the "Upraviť" link navigates to the editor

**Given** one answer-set row seeded: `id="as_e2e_01"`, `name="E2E ladená sada"`.
**When** the user opens `/admin/answer-sets`.
**and** the user clicks the "Upraviť" edit link (`answer-sets-row-edit-as_e2e_01`) on the card.
**Then** the page URL matches `/admin/answer-sets/as_e2e_01`.

---

## Edge cases

_(None beyond TC-04 which covers the zero-match edge case of the search filter.)_

---

## Out of scope

- Create / duplicate / delete flows (covered by future mutation TCs).
- The answer-set editor page at `$setId` (covered by `answer-set-editor.spec.ts`).
- Locale/branch dropdown filter (component uses name-only client-side search — no such filter exists).
