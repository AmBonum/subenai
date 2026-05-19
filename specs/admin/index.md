# Admin dashboard index — test plan

**Route:** `/admin`
**Component(s) under test:** `src/routes/admin/index.lazy.tsx`, `src/components/admin/StatCard.tsx`, `src/components/admin/PageHeader.tsx`, `src/components/admin/AdminSidebar.tsx`
**Project:** `e2e-chromium`
**Spec file:** `e2e/specs/admin/index.spec.ts`
**Auth:** `setupAdmin(context, page)` — ADMIN_SESSION (AAL2 pre-primed)

---

## Prerequisites (all TCs)

- Admin session primed via `setupAdmin`.
- Supabase tables mocked via `mockSupabase` extras.
- Consent primed to "all" (handled inside `setupAdmin`).

---

## Happy paths

### TC-01: Page renders the admin shell with the welcome heading and stat card grid

**Prerequisites:** `setupAdmin` called with empty tables (all counts 0).

**When** the user navigates to `/admin`.

**Then** the dashboard root element is visible.
**and** the page-header title reads "Prehľad".
**and** the page-header description reads "Zhrnutie aktivity, kľúčové metriky a najnovšie udalosti na platforme.".
**and** all four stat cards are visible: users, tests, sessions, DSR pending.
**and** the recent-activity card is visible.

---

### TC-02: Dashboard renders the error state when the stats query fails

**Prerequisites:** `setupAdmin` called with extras that inject a 500 error for the `profiles` table, causing `useAdminDashboardStats` to throw.

**When** the user navigates to `/admin`.

**Then** the dashboard error element is visible (the AdminListError component, `data-testid="admin-dashboard-error"`).
**and** the stat card grid is NOT rendered.

**Note:** The HEAD-based count mechanism for stat cards is exercised in production against real Supabase. The mock layer correctly propagates table errors to the component's error boundary, which this TC verifies.

---

### TC-03: Sidebar nav links navigate to admin sub-pages

**Prerequisites:** `setupAdmin` called with empty tables. User is on `/admin`.

**When** the user clicks the "Testy" sidebar link.
**Then** the URL changes to `/admin/tests`.

**When** the user navigates back to `/admin` and clicks the "Otázky" sidebar link.
**Then** the URL changes to `/admin/questions`.

**When** the user navigates back to `/admin` and clicks the "Používatelia" sidebar link.
**Then** the URL changes to `/admin/users`.

---

### TC-04: Recent-activity empty state renders when the audit_log table is empty

**Prerequisites:** `setupAdmin` called with extras seeding an empty `audit_log` table.

**When** the user navigates to `/admin`.

**Then** the recent-activity card is visible.
**and** the empty-state paragraph is visible (no activity rows are rendered).
