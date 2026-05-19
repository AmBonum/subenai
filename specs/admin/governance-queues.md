# Admin governance queues — `/admin/audit` + `/admin/dsr` + `/admin/reports`

**Area:** `specs/admin/`
**Routes:** `/admin/audit`, `/admin/dsr`, `/admin/reports`
**Components under test:** `src/components/admin/{AuditLogViewer,DsrQueue,ReportsQueue}.tsx`, plus route shells
**API endpoints:** `GET /rest/v1/audit_log`, `GET /rest/v1/dsr_requests`, `GET /rest/v1/reports`
**Source stories:** AH-7, AH-8 (governance + respondent epic)
**Last updated:** 2026-05-19

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

- Filter dropdown interactions (status, type, actor, date range).
- Row action mutations (resolve DSR, dismiss report, etc.).
- Pagination beyond first page.
- PII flag toggling on audit-log rows.
- Cross-route navigation between queues.

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
