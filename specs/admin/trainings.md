# Admin Trainings — test plan

**Area:** admin
**Route:** `/admin/trainings`
**Component(s) under test:** `src/routes/admin/trainings.lazy.tsx`
**Auth requirement:** ADMIN_SESSION (AAL2, `has_role` mock returns `true`)
**Data sources:** `trainings` table (id, title, description, topic_slug, status, created_at)

---

## Context

The Trainings page lists all training records fetched from the `trainings` Supabase table.
Each row shows the title, description excerpt, topic label, and status badge. A search input
filters rows client-side by title. When the table is empty (or the search matches nothing) an
empty-state block is shown. The "Nové školenie" button opens a `TrainingEditor` sheet where
the admin fills in the title and saves. All mutations go through TanStack Query; the mock layer
in tests intercepts the underlying Supabase REST calls.

---

## Happy paths

### TC-01: Empty state when no trainings are seeded

**Prerequisites:** Admin is signed in; `trainings` table is empty.

**When** the admin navigates to `/admin/trainings`.

**Then** the page root (`admin-trainings-root`) is visible.
**and** the empty-state block (`admin-trainings-list-empty-state`) is visible.
**and** the empty-state block contains the text "Žiadne školenia".
**and** the "Nové školenie" button (`admin-trainings-list-new-button`) is visible.

---

### TC-02: Populated list — training rows render with title and status badge

**Prerequisites:** Admin is signed in; `trainings` table contains one row with
`id = "tr_e2e_p01"`, `title = "E2E Test Training"`, `status = "published"`,
`topic_slug = "vseobecne"`.

**When** the admin navigates to `/admin/trainings`.

**Then** the empty-state block (`admin-trainings-list-empty-state`) is not in the DOM.
**and** the row for `tr_e2e_p01` (`admin-trainings-list-row-tr_e2e_p01`) is visible.
**and** that row contains the text "E2E Test Training".
**and** the edit button (`admin-trainings-row-edit-tr_e2e_p01`) is visible on that row.

---

### TC-03: "Nové školenie" button opens the TrainingEditor sheet

**Prerequisites:** Admin is signed in; `trainings` table is empty.

**When** the admin navigates to `/admin/trainings`.
**and** the admin clicks "Nové školenie" (`admin-trainings-list-new-button`).

**Then** the TrainingEditor sheet is open and the title input
(`training-editor-title-input`) is visible and empty.
**and** the save button (`training-editor-save-button`) is visible.
**and** the cancel button (`training-editor-cancel-button`) is visible.

**When** the admin clicks the cancel button (`training-editor-cancel-button`).

**Then** the title input (`training-editor-title-input`) is no longer in the DOM.

---

## Edge cases

_(None in scope for Phase 7 session 4 — search filter and delete-confirm are deferred
to a follow-up plan once the TrainingEditor sheet stabilises.)_
