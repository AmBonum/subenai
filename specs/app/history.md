# App — History page — test plan

**Route:** `/app/history`
**Component(s) under test:** `src/routes/app.history.tsx`
**Playwright project:** `e2e-chromium`
**Spec file:** `e2e/specs/app/history.spec.ts`
**POM:** `e2e/poms/app/AppHistoryPage.ts`

## Context

The History page aggregates three event types — sessions, test-version publishes, and test status changes — into a single chronological timeline. The educator can narrow the list with four filters: test, date-from, date-to, and event type. "Vyčistiť filtre" resets all four at once. The list is capped at 100 rows; no pagination UI exists. There is no row-level navigation.

## Prerequisites (all TCs)

- Signed-in as the `EDUCATOR_SESSION` user (mocked via `setupEducator`).
- Supabase tables mocked: `tests`, `sessions`, `test_versions` (plus the base tables wired by `setupEducator`).
- Cookie consent pre-seeded to "all".

## Happy paths

### TC-01: Empty state when no events are seeded

**Given** `tests`, `sessions`, and `test_versions` are all empty arrays.
**When** the educator opens `/app/history`.
**Then** the empty-state card (`history-empty-state`) is visible.
**And** the card contains the text "Žiadne udalosti pre zvolené filtre."
**And** no row cards (`history-row-*`) are rendered.

### TC-02: Populated list shows a session row with correct title and action text

**Given** one test titled "E2E Kvíz" and one completed session linked to that test are seeded.
**When** the educator opens `/app/history`.
**Then** the empty-state card is NOT visible.
**And** the row card `history-row-s_<session.id>` is visible.
**And** its title element (`history-row-s_<session.id>-title`) shows "E2E Kvíz".
**And** its action element (`history-row-s_<session.id>-action`) shows "Session completed".
**And** its type badge (`history-row-s_<session.id>-type-badge`) shows "Session".

### TC-03: Event-type filter hides non-matching rows

**Given** one test with both a seeded session row and a seeded `test_versions` row.
**When** the educator opens `/app/history` (all rows visible initially).
**And** selects "Session" from the event-type filter dropdown.
**Then** the session row remains visible.
**And** the version row is no longer visible (filtered out).

### TC-04: Date-range filter hides rows outside the selected range

**Given** one test with two session rows: one started on 2026-05-01 and one on 2026-05-19.
**When** the educator opens `/app/history`.
**And** sets the "Od" date input to "2026-05-10".
**Then** only the session from 2026-05-19 is visible.
**And** the session from 2026-05-01 is not rendered.

### TC-05: "Vyčistiť filtre" resets all filters and restores the full list

**Given** the same two-session setup from TC-04.
**When** the educator opens `/app/history` and applies the date-from filter (hiding one row).
**And** clicks the "Vyčistiť filtre" button (`history-clear-filters-button`).
**Then** both session rows are visible again.
**And** the date-from input is cleared.

## Negative scenarios

None at this route — the component has no write operations, no form submissions, and no navigation. Filter errors are handled silently (empty list → empty-state card, covered by TC-01 and TC-04).

## Edge cases

None beyond what TC-01 through TC-05 cover. No pagination exists; the 100-row cap is a display limit not worth a Playwright test (it is a `slice` call with no UI affordance to assert on).
