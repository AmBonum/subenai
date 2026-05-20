# Admin governance queues — `/admin/audit` + `/admin/dsr` + `/admin/reports`

**Area:** `specs/admin/`
**Routes:** `/admin/audit`, `/admin/dsr`, `/admin/reports`
**Components under test:** `src/components/admin/{AuditLogViewer,DsrQueue,ReportsQueue}.tsx`, plus route shells
**API endpoints:** `GET /rest/v1/audit_log`, `GET /rest/v1/dsr_requests`, `GET /rest/v1/reports`
**Source stories:** AH-7, AH-8 (governance + respondent epic), E43 (audit-log read-flow lock)
**Last updated:** 2026-05-20

---

## Context

Three governance read-views in the admin shell. Each route is a thin
lazy shell that mounts the corresponding component
(`AuditLogViewer`, `DsrQueue`, `ReportsQueue`). The components carry
the bulk of the testable surface — filters, table, empty state, row
actions. Phase 7 session 4 covers the smoke-baseline contract: page
mounts, shell renders, empty state visible when the underlying table
is unseeded.

Deeper interaction coverage (filter persistence, row resolve/reject
mutations, audit-log pagination) is intentionally deferred to a
later epic — those mutations rely on multi-table mock state that
isn't fully reproducible without expanding the mockSupabase
infrastructure.

## Out of scope

- Row action mutations (resolve DSR, dismiss report, etc.).
- Cross-route navigation between queues.
- Filter dropdown interactions for DSR / reports queues (TC-02, TC-03);
  audit-log filter coverage is in TC-04–TC-08 below.

---

## TC-01: `/admin/audit` page renders with empty state when no audit log entries

**Prerequisites**: admin session primed via `setupAdmin` with `audit_log: []`.
**When** the admin visits `/admin/audit`
**Then** `data-testid="admin-audit-root"` is visible
**and** the page header reads "Audit log" (Slovak `audit_log.title`)
**and** the empty-state card `data-testid="audit-log-empty-state"` is visible
**and** no `audit-log-row-*` elements exist

## TC-02: `/admin/dsr` page renders + header interpolates open-request count

**Prerequisites**: admin session primed with one seeded open DSR row
(`dsr_requests: [{ id, status: "open", ... }]`).
**When** the admin visits `/admin/dsr`
**Then** `data-testid="admin-dsr-root"` is visible
**and** the page-header description includes the count "1" (from `t("description", { open })`)
**and** the queue table `data-testid="dsr-queue-table"` is visible
**and** at least one `dsr-queue-row-*` is rendered

## TC-03: `/admin/reports` page renders with empty state when no reports

**Prerequisites**: admin session primed with `reports: []`.
**When** the admin visits `/admin/reports`
**Then** `data-testid="admin-reports-root"` is visible
**and** the empty-state card `data-testid="reports-queue-empty-state"` is visible
**and** no `reports-queue-row-*` elements exist

---

## Audit log read-flow (E43)

E35.1 matrix marked the audit-log INSERT path as locked
(`tests/lib/supabase/audit-log-immutable.test.ts` + the RLS-enforcement
suite). The READ path was marked partial: a unit test exists
(`tests/routes/admin/audit.test.tsx`) but no Playwright spec exercised
the populated read flow. TC-04–TC-08 close that gap — they exercise the
viewer the way an admin actually uses it, not just the empty shell.

## TC-04: `/admin/audit` renders table and rows when audit_log has entries

**Prerequisites**: admin session primed with three seeded `audit_log`
rows (mix of actors, actions, PII flags).
**When** the admin visits `/admin/audit`
**Then** `data-testid="audit-log-table"` is visible
**and** the empty-state card is NOT visible
**and** three rows matching `audit-log-row-*` are rendered

## TC-05: Actor filter narrows the visible rows

**Prerequisites**: TC-04 seed (rows authored by both `alice` and `bob`).
**When** the admin types `alice` into `data-testid="audit-log-filter-actor"`
**Then** only the row(s) with `actor_name` containing `alice` remain visible
**and** rows authored by `bob` are no longer in the DOM

## TC-06: Action filter narrows the visible rows

**Prerequisites**: TC-04 seed (rows with actions `respondent_invite_sent`
and `dsr_request_resolved`).
**When** the admin opens `data-testid="audit-log-filter-action"` and
selects `dsr_request_resolved`
**Then** only the row(s) with that action remain visible

## TC-07: PII-only filter narrows the visible rows

**Prerequisites**: TC-04 seed (one row with `pii_access: true`, two with
`pii_access: false`).
**When** the admin opens `data-testid="audit-log-filter-pii"` and selects
the "only PII" option (Slovak `audit_log.filter_pii_only`)
**Then** exactly one row remains visible
**and** that row carries the PII badge (`ShieldAlert` icon block).

## TC-08: Pagination — next/prev advances by `PAGE_SIZE` (25)

**Prerequisites**: admin session primed with 30 seeded `audit_log` rows.
**When** the admin lands on `/admin/audit`
**Then** the page shows 25 rows
**and** the prev button (`data-testid="audit-log-pagination-prev"`) is
disabled
**and** the next button is enabled.
**When** the admin clicks next
**Then** the page shows the remaining 5 rows
**and** the next button is now disabled
**and** the prev button is enabled.
