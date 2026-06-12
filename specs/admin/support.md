# Admin Support — test plan

**Area:** admin  
**Route:** `/admin/support` (back-compat redirect) → `/admin/tickets`  
**Component(s) under test:** `src/routes/admin/support.tsx` (redirect), `src/routes/admin/tickets.lazy.tsx`  
**Auth requirement:** ADMIN_SESSION (AAL2, `has_role` mock returns `true`)  
**Data sources:** `support_tickets` + `support_tickets_with_assignees` mock tables

---

## Context

The standalone support-channel config page was removed in E48.6 — the support IA merged
into the tickets queue at `/admin/tickets`. `/admin/support` survives only as a redirect
so old bookmarks, the admin sidebar history, and the `/docs/admin/support` references
keep landing somewhere meaningful.

The tickets queue itself is covered by the dedicated queue/detail plans
(`admin-queue-*`, `admin-detail-*`, `support-ticket-flow`). This plan only locks the
redirect contract.

---

## Happy paths

### TC-01: `/admin/support` redirects to the tickets queue

**Prerequisites:** Admin is signed in; one ticket seeded in the mock.

**When** the admin navigates to `/admin/support`.

**Then** the URL is rewritten to `/admin/tickets`.  
**and** the queue root (`admin-tickets-queue`) is visible.  
**and** the queue table (`admin-tickets-table`) renders the seeded ticket.
