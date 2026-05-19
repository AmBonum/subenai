# `/app` dashboard — test plan

**Area:** `specs/app/`
**Component(s) under test:** `src/routes/app.index.tsx`, `src/components/app/page-header.tsx`, `src/components/admin/StatCard.tsx`, `src/components/user/AppShell.tsx`
**Routes:** `/app`
**API endpoints:** `GET /rest/v1/tests`, `GET /rest/v1/sessions`, `GET /rest/v1/respondents`
**Data dependencies:** `tests`, `sessions`, `respondents` tables; `profiles` (display name via `useCurrentProfile`)
**Source stories:** Phase 6 of testing-coverage epic
**Last updated:** 2026-05-19

---

## Context

`/app` (route `app.index.tsx`) is the educator dashboard — the first
screen after login/onboarding. It reads three data sources
(`useTests`, `useUserSessions`, `useUserRespondents`) and renders one of
two branches:

- **Empty branch** — when all three datasets are empty: shows a single
  `app-dashboard-empty-state` card with a heading and two CTAs.
- **Populated branch** — otherwise: renders optional contextual cards
  (last test, weekly delta, drafts, digest, recommendations, retests,
  peer comparison) followed by a stats section with four `StatCard`
  components.

The AppShell wraps the page and provides the sidebar nav and header.

## Out of scope

- Optional contextual cards that depend on RPCs
  (`DigestDashboardCard`, `PeerDashboardCard`, `RetestDashboardCard`,
  `RecommendationsDashboardCard`) — each has its own data dependency
  and is tested via its own plan.
- The intro banner (`app-dashboard-intro-banner`) — localStorage-driven,
  covered separately.
- RLS correctness — covered in the Phase 9 pgTAP suite.
- The `/app/tests/new` and `/app/templates` routes — covered by their
  own specs.

---

## Happy paths

### TC-01: Empty state renders when no data is seeded

**Prerequisites:**
- Educator session primed via `setupEducator` with `tests: []`,
  `sessions: []`, `respondents: []`.

**When** the user navigates to `/app`
**Then** the empty-state card (`data-testid="app-dashboard-empty-state"`) is visible
**and** the empty-state title reads "Tu sa zobrazia výsledky tvojich tried."
**and** the primary and secondary CTAs are visible
**and** the stats section (`data-testid="app-dashboard-stats-section"`) is NOT rendered

### TC-02: Populated state renders all four StatCards

**Prerequisites:**
- Educator session primed with 1 published test and 1 completed session.

**When** the user navigates to `/app`
**Then** all four StatCards are visible:
  `app-dashboard-stat-card-tests`,
  `app-dashboard-stat-card-sessions`,
  `app-dashboard-stat-card-respondents`,
  `app-dashboard-stat-card-completion`

### TC-03: StatCard values reflect seeded counts

**Prerequisites:**
- 1 published test, 1 completed session, 0 respondents.

**When** the user navigates to `/app`
**Then** `app-dashboard-stat-card-tests-value` reads "1" (one active test)
**and** `app-dashboard-stat-card-sessions-value` reads "1" (one session)
**and** `app-dashboard-stat-card-completion-value` reads "100%" (1/1 completed)

### TC-04: Page header shows eyebrow "Prehľad" and title "Môj prehľad"

**Prerequisites:**
- Educator session primed with at least 1 published test (populated branch).

**When** the user navigates to `/app`
**Then** `app-shell-page-header-eyebrow` reads "Prehľad"
**and** `app-shell-page-header-title` contains "Môj prehľad"

### TC-05: Empty-state CTAs link to correct routes

**Prerequisites:**
- Educator session primed with no data (empty branch).

**When** the user navigates to `/app`
**Then** the primary CTA (`app-dashboard-empty-cta-primary`) has `href="/app/tests/new"`
**and** the secondary CTA (`app-dashboard-empty-cta-secondary`) has `href="/app/templates"`

### TC-06: Shell header shows the educator display name

**Prerequisites:**
- Educator session primed; `setupEducator` seeds `display_name = "educator"`
  (derived from `educator@e2e.test` email prefix).

**When** the user navigates to `/app`
**Then** `app-shell-header-user-name` reads "educator"

### TC-07: Drafts card renders when a draft test is seeded

**Prerequisites:**
- Educator session primed with 1 draft test, 0 sessions, 0 respondents.

**When** the user navigates to `/app`
**Then** the empty state is NOT rendered (populated branch shows)
**and** `app-dashboard-drafts-card` is visible
**and** `app-dashboard-drafts-row-{id}` for the seeded draft is visible

### TC-08: Page title reads "Môj prehľad · SubenAI"

**Prerequisites:**
- Educator session primed with at least 1 published test (populated branch).

**When** the user navigates to `/app`
**Then** `document.title` equals "Môj prehľad · SubenAI"
