# Admin — Tests index — test plan

**Route:** `/admin/tests`
**Component(s) under test:** `src/routes/admin/tests.index.lazy.tsx`, `src/components/admin/ConfirmDialog.tsx`, `src/components/admin/StatusBadge.tsx`
**Auth requirement:** `ADMIN_SESSION` (AAL2) + `has_role("admin") = true`
**Spec file:** `e2e/specs/admin/tests-index.spec.ts`
**POM:** `e2e/poms/admin/AdminTestsIndexPage.ts`

---

## Context

The `/admin/tests` route renders a CRUD table of all platform tests across
every owner account. Admins can search by title, filter by status / difficulty
/ branch / owner, select rows via checkboxes for bulk delete, open a single-row
delete confirm dialog, or navigate to the test editor via the row "Otvoriť"
link.

The route uses `useAdminTests()` (PostgREST → `tests` table). All filtering is
performed client-side on the fetched array. There is no server-side pagination.

`useDeleteTest()` issues a DELETE on the `tests` table and invalidates the
query — the Supabase mock handles both via `mockSupabase({ tables: { tests: [...] } })`.

---

## Happy paths

### TC-01: Empty state when no tests are seeded

**Prerequisites:** Admin session active; `tests` table seeded with zero rows.

**When** the user navigates to `/admin/tests`.

**Then** the page root (`admin-tests-list-root`) is visible.

**And** the empty-state element (`admin-tests-list-empty-state`) is visible
and contains the text "Žiadne testy v tomto filtri."

---

### TC-02: Populated list — rows render with title and status badge

**Prerequisites:** Admin session; `tests` table seeded with two rows: one
`draft` titled "Draft Alpha", one `published` titled "Published Beta".

**When** the user navigates to `/admin/tests`.

**Then** both list rows (`admin-tests-list-row-{id}`) are visible.

**And** each row contains its correct title text.

**And** the status badge inside the draft row carries `data-status="draft"`.

**And** the status badge inside the published row carries `data-status="published"`.

---

### TC-03: Search filter narrows the list to matching rows

**Prerequisites:** Admin session; `tests` table seeded with two rows: "Alpha
test" and "Beta test", both `draft`.

**When** the user navigates to `/admin/tests`.

**And** the user types "Alpha" into the search input (`admin-tests-list-search`).

**Then** the row for the Alpha test is visible.

**And** the row for the Beta test is no longer in the DOM.

---

### TC-04: Status filter hides non-matching tests

**Prerequisites:** Admin session; `tests` table seeded with one `draft` row and
one `published` row.

**When** the user navigates to `/admin/tests`.

**And** the user selects "Koncept" from the status dropdown
(`admin-tests-list-status-filter`).

**Then** the draft row is visible.

**And** the published row is no longer in the DOM.

---

### TC-05: Click "Otvoriť" navigates to the test editor

**Prerequisites:** Admin session; `tests` table seeded with one row.

**When** the user navigates to `/admin/tests`.

**And** the user clicks the "Otvoriť" link (`admin-tests-row-open-{id}`) for
the seeded test.

**Then** the URL changes to `/admin/tests/{id}`.

---

## Negative scenarios / edge cases

### TC-06: Row delete — confirm dialog appears and removes the row

**Prerequisites:** Admin session; `tests` table seeded with one row titled
"Delete Me".

**When** the user navigates to `/admin/tests`.

**And** the user clicks the delete icon button (`admin-tests-row-delete-{id}`)
for the seeded row.

**Then** the confirm dialog (`app-shell-confirm-dialog-root`) is visible with
title "Vymazať vybraté testy?"

**And** when the user clicks the confirm button
(`app-shell-confirm-dialog-confirm`), the dialog closes and the row is no
longer in the DOM.

**And** the empty-state element (`admin-tests-list-empty-state`) becomes
visible.
