# E48 — Ticket system end-to-end coverage

**Area:** `specs/support/`
**Component(s) under test:**
- `src/routes/contact-form/index.tsx` (public form)
- `src/routes/contact-form/ticket.$id.tsx` (view-token thread)
- `src/routes/admin/tickets/index.tsx` (admin queue)
- `src/routes/admin/tickets/$ticketId.tsx` (admin detail)
- `src/routes/admin/settings/notifications.tsx` (notification preferences)
- `functions/api/support-ticket-create.ts`
- `functions/api/support-ticket-reply.ts`
- `functions/api/support-attachment-upload.ts`
- `functions/_lib/email-templates.ts` (supportTicketReceivedEmail, supportTicketReplyEmail, supportTicketResolvedEmail)
- `supabase/migrations/20260521260000_e48_1_support_tickets_schema.sql`
**Routes:** `/contact-form`, `/contact-form/ticket/$id`, `/admin/tickets`, `/admin/tickets/$ticketId`, `/admin/settings/notifications`
**API endpoints:**
- `POST /api/support-ticket-create`
- `POST /api/support-ticket-reply`
- `POST /api/support-attachment-upload`
- Supabase RPC `submit_support_ticket(jsonb)`
- Supabase RPC `get_ticket_thread_for_view_token(uuid, text, jsonb)`
- Supabase RPC `request_attachment_signed_url(uuid, boolean)`
- Supabase RPC `regenerate_support_ticket_view_token(uuid)`
- Supabase RPC `assign_admin_to_ticket(uuid, uuid)`
- Supabase RPC `unassign_admin_from_ticket(uuid, uuid)`
- Supabase RPC `list_admin_users()`
- Supabase RPC `transition_ticket_status(uuid, text, text)`
**Data dependencies:**
- `public.support_tickets`, `public.support_ticket_messages`, `public.support_ticket_attachments`
- `public.support_ticket_assignees` (junction: multi-assignment, E48-v3)
- `public.support_tickets_with_assignees` view (`security_invoker = true`)
- `public.admin_notification_preferences`
- `public.audit_log` (E46 pattern)
- Storage bucket `support-attachments` (private)
- RLS policies on all four tables
- CF KV namespace `SUPPORT_RATE_LIMIT` (IP rate-limit counter)
**Source stories:**
- `tasks/stories/E48.3-public-kontakt-form.md` (AC-1 through AC-10)
- `tasks/stories/E48.5-confirmation-emails.md` (AC-1 through AC-8)
- `tasks/stories/E48.6-admin-tickets-index.md` (AC-1 through AC-10)
- `tasks/stories/E48.7-admin-tickets-detail.md` (AC-1 through AC-10)
- `tasks/stories/E48.8-admin-reply-cf-function.md` (AC-1 through AC-7)
- `tasks/stories/E48.9-admin-notification-preferences.md` (AC-1 through AC-9)
- `tasks/stories/E48.10-test-pyramid-and-security.md` (AC-1 through AC-8)
- `specs/support/E48-security.md` (TC-01 through TC-48; those scenarios are NOT duplicated here — this plan is additive)
**Last updated:** 2026-05-22

---

## Scope and contract

This plan covers the **positive and complementary-negative** scenarios for the E48 support ticketing system that are not already covered by `specs/support/E48-security.md`. The security plan owns: magic-byte polyglot attacks, filename injection, SQL injection via search, stored XSS rendering, all RLS-shape enforcement, view-token edge cases, honeypot/rate-limit gates, and attachment AV/scan-gating. This plan owns: happy-path submission flows, form validation UX, success-state rendering, admin queue filtering/sorting/pagination, admin detail thread rendering, multi-assignment (E48-v3), inline attachment viewer (E48-v3), queue improvements (E48-v3), view-token rotation on admin reply, CSV export injection-safe encoding, email template contracts, notification preferences, accessibility, mobile viewports, concurrency, and performance smoke.

**What is NOT tested in this plan:**
- Real Resend delivery (no real email is sent; Resend is mocked or captured via `mockSupportApi`)
- Real Cloudflare Turnstile validation (the widget is mocked at the network layer)
- Real VirusTotal / ClamAV scan (deterministic-only pipeline per PLAN D-1; no AV codes)
- Inbound email parsing (explicitly out of E48 scope per PLAN §Out)
- Image re-encoding / EXIF strip (deferred to v2)
- JBIG2Decode / JPXDecode PDF filter rejection (not yet in sanitise.ts v1)
- `/app/help/contact` authenticated form (separate story E48.4, separate spec file)
- Multi-admin simultaneous concurrent sessions against a live DB (tested in the concurrency section via service-role seeding only)
- Stripe, sponsorship, or any unrelated flows

**Cleanup guarantees:** Every spec that writes to the DB seeds rows with subject prefixed `[E2E-SEED-W{workerIndex}]` via `seedTickets(workerIndex)` from `tests/fixtures/seed-tickets.ts`. All tables touched (including `support_ticket_assignees`, `support_ticket_messages`, `support_ticket_attachments`) cascade-delete from the parent `support_tickets` row. `cleanupAllSeeds()` runs in `e2e/global-teardown.ts` after every run. Storage objects follow the same cascade (Storage policy mirrors the DB FK cascade). Specs that use `mockSupabase` / `mockSupportApi` write no real DB rows and need no teardown.

---

## Test users

| Persona | Identity | Auth mechanism | Cleanup |
|---|---|---|---|
| Anonymous submitter | No account | No cookie, no JWT | n/a — no DB write via this persona without service-role seeding |
| Regular user (audit-bot) | `audit-bot@subenai.test` / `AuditBot-2026-secure` | Real sign-in at `/login` via `primeAuthSession` or production Supabase | No cleanup needed (read-only assertions only; seeded tickets use seed prefix) |
| Admin (mocked) | `admin@e2e.test` / `ADMIN_SESSION` from `e2e/fixtures/auth.ts` | `primeAuthSession(context, page, ADMIN_SESSION)` in `beforeEach` via `setupAppShell` | No DB writes via mocked session; all real mutations use service-role seed |
| Admin (AAL1, mocked) | `admin@e2e.test` / `ADMIN_AAL1_SESSION` | `primeAuthSession(context, page, ADMIN_AAL1_SESSION)` | n/a |
| Non-admin authenticated (User B) | `respondent@e2e.test` / `RESPONDENT_SESSION` | `primeAuthSession(context, page, RESPONDENT_SESSION)` | n/a |

---

## Seed/cleanup contract

**Prefix convention:** `[E2E-SEED-W{workerIndex}]` — the integer `workerIndex` comes from Playwright's `testInfo.workerIndex` (0-based). Example: worker 2 seeds rows with prefix `[E2E-SEED-W2]`.

**Tables that need cleanup (cascade from support_tickets):**
- `support_tickets` — direct seed target; `DELETE WHERE subject LIKE '[E2E-SEED-W%]%'` is sufficient
- `support_ticket_messages` — FK ON DELETE CASCADE from `support_tickets`
- `support_ticket_attachments` — FK ON DELETE CASCADE from `support_tickets`
- `support_ticket_assignees` — FK ON DELETE CASCADE from `support_tickets`
- `audit_log` rows — NOT cascaded; cleanup via `DELETE FROM audit_log WHERE metadata->>'ticket_id' IN (<seeded ids>)` if E48.v3 audit log tests assert specific rows. Plan a helper in `tests/fixtures/seed-tickets.ts` (new export `cleanupAuditRows(workerIndex)` reading back the seeded ids first).
- Storage objects under `support-attachments/<ticket_id>/` — cleanup via service-role `storage.objects` delete call after all attachment specs finish (add `cleanupAttachmentObjects(ids)` to the seed helper).

**RPCs that need cleanup hooks:**
- `assign_admin_to_ticket` / `unassign_admin_from_ticket` — rows in `support_ticket_assignees` are cascade-deleted with the ticket; no separate cleanup needed if the parent ticket is in the seed prefix.
- `regenerate_support_ticket_view_token` — updates the parent row; cleaned up with the parent.
- Signed-URL probe artifacts — signed URLs are ephemeral (Supabase Storage signs with TTL); no persisted artifact to clean up.

---

## Files to create

**`e2e/specs/support/`** (new or extended)
- `public-submission.spec.ts` — A1, A2, A3 (partial), A4, A5, A6 (mock contract)
- `kontakt-view-token-thread.spec.ts` — B1, B2, B3, B4, B5, B6
- `admin-queue-filters-sort.spec.ts` — C1, C2, C3, C4, C5, C6
- `admin-queue-csv-export.spec.ts` — C7
- `admin-queue-sidebar-badge.spec.ts` — C8, C9
- `admin-detail-render.spec.ts` — D1, D2, D3, D4
- `admin-detail-multi-assignment.spec.ts` — D5a through D5f
- `admin-detail-attachment-viewer.spec.ts` — D6a through D6e
- `admin-detail-audit-log.spec.ts` — D7
- `notification-preferences.spec.ts` — extends/replaces `e2e/specs/admin/support-notification-prefs.spec.ts` for H3, H4 scenarios
- `accessibility-and-mobile.spec.ts` — I1, I2, I3, I4
- `performance-smoke.spec.ts` — J1, J2, J3

**`e2e/integration/support/`** (new)
- `multi-assignment-rls.spec.ts` — E1 through E11 (new RLS scenarios for v3 tables)
- `token-rotation.spec.ts` — B4 integration layer, G3
- `concurrency.spec.ts` — G1, G2, G4, G5
- `email-contracts.spec.ts` — H1, H2, H3, H4, H5

**`e2e/poms/support/`** (extend existing)
- `KontaktPage.ts` — add `viewTicketLink`, `copyTicketIdButton`, `attachmentDropzone`, `attachmentFileItem`, `attachmentError` getters
- `KontaktTicketViewPage.ts` — add `attachmentList`, `attachmentItem(id)`, `attachmentDownloadLink(id)` getters

**`e2e/poms/admin/`** (extend existing)
- `AdminTicketsQueuePage.ts` — add `sortableHeader(col)`, `sortAriaSort(col)`, `assigneesCell(ticketId)`, `queueStatusPopoverTrigger(ticketId)`, `queueStatusPopoverOption(status)`, `confirmDialog`, `csvExportButton`, `bulkSelectCheckbox(ticketId)`, `bulkActionsBar`, `sidebarSupportBadge`, `paginationNext`, `paginationPrev`, `clearFiltersButton`, `categoryFilter(category)`, `assigneeFilter(value)`, `scanStatusFilter(value)` getters
- `AdminTicketDetailPage.ts` — add `assigneesBlock`, `adminPickerButton`, `adminPickerSearch`, `adminPickerOption(userId)`, `assignedChip(userId)`, `unassignChipButton(userId)`, `selfAssignButton`, `selfUnassignButton`, `attachmentSection`, `attachmentThumbnail(attachmentId)`, `lightboxDialog`, `lightboxPrevButton`, `lightboxNextButton`, `lightboxCloseButton`, `lightboxCaption`, `pdfIframe(attachmentId)`, `internalNoteCheckbox`, `internalNoteBadge(messageId)`, `deleteButton`, `deleteCancelBanner`, `auditLogSection`, `auditLogEntry(action)`, `confirmDialogRoot`, `confirmDialogConfirmButton`, `confirmDialogCancelButton`, `confirmDialogTypedInput` getters

**`tests/fixtures/seed-tickets.ts`** (extend)
- Add `seedTicketWithMessages(workerIndex, messageCount)` — creates one parent ticket + N message rows
- Add `seedTicketWithAttachments(workerIndex, attachmentMeta[])` — creates ticket + attachment rows with given scan_status
- Add `seedTicketsForQueue(workerIndex, count, status)` — bulk seed for pagination/performance tests
- Add `cleanupAuditRows(workerIndex)` — deletes audit_log rows for seeded ticket ids
- Add `cleanupAttachmentObjects(ticketIds[])` — deletes Storage objects for seeded ticket ids

---

## State machine reference

Valid status transitions (per FSM in migration and `transition_ticket_status` RPC):

| From | To | Button label in admin UI | Confirm dialog? |
|---|---|---|---|
| `new` | `in_progress` | "Začať riešiť" | No |
| `in_progress` | `waiting_user` | "Čakám na používateľa" | No |
| `in_progress` | `resolved` | "Uzavrieť" | Yes — `severity='success'` |
| `waiting_user` | `in_progress` | "Pokračovať v riešení" | No |
| `waiting_user` | `resolved` | "Uzavrieť" | Yes — `severity='success'` |
| `resolved` | `in_progress` | "Znovu otvoriť" | No |
| `resolved` | `archived` | "Archivovať" | Yes — `severity='warning'` |
| `archived` | `in_progress` | "Znovu otvoriť" | No |
| `reopened` | `in_progress` | (same as archived→in_progress path) | No |
| Any non-archived | (soft-mark spam) | "Označiť ako spam" | Yes — `severity='destructive'` with **ticket-id** typed-confirm |

Illegal transitions (TC reference: TC-46 in E48-security.md):
- `new → resolved` (must go through `in_progress` first)
- `archived → resolved` (must reopen first)
- Any `→ new` (new is only an insert state)

Admin reply auto-transition: replying from the detail composer flips `status → waiting_user` unless the ticket is `resolved` or `archived`.

---

## Scenarios

### A. Public submission (`/contact-form`)

| ID | Title | Type | Spec file | POM(s) | Cleanup |
|---|---|---|---|---|---|
| A-01 | Anonymous submitter fills all fields and receives ticket id | e2e | `public-submission.spec.ts` | `KontaktPage` | No (mocked) |
| A-02 | Named submitter (name optional) is included in the POST body | e2e | `public-submission.spec.ts` | `KontaktPage` | No (mocked) |
| A-03 | Each of the 7 category options submits without error | e2e | `public-submission.spec.ts` | `KontaktPage` | No (mocked) |
| A-04 | Subject shorter than 5 chars shows inline error | e2e | `public-submission.spec.ts` | `KontaktPage` | No |
| A-05 | Subject at exact 200-char boundary is accepted | e2e | `public-submission.spec.ts` | `KontaktPage` | No (mocked) |
| A-06 | Subject at 201 chars is rejected by the API | integration | `ticket-create.spec.ts` (extend) | — | No |
| A-07 | Body shorter than 20 chars shows inline error | e2e | `public-submission.spec.ts` | `KontaktPage` | No |
| A-08 | Body at exact 5000-char boundary is accepted by the API | integration | `ticket-create.spec.ts` (extend) | — | No |
| A-09 | Body at 5001 chars is rejected by the API | integration | `ticket-create.spec.ts` (extend) | — | No |
| A-10 | Missing email shows inline error | e2e | `public-submission.spec.ts` | `KontaktPage` | No |
| A-11 | Malformed email shows inline error | e2e | `public-submission.spec.ts` | `KontaktPage` | No |
| A-12 | Server 429 rate_limited_ip shows user-facing error message | e2e | `public-submission.spec.ts` | `KontaktPage` | No (mocked) |
| A-13 | Honeypot field filled returns 200 with `ticket_id: "honeypot-discarded"` | integration | `ticket-create.spec.ts` (existing) | — | No |
| A-14 | Turnstile failure returns 400 from the CF function | integration | `ticket-create.spec.ts` (extend) | — | No |
| A-15 | Single image attachment is accepted; file chip appears before submit | e2e | `public-submission.spec.ts` | `KontaktPage` | No (mocked) |
| A-16 | Single PDF attachment is accepted | e2e | `public-submission.spec.ts` | `KontaktPage` | No (mocked) |
| A-17 | File exceeding 5 MB shows client-side error without submitting | e2e | `public-submission.spec.ts` | `KontaktPage` | No |
| A-18 | Success state displays ticket id and link to view-token thread | e2e | `public-submission.spec.ts` | `KontaktPage` | No (mocked) |
| A-19 | Confirmation email contract: subject contains ticket id, view URL present | integration | `email-contracts.spec.ts` | — | No (Resend mock) |
| A-20 | Body with only whitespace is rejected | integration | `ticket-create.spec.ts` (existing) | — | No |

---

### B. View-token thread access (`/contact-form/ticket/$id?token=`)

| ID | Title | Type | Spec file | POM(s) | Cleanup |
|---|---|---|---|---|---|
| B-01 | Valid token renders subject, status badge, initial body | e2e | `kontakt-view-token-thread.spec.ts` | `KontaktTicketViewPage` | No (mocked) |
| B-02 | Ticket with admin messages shows thread in chronological order | e2e | `kontakt-view-token-thread.spec.ts` | `KontaktTicketViewPage` | No (mocked) |
| B-03 | Ticket with no attachments hides attachment section | e2e | `kontakt-view-token-thread.spec.ts` | `KontaktTicketViewPage` | No (mocked) |
| B-04 | Ticket with clean attachments shows download links; pending/infected hides links | e2e | `kontakt-view-token-thread.spec.ts` | `KontaktTicketViewPage` | No (mocked) |
| B-05 | Missing token (no `?token=`) renders "Chýba bezpečnostný token" not-found card | e2e | `kontakt-view-token-thread.spec.ts` | `KontaktTicketViewPage` | No (mocked) |
| B-06 | Invalid token (RPC returns null) renders "Odkaz už nie je platný" not-found card | e2e | `kontakt-view-token-thread.spec.ts` | `KontaktTicketViewPage` | No (mocked) |
| B-07 | Token rotation: admin reply mints new token; OLD token returns not-found state | integration | `token-rotation.spec.ts` | — | Yes — `cleanupSeeds(w)` |
| B-08 | Cross-ticket token use: token for ticket A passed with ticket B's id returns null | integration | `view-token-edge-cases.spec.ts` (existing TC-22) | — | Yes |
| B-09 | IP-country guard: stub RPC to return null when `p_metadata.ip_country` mismatches; UI shows not-found | e2e | `kontakt-view-token-thread.spec.ts` | `KontaktTicketViewPage` | No (mocked) |
| B-10 | Attachment download: cross-ticket signed URL request is denied by RPC | integration | `multi-assignment-rls.spec.ts` (E10) | — | Yes |

---

### C. Admin queue (`/admin/tickets`)

| ID | Title | Type | Spec file | POM(s) | Cleanup |
|---|---|---|---|---|---|
| C-01 | Empty state renders "Žiadne žiadosti tohto typu" with clear-filters CTA | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-02 | Queue with seeded rows renders table with correct columns | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-03 | Pagination: next/prev buttons advance and retreat page; URL reflects `?page=N` | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | Yes — `seedTicketsForQueue` |
| C-04 | Status filter chip `new` filters queue to only new tickets | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-05 | Category filter `bug` filters to bug tickets only | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-06 | Multiple filter chips combined (status=new AND category=bug) narrow results | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-07 | Filter state persists in URL `?status=new&category=bug` and survives reload | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-08 | Search input filters by subject; URL reflects `?q=<query>` | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-09 | Sortable header: `subject` column cycles ASC → DESC → none on successive clicks | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-10 | `aria-sort` attribute on sortable header reflects current sort state | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-11 | Sort state persists in URL `?sort=subject:asc` and survives reload | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-12 | Legacy `?sortDropdown=subject:asc` URL redirects to `?sort=subject:asc` | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-13 | `AssigneesCell`: unassigned shows placeholder; single admin shows 1 chip | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-14 | `AssigneesCell`: 3 admins assigned shows stacked avatars; tooltip lists names on hover | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-15 | `QueueStatusPopover`: change `new → in_progress` requires no confirm dialog | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-16 | `QueueStatusPopover`: change `in_progress → resolved` shows confirm dialog | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-17 | `QueueStatusPopover`: cancelling the confirm dialog leaves status unchanged | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-18 | `QueueStatusPopover`: confirming `→ resolved` updates status badge in the queue row | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-19 | Bulk select 3 tickets → bulk resolve → all 3 rows show resolved badge | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | Yes — `seedTickets(w)` |
| C-20 | Bulk select 2 tickets → Esc → bulk selection cancelled | e2e | `admin-queue-filters-sort.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| C-21 | CSV export downloads file; content includes seeded rows with `[E2E-SEED-W{n}]` prefix | e2e | `admin-queue-csv-export.spec.ts` | `AdminTicketsQueuePage` | Yes — `seedTickets(w)` |
| C-22 | CSV export: cell with leading `=` is prefixed with `'` (formula injection neutralised) | e2e | `admin-queue-csv-export.spec.ts` | `AdminTicketsQueuePage` | Yes — `seedTickets(w)` |
| C-23 | Clicking a queue row navigates to `/admin/tickets/$id` | e2e | `admin-queue-sidebar-badge.spec.ts` | `AdminTicketsQueuePage`, `AdminTicketDetailPage` | No (mocked) |
| C-24 | Sidebar badge shows count of new+reopened tickets needing attention | e2e | `admin-queue-sidebar-badge.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |

---

### D. Admin detail (`/admin/tickets/$id`)

| ID | Title | Type | Spec file | POM(s) | Cleanup |
|---|---|---|---|---|---|
| D-01 | Detail renders subject, status badge, requester block, category chip, created_at | e2e | `admin-detail-render.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-02 | Thread shows initial body and all messages in chronological order | e2e | `admin-detail-render.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-03 | Reply form disabled (send button disabled) while textarea is empty or whitespace-only | e2e | `admin-detail-render.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-04 | Admin submits reply; message appended in thread; CF function receives correct payload | e2e | `admin-detail-render.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-05 | Admin reply triggers confirmation email contract (mocked Resend captures) | e2e | `admin-detail-render.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-06 | Admin reply mints a fresh view token (assert via service-role read of regenerate RPC call) | integration | `token-rotation.spec.ts` | — | Yes |
| D-07 | Internal note submitted; renders with internal badge; NOT included in email | e2e | `admin-detail-render.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-08 | Status `new` shows "Začať riešiť" button; "Uzavrieť" is hidden | e2e | `admin-detail-render.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-09 | "Uzavrieť" transition shows ConfirmDialog; cancelling leaves status unchanged | e2e | `admin-detail-render.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-10 | "Archivovať" transition shows ConfirmDialog severity='warning'; confirms changes badge | e2e | `admin-detail-render.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-11 | "Označiť ako spam" ConfirmDialog: confirm button disabled until ticket-id typed | e2e | `admin-detail-render.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-12 | AdminPicker opens; search filters by email; clicking admin adds chip | e2e | `admin-detail-multi-assignment.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-13 | Multiple admins assigned → multiple chips visible simultaneously | e2e | `admin-detail-multi-assignment.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-14 | Unassign via X on chip calls `unassign_admin_from_ticket`; chip removed | e2e | `admin-detail-multi-assignment.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-15 | "Prevziať" self-assigns current admin; button changes to "Odhlásiť" | e2e | `admin-detail-multi-assignment.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-16 | "Odhlásiť" removes self from assignees; button changes back to "Prevziať" | e2e | `admin-detail-multi-assignment.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-17 | Concurrent self-assign by two admins → both end up assigned (idempotent via PK) | integration | `concurrency.spec.ts` | — | Yes |
| D-18 | AdminPicker search XSS: `<script>alert(1)</script>` in search renders as text | e2e | `admin-detail-multi-assignment.spec.ts` | `AdminTicketDetailPage` | No |
| D-19 | Admin display_name with XSS payload renders escaped in chip + tooltip | e2e | `admin-detail-multi-assignment.spec.ts` | `AdminTicketDetailPage` | No |
| D-20 | Image-only ticket: thumbnails render; click opens lightbox; ←/→ navigate; Esc closes | e2e | `admin-detail-attachment-viewer.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-21 | PDF-only ticket: PDF iframe renders with `sandbox` attribute; download CTA visible | e2e | `admin-detail-attachment-viewer.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-22 | Mixed images+PDFs: only images participate in lightbox navigation; PDF excluded | e2e | `admin-detail-attachment-viewer.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-23 | Signed URL TTL: hook calls `request_attachment_signed_url(id, true)` with `p_inline=true` | e2e | `admin-detail-attachment-viewer.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| D-24 | Cross-ticket signed URL: admin requesting attachment A via ticket B context is denied | integration | `multi-assignment-rls.spec.ts` | — | Yes |
| D-25 | Every admin write creates a row in `audit_log` with correct actor_id and ticket_id | integration | `admin-detail-audit-log.spec.ts` | — | Yes |

---

### E. RLS / authorization (negative-path API)

| ID | Title | Type | Spec file | POM(s) | Cleanup |
|---|---|---|---|---|---|
| E-01 | Anon SELECT `support_tickets` → 0 rows | integration | `multi-assignment-rls.spec.ts` | — | No |
| E-02 | Anon SELECT `support_ticket_assignees` → 0 rows | integration | `multi-assignment-rls.spec.ts` | — | No |
| E-03 | Anon CALL `assign_admin_to_ticket` → permission denied | integration | `multi-assignment-rls.spec.ts` | — | No |
| E-04 | Anon CALL `list_admin_users` → permission denied | integration | `multi-assignment-rls.spec.ts` | — | No |
| E-05 | Regular user CALL `assign_admin_to_ticket` → denied | integration | `multi-assignment-rls.spec.ts` | — | No |
| E-06 | Admin at AAL1 CALL `assign_admin_to_ticket` → denied | integration | `multi-assignment-rls.spec.ts` | — | No |
| E-07 | Admin AAL2 CALL `assign_admin_to_ticket` → succeeds; audit row written | integration | `multi-assignment-rls.spec.ts` | — | Yes |
| E-08 | `support_tickets_with_assignees` view uses `security_invoker=true` — anon gets 0 rows | integration | `multi-assignment-rls.spec.ts` | — | No |
| E-09 | Direct INSERT to `support_ticket_assignees` from admin AAL2 → denied (must use RPC) | integration | `multi-assignment-rls.spec.ts` | — | No |
| E-10 | `request_attachment_signed_url(id, true)` for admin who owns ticket → succeeds | integration | `multi-assignment-rls.spec.ts` | — | Yes |
| E-11 | `regenerate_support_ticket_view_token`: anon → denied; regular user → denied; admin AAL2 → succeeds + prior token invalidated | integration | `token-rotation.spec.ts` | — | Yes |

---

### F. Security / injection

| ID | Title | Type | Spec file | POM(s) | Cleanup |
|---|---|---|---|---|---|
| F-01 | XSS in subject renders as escaped text in queue, detail, and public view | e2e | Covered by `E48-security.md` TC-36, TC-37, TC-38 | — | — |
| F-02 | XSS in body (onerror, javascript:, data:) renders as plain text | e2e | Covered by `E48-security.md` TC-39 | — | — |
| F-03 | XSS in admin display_name in chip + picker tooltip renders as escaped text | e2e | `admin-detail-multi-assignment.spec.ts` D-19 | `AdminTicketDetailPage` | No |
| F-04 | XSS in attachment filename in lightbox caption renders as escaped text | e2e | `admin-detail-attachment-viewer.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| F-05 | SQL injection probes in queue search return benign result, no 5xx | e2e | Covered by `E48-security.md` TC-33, TC-34, TC-35 | — | — |
| F-06 | CSV injection: subject `=cmd|'/c calc'!A1` in exported CSV is prefixed with `'` | e2e | `admin-queue-csv-export.spec.ts` C-22 | `AdminTicketsQueuePage` | Yes |
| F-07 | Email URL sanitization: `javascript:alert(1)` viewUrl in template renders as `#` | unit (Vitest) | `tests/functions/email-templates-support.test.ts` | — | No |
| F-08 | CSP response header on `/admin/tickets/$id` includes Supabase storage origin in `img-src` and `frame-src` | e2e | `admin-detail-attachment-viewer.spec.ts` | — | No |

---

### G. Concurrency / race conditions

| ID | Title | Type | Spec file | POM(s) | Cleanup |
|---|---|---|---|---|---|
| G-01 | Two admins reply simultaneously to same ticket → both messages persisted, ordered by created_at | integration | `concurrency.spec.ts` | — | Yes |
| G-02 | Admin A resolves while admin B is mid-typing reply → reply succeeds; state machine allows | integration | `concurrency.spec.ts` | — | Yes |
| G-03 | Admin reply mints T2; second admin reply mints T3 → only T3 valid; T1+T2 return null | integration | `token-rotation.spec.ts` | — | Yes |
| G-04 | Concurrent attachment uploads from same submitter → both persist with unique storage paths | integration | Covered by `E48-security.md` TC-40 (concurrent 3-cap) | — | — |
| G-05 | Double-submit: clicking "Odoslať odpoveď" twice within 300ms sends exactly one request | e2e | `admin-detail-render.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| G-06 | Race on bulk-resolve: two admins bulk-resolve overlapping selection → idempotent; no duplicate audit rows | integration | `concurrency.spec.ts` | — | Yes |

---

### H. Email notifications (Resend mock layer)

| ID | Title | Type | Spec file | POM(s) | Cleanup |
|---|---|---|---|---|---|
| H-01 | Anon submission → confirmation email: subject "Vašu žiadosť o podporu sme prijali — {ticketId}"; view URL with token; ticket id in body | integration | `email-contracts.spec.ts` | — | No |
| H-02 | Admin reply → submitter notification: subject "Re: vaša žiadosť o podporu — {ticketId}"; view URL with FRESH token; admin reply body present | integration | `email-contracts.spec.ts` | — | No |
| H-03 | Status transition to resolved → "Vaša žiadosť o podporu bola uzavretá — {ticketId}" email sent to submitter | integration | `email-contracts.spec.ts` | — | No |
| H-04 | Admin reply → other-admin notifier email dispatched when `notify_on_reply=true` in `admin_notification_preferences` | integration | `email-contracts.spec.ts` | — | No |
| H-05 | Honeypot-discarded submission → NO email sent to either submitter or admin | integration | Covered by `E48-security.md` TC-03 (no DB write → no email) | — | — |
| H-06 | Idempotency key on receipt email: retried submission with same ticket id does not double-send | integration | `email-contracts.spec.ts` | — | No |

---

### I. Accessibility + mobile

| ID | Title | Type | Spec file | POM(s) | Cleanup |
|---|---|---|---|---|---|
| I-01 | Keyboard-only nav through contact form: Tab reaches every field; Enter submits | e2e | `accessibility-and-mobile.spec.ts` | `KontaktPage` | No (mocked) |
| I-02 | Keyboard-only nav through detail page: Tab order correct; Enter opens AdminPicker; Esc closes lightbox | e2e | `accessibility-and-mobile.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| I-03 | `aria-sort` attribute on sortable queue headers updates on each cycle click | e2e | Covered by C-10 | — | — |
| I-04 | `role="dialog"` present on lightbox and confirm dialogs | e2e | `accessibility-and-mobile.spec.ts` | `AdminTicketDetailPage` | No (mocked) |
| I-05 | `aria-label` present on icon-only action buttons in queue row | e2e | `accessibility-and-mobile.spec.ts` | `AdminTicketsQueuePage` | No (mocked) |
| I-06 | Mobile 375×667: queue collapses to stacked layout; detail layout stacks; picker stays usable | e2e | `accessibility-and-mobile.spec.ts` | `AdminTicketsQueuePage`, `AdminTicketDetailPage` | No (mocked) |
| I-07 | RTL text in subject and body renders without horizontal overflow | e2e | `accessibility-and-mobile.spec.ts` | `AdminTicketDetailPage` | No (mocked) |

---

### J. Performance smoke

| ID | Title | Type | Spec file | POM(s) | Cleanup |
|---|---|---|---|---|---|
| J-01 | Queue with 50 seeded tickets renders (root element visible) in under 2000ms | e2e | `performance-smoke.spec.ts` | `AdminTicketsQueuePage` | Yes — `seedTickets(w)` |
| J-02 | Detail with 20 messages + 10 attachment rows renders in under 3000ms | e2e | `performance-smoke.spec.ts` | `AdminTicketDetailPage` | Yes — `seedTicketWithMessages + seedTicketWithAttachments` |
| J-03 | Image attachment thumbnails have `loading="lazy"` attribute | e2e | `performance-smoke.spec.ts` | `AdminTicketDetailPage` | No (mocked) |

---

## Happy paths

### TC-01: Anonymous submitter completes the contact form and sees ticket id in success state

**AC reference:** AC-2, AC-3, AC-4 (E48.3)

**Prerequisites**:
- `/contact-form` is reachable at the local dev server.
- `mockSupportApi` is wired on the context with `ticketCreateResponse: { ticket_id: "11111111-1111-4111-8111-111111111111", view_token: "a".repeat(64) }`.
- `mockSupabase` stubs `get_ticket_thread_for_view_token` to return a minimal ticket object when called with the correct token.
- Consent is primed via `primeConsent(context, "all")`.
- No Authorization cookie is present (anonymous browser context).
- Playwright project: `e2e-chromium`.

**When** the user opens `/contact-form`
**and** fills in subject "Testovacia žiadosť", category "question", body "Toto je testovací text so správnym počtom znakov.", email "anon@test.example", and name "Anon User"
**and** clicks the submit button labelled "Odoslať"
**Then** the success state element (`data-testid="kontakt-success-state"`) is visible
**and** the element `data-testid="kontakt-success-ticket-id"` displays the text "11111111-1111-4111-8111-111111111111"
**and** the captured `ticketCreateRequests` array from `mockSupportApi` has exactly one entry with `sent._h_addr === ""`

### TC-02: Admin queue lists seeded tickets and navigation to detail works

**AC reference:** AC-2, AC-6 (E48.6); AC-1 (E48.7)

**Prerequisites**:
- `setupAppShell(context, page, { session: ADMIN_SESSION })` called in `beforeEach`.
- `mockSupabase` configured with `tables.support_tickets = [buildTicketRow()]` containing ticket id `"11111111-1111-4111-8111-111111111111"` and subject `"Smoke test E48"`.
- Playwright project: `e2e-chromium`.

**When** the admin opens `/admin/tickets`
**and** the table is visible
**and** the admin clicks the row link for ticket `"11111111-1111-4111-8111-111111111111"`
**Then** the browser navigates to `/admin/tickets/11111111-1111-4111-8111-111111111111`
**and** `admin-ticket-detail-root` is visible
**and** `admin-ticket-detail-subject` displays "Smoke test E48"

### TC-03: Admin submits a reply; CF function receives correct payload; thread appends message

**AC reference:** AC-4, AC-5 (E48.8); AC-5 (E48.7)

**Prerequisites**:
- `setupAppShell` called with `ADMIN_SESSION` and `tables.support_tickets = [buildTicketRow()]`.
- `mockSupportApi` configured with `ticketReplyResponse: { message_id: "msg-001" }` on the context.
- The detail page is open for ticket `"11111111-1111-4111-8111-111111111111"`.
- Playwright project: `e2e-chromium`.

**When** the admin fills the reply textarea with "Dobrý deň, prosím o ďalšie detaily."
**and** clicks "Odoslať odpoveď"
**Then** `captures.ticketReplyRequests` has exactly one entry
**and** `captures.ticketReplyRequests[0].body.ticket_id` equals `"11111111-1111-4111-8111-111111111111"`
**and** the Authorization header begins with `"Bearer "`
**and** the reply textarea is cleared after successful send

### TC-04: Anonymous view-token page renders thread correctly with all fields

**AC reference:** AC-5 (E48.3)

**Prerequisites**:
- Consent primed via `primeConsent(context, "all")`.
- `mockSupabase` stubs `get_ticket_thread_for_view_token` to return a ticket with `status: "new"`, `subject: "Smoke test E48"`, one message row with `author_kind: "admin"`, and one clean attachment.
- Token value is `"a".repeat(64)`.
- Playwright project: `e2e-chromium`.

**When** the browser navigates to `/contact-form/ticket/11111111-1111-4111-8111-111111111111?token=aaaa...` (64 `a` chars)
**Then** `kontakt-ticket-view-root` is visible
**and** `kontakt-ticket-view-subject` displays "Smoke test E48"
**and** `kontakt-ticket-view-status` contains "Nové"
**and** the thread section contains the admin message body
**and** the attachments section is visible with a download link for the clean file

---

## Negative scenarios

### TC-05: Subject shorter than minimum fails client-side validation

**AC reference:** AC-2 (E48.3)

**Prerequisites**:
- `/contact-form` open with `mockSupportApi` wired (submit must not reach server if validation blocks).
- Playwright project: `e2e-chromium`.

**When** the user types "Hi" (2 chars, below the 5-char minimum) into the subject input
**and** clicks submit
**Then** `kontakt-form-error-subject` is visible
**and** the element `kontakt-form-submit-error` is not visible (error is field-level, not server-level)
**and** `captures.ticketCreateRequests` is empty (no POST fired)

### TC-06: Body at 5001 characters is rejected by the API with `body_invalid`

**AC reference:** AC-2 (E48.3)

**Prerequisites**:
- `POST /api/support-ticket-create` is reachable at `http://localhost:8788`.
- Playwright project: `integration`.

**When** `POST /api/support-ticket-create` is sent with `body: "a".repeat(5001)` and otherwise valid fields
**Then** the HTTP response status is 400
**and** the response body contains `{ "error": "body_invalid" }`

### TC-07: Malformed email is rejected client-side before submit

**AC reference:** AC-2 (E48.3)

**Prerequisites**:
- `/contact-form` open; no consent mock required for this TC (form validation fires before network).
- Playwright project: `e2e-chromium`.

**When** the user fills a valid subject, category, and body
**and** types "not-an-email" into the email input
**and** clicks submit
**Then** `kontakt-form-error-email` is visible
**and** no POST to `/api/support-ticket-create` fires

### TC-08: Server 429 rate_limited_ip maps to user-visible Slovak error message

**AC reference:** AC-3 (E48.3)

**Prerequisites**:
- `/contact-form` open.
- `mockSupportApi` configured with `ticketCreateError: { status: 429, error: "rate_limited_ip" }`.
- Playwright project: `e2e-chromium`.

**When** the user fills in all required fields correctly
**and** clicks submit
**Then** `kontakt-form-submit-error` is visible
**and** the error text matches the pattern `/príliš veľa žiadostí/i` (TBD — agent must read `src/components/support/SupportContactForm.tsx` for the exact Slovak string before writing the spec)

### TC-09: Missing token URL shows not-found card with "Chýba bezpečnostný token"

**AC reference:** AC-5 (E48.3)

**Prerequisites**:
- Consent primed.
- `mockSupabase` stubs `get_ticket_thread_for_view_token` (should not be called for this path).
- Playwright project: `e2e-chromium`.

**When** the browser navigates to `/contact-form/ticket/11111111-1111-4111-8111-111111111111` with no `?token=` parameter
**Then** `kontakt-ticket-view-not-found` is visible
**and** the element contains the text "Chýba bezpečnostný token"

### TC-10: Invalid token returns not-found card with "Odkaz už nie je platný"

**AC reference:** AC-5 (E48.3)

**Prerequisites**:
- Consent primed.
- `mockSupabase` stubs `get_ticket_thread_for_view_token` to return `null` when called with token `"b".repeat(64)`.
- Playwright project: `e2e-chromium`.

**When** the browser navigates to `/contact-form/ticket/11111111-1111-4111-8111-111111111111?token=bbbb...` (64 `b` chars)
**Then** `kontakt-ticket-view-not-found` is visible
**and** the element contains the text "Odkaz už nie je platný"

### TC-11: Admin reply with empty body is blocked; send button stays disabled

**AC reference:** AC-3 (E48.8)

**Prerequisites**:
- `setupAppShell` called with `ADMIN_SESSION`; ticket detail page open.
- Playwright project: `e2e-chromium`.

**When** the reply textarea is empty (or contains only whitespace)
**Then** `admin-ticket-detail-reply-send` is disabled
**and** clicking it does not fire any POST to `/api/support-ticket-reply`

### TC-12: Admin reply body exceeding 10000 characters is rejected by the API with `body_invalid`

**AC reference:** AC-3 (E48.8)

**Prerequisites**:
- `POST /api/support-ticket-reply` is reachable at `http://localhost:8788`.
- A structurally-valid (unsigned) JWT is available to satisfy the auth parse step.
- Playwright project: `integration`.

**When** `POST /api/support-ticket-reply` is sent with a bearer token and `body: "x".repeat(10_001)`
**Then** the HTTP response status is 400
**and** the response body contains `{ "error": "body_invalid" }`

### TC-13: `QueueStatusPopover` change to `resolved` without confirming dialog leaves status unchanged

**AC reference:** AC-5 (E48.6 via inline popover)

**Prerequisites**:
- `setupAppShell` with `ADMIN_SESSION`; queue has one ticket in status `in_progress`.
- Playwright project: `e2e-chromium`.

**When** the admin opens the `QueueStatusPopover` for the in_progress ticket
**and** clicks "Uzavrieť" (resolved)
**and** the confirm dialog appears
**and** the admin clicks "Zrušiť" (cancel)
**Then** the confirm dialog closes
**and** the ticket row still shows the `in_progress` status badge
**and** no call to `transition_ticket_status` is captured

### TC-14: "Označiť ako spam" confirm button stays disabled until the ticket id is typed

**AC reference:** AC-4 (E48.7)

**Prerequisites**:
- `setupAppShell` with `ADMIN_SESSION`; ticket detail page open for ticket id `11111111-1111-4111-8111-111111111111`.
- Playwright project: `e2e-chromium`.

**When** the admin opens the "Označiť ako spam" ConfirmDialog (via kebab menu → "Označiť ako spam")
**and** the typed-confirm input is empty
**Then** the confirm button is disabled
**and** after typing the ticket id (full UUID) the confirm button becomes enabled

**Note:** The plan originally specified "Vymazať natvrdo" with subject-prefix confirm. The shipped UI implements safer soft-mark semantics ("Označiť ako spam") with ticket-id confirmation. This TC is updated to assert the shipped behavior.

---

## Edge cases

### TC-15: Subject at exactly 200-char boundary is accepted by the API

**AC reference:** AC-2 (E48.3)

**Prerequisites**:
- `POST /api/support-ticket-create` reachable.
- Playwright project: `integration`.

**When** `POST /api/support-ticket-create` is sent with `subject: "a".repeat(200)` and otherwise valid fields
**Then** the response status is 200
**and** the body contains `{ ok: true, ticket_id: /^[0-9a-f-]{36}$/ }`

### TC-16: Subject at 201 chars is rejected with `subject_invalid`

**AC reference:** AC-2 (E48.3)

**Prerequisites**:
- `POST /api/support-ticket-create` reachable.
- Playwright project: `integration`.

**When** `POST /api/support-ticket-create` is sent with `subject: "a".repeat(201)` and otherwise valid fields
**Then** the response status is 400
**and** the response body contains `{ "error": "subject_invalid" }`

### TC-17: Body with only whitespace is rejected with `body_invalid`

**AC reference:** AC-2 (E48.3)

**Prerequisites**:
- `POST /api/support-ticket-create` reachable.
- Playwright project: `integration`.

**When** `POST /api/support-ticket-create` is sent with `body: "   "` (three spaces)
**Then** the response status is 400
**and** the response body contains `{ "error": "body_invalid" }`

### TC-18: Slovak diacritics in subject and body survive round-trip through DB and render correctly

**AC reference:** AC-2, AC-5 (E48.3)

**Prerequisites**:
- Consent primed.
- `mockSupportApi` returns a fixed ticket_id; `mockSupabase` stub returns the subject verbatim for `get_ticket_thread_for_view_token`.
- Playwright project: `e2e-chromium`.

**When** the user submits a ticket with subject "Žiadosť: ščťžýáíéúô" and body "Toto je text s diakritikou: ščťžýáíéúô, aspoň dvadsať znakov."
**and** then navigates to the view-token thread page with the returned token
**Then** the subject displayed in `kontakt-ticket-view-subject` is exactly "Žiadosť: ščťžýáíéúô"
**and** the thread body contains "ščťžýáíéúô" without any corrupted characters

### TC-19: Sortable header `subject` ASC → DESC → none cycles `aria-sort` correctly

**AC reference:** AC-2 (E48.6 — SortableHeader, E48-v3)

**Prerequisites**:
- `setupAppShell` with `ADMIN_SESSION`; queue open with mocked tickets.
- Playwright project: `e2e-chromium`.

**When** the admin clicks the subject column header once
**Then** `aria-sort` on that header is `"ascending"` and URL contains `?sort=subject:asc`
**and** after a second click `aria-sort` is `"descending"` and URL contains `?sort=subject:desc`
**and** after a third click `aria-sort` is `"none"` and `?sort=` parameter is absent from the URL

### TC-20: Legacy `?sortDropdown=subject:asc` URL is redirected to `?sort=subject:asc`

**AC reference:** Backward compat — E48-v3 SortableHeader migration

**Prerequisites**:
- `setupAppShell` with `ADMIN_SESSION`.
- Playwright project: `e2e-chromium`.

**When** the browser navigates to `/admin/tickets?sortDropdown=subject:asc`
**Then** the browser URL changes to `/admin/tickets?sort=subject:asc` (or `sort=subject:asc` appended to existing params)
**and** the queue table renders normally without a blank page or console error

### TC-21: CSV export encodes formula-injection cell with leading `'`

**AC reference:** E48-v3 CSV injection-safe encoding

**Prerequisites**:
- Service-role client seeds one ticket with `subject: "=cmd|'/c calc'!A1 [E2E-SEED-W{workerIndex}]"` via `seedTickets(workerIndex)`.
- `setupAppShell` with `ADMIN_SESSION`; queue open.
- Playwright project: `e2e-chromium`.

**When** the admin clicks the CSV export button
**and** the downloaded CSV file is read
**Then** the cell for the seeded ticket's subject begins with `'=cmd` (the `'` prefix neutralises the formula)
**and** no other formula-injectable cells (`+`, `-`, `@`, `\t`, `\r`, `\n` prefixed) appear without the `'` guard

### TC-22: Admin reply mints a fresh view token; old token no longer valid

**AC reference:** Email view-token regeneration — E48-v3

**Prerequisites**:
- A ticket is seeded via `seedTickets(workerIndex)`; the original view_token is stored.
- Admin JWT with AAL2 available (`SUPPORT_ADMIN_JWT` env var).
- Live DB required (`SUPPORT_LIVE_DB=1`).
- Playwright project: `integration`.

**When** `POST /api/support-ticket-reply` is sent with a valid admin JWT, the seeded ticket_id, and a non-empty body
**Then** the response is 200 with `{ ok: true, message_id: /uuid/ }`
**and** calling `get_ticket_thread_for_view_token(ticket_id, <old_token>)` returns `null`
**and** the new token (from `SELECT view_token_hash FROM support_tickets WHERE id = ...`) produces a valid thread when used with the correct plaintext

### TC-23: Double-click on "Odoslať odpoveď" sends exactly one request

**AC reference:** Idempotency / debounce on reply submit

**Prerequisites**:
- `setupAppShell` with `ADMIN_SESSION`; ticket detail page open.
- `mockSupportApi` wired with `ticketReplyResponse`.
- Playwright project: `e2e-chromium`.

**When** the admin fills the reply textarea with a valid body
**and** double-clicks the send button within 300ms
**Then** `captures.ticketReplyRequests` has exactly one entry (button is disabled after first click while in-flight)
**and** no duplicate message appears in the thread

### TC-24: Concurrent self-assign by two admin sessions → both end up assigned

**AC reference:** D5e — multi-assignment idempotent PK; E48-v3

**Prerequisites**:
- A ticket exists (seeded via service-role with `seedTickets`).
- Two admin JWT tokens available (`SUPPORT_ADMIN_JWT` and `SUPPORT_ADMIN_JWT_B`).
- Live DB required.
- Playwright project: `integration`.

**When** two `assign_admin_to_ticket(ticket_id, admin_a_id)` and `assign_admin_to_ticket(ticket_id, admin_b_id)` RPC calls are made concurrently via `Promise.all`
**Then** both calls return success
**and** a `SELECT * FROM support_ticket_assignees WHERE ticket_id = ...` via service role returns exactly 2 rows
**and** no unique-constraint violation error is raised

### TC-25: AdminPicker search with XSS payload renders as escaped text

**AC reference:** F3 — XSS in admin display_name

**Prerequisites**:
- `setupAppShell` with `ADMIN_SESSION`.
- `mockSupabase` stubs `list_admin_users` to return one admin with `display_name: "<script>alert(1)</script>"`.
- Ticket detail page open; AdminPicker opened.
- Playwright project: `e2e-chromium`.

**When** the admin opens the AdminPicker and types `<script>` in the search input
**and** the result list renders the matching admin
**Then** no `alert` dialog fires
**and** the rendered text in the picker option contains the literal string `<script>alert(1)</script>` (escaped, not executed)
**and** no `Uncaught` entries appear in the console error log

### TC-26: `request_attachment_signed_url` with `p_inline=true` is called for image lightbox

**AC reference:** D6 — inline attachment viewer; `useAttachmentSignedUrl(id, { inline: true })`; E48-v3

**Prerequisites**:
- `setupAppShell` with `ADMIN_SESSION`.
- `mockSupabase` stubs the RPC `request_attachment_signed_url` and records call arguments; ticket has one clean PNG attachment.
- Playwright project: `e2e-chromium`.

**When** the admin opens the detail page and clicks an image thumbnail
**Then** the lightbox dialog (`role="dialog"`) is visible
**and** the RPC stub was called with `p_attachment_id = <attachment_uuid>` and `p_inline = true`

### TC-27: PDF attachment renders in a sandboxed iframe; `sandbox` attribute is present

**AC reference:** D6b — PDF inline viewer; E48-v3

**Prerequisites**:
- `setupAppShell` with `ADMIN_SESSION`.
- Ticket has one clean PDF attachment; `mockSupabase` stubs `request_attachment_signed_url` to return a fake URL.
- Playwright project: `e2e-chromium`.

**When** the admin opens the detail page with the PDF attachment
**Then** an `<iframe>` element with `data-testid="admin-ticket-attachment-viewer-pdf-<id>"` (TBD — agent must read the viewer component) is visible
**and** the iframe has a `sandbox` attribute that includes at least `allow-same-origin` but does NOT include `allow-scripts` or `allow-top-navigation`

### TC-28: Lightbox navigation with ←/→ keys cycles through images; Esc closes

**AC reference:** D6a — lightbox keyboard nav; E48-v3

**Prerequisites**:
- `setupAppShell` with `ADMIN_SESSION`.
- Ticket has 3 clean PNG attachments; `mockSupabase` stubs signed-URL RPC.
- Playwright project: `e2e-chromium`.

**When** the admin opens the lightbox by clicking the first thumbnail
**and** presses `ArrowRight`
**Then** the lightbox caption or slide counter reflects the second attachment
**and** after pressing `ArrowLeft` the first attachment is shown again
**and** after pressing `Escape` the lightbox dialog is no longer visible

### TC-29: `support_ticket_assignees` RLS — anon SELECT returns 0 rows

**AC reference:** E2 — new v3 table RLS

**Prerequisites**:
- Migration applied; at least one row exists in `support_ticket_assignees` (seeded via service-role).
- Supabase project URL and anon key available.
- Live DB required.
- Playwright project: `integration`.

**When** `GET <SUPABASE_URL>/rest/v1/support_ticket_assignees?select=ticket_id` is sent with `apikey: <anon_key>` and no Authorization header
**Then** the HTTP status is 200 and the response body is `[]`
**or** the HTTP status is 401 or 403 (both satisfy the information-disclosure boundary)

### TC-30: `list_admin_users` RPC returns `permission_denied` for an anonymous caller

**AC reference:** E4 — RLS on `list_admin_users`

**Prerequisites**:
- Supabase project URL and anon key available.
- Live DB required.
- Playwright project: `integration`.

**When** `POST <SUPABASE_URL>/rest/v1/rpc/list_admin_users` is sent with `apikey: <anon_key>` only (no Authorization header)
**Then** the HTTP status is 401, 403, or 200 with a PostgreSQL `permission_denied` exception body
**and** no admin user records are returned

### TC-31: Admin at AAL1 calling `assign_admin_to_ticket` is denied with `aal2_required`

**AC reference:** E6 — AAL2 enforcement on v3 RPC

**Prerequisites**:
- A ticket exists (seeded); an admin JWT with `aal=aal1` available.
- Live DB required.
- Playwright project: `integration`.

**When** `POST <SUPABASE_URL>/rest/v1/rpc/assign_admin_to_ticket` is sent with the AAL1 admin JWT
**Then** the HTTP status is 403 or the RPC returns an exception containing `aal2_required` or `insufficient_aal`
**and** no row is inserted into `support_ticket_assignees`

### TC-32: `support_tickets_with_assignees` view respects RLS — anon gets 0 rows

**AC reference:** E8 — `security_invoker = true` on view

**Prerequisites**:
- The view exists and has `security_invoker = true` per migration.
- At least one row exists in `support_tickets` (seeded).
- Playwright project: `integration`.

**When** `GET <SUPABASE_URL>/rest/v1/support_tickets_with_assignees?select=id` is sent with only the anon key
**Then** the response body is `[]` (RLS from the underlying `support_tickets` table is applied through the view)

### TC-33: Notification preference master toggle off disables all sub-controls; dirty bar appears

**AC reference:** AC-2 (E48.9)

**Prerequisites**:
- `setupAppShell` with `ADMIN_SESSION`; `admin_notification_preferences` row seeded with `enabled: true`.
- Playwright project: `e2e-chromium`.

**When** the admin opens `/admin/settings/notifications`
**and** clicks the master toggle labelled "Dostávať upozornenia z podpory"
**Then** the email channel checkbox (`admin-notif-channel-email`) is disabled
**and** the in-app channel checkbox (`admin-notif-channel-inapp`) is disabled
**and** all per-category toggles are disabled
**and** all cadence radio buttons are disabled
**and** the dirty bar is visible with the save button labelled "Uložiť zmeny"

### TC-34: Saving notification preferences dispatches UPSERT and shows toast

**AC reference:** AC-2 (E48.9)

**Prerequisites**:
- `setupAppShell` with `ADMIN_SESSION`; preferences row seeded.
- `mockSupabase` stubs `UPSERT admin_notification_preferences` and records the call.
- Playwright project: `e2e-chromium`.

**When** the admin changes one category toggle and clicks "Uložiť zmeny"
**Then** the Supabase mock captures an UPSERT request to `admin_notification_preferences`
**and** the toast containing "Nastavenia upozornení boli uložené." appears
**and** the dirty bar hides after the save completes

### TC-35: Notification preferences page creates a default row if none exists (lazy creation)

**AC reference:** AC-7 (E48.9)

**Prerequisites**:
- `setupAppShell` with `ADMIN_SESSION`; `admin_notification_preferences` table is empty for this user.
- `mockSupabase` stubs the insert path.
- Playwright project: `e2e-chromium`.

**When** the admin opens `/admin/settings/notifications` for the first time
**Then** the page renders with all default values (enabled=true, email=true, in_app=true, all categories=true, cadence=instant)
**and** a mock INSERT into `admin_notification_preferences` was performed with those defaults
**and** the dirty bar is NOT visible (defaults are already saved)

### TC-36: Network failure during reply submit shows in-app error; message is NOT appended to thread

**AC reference:** AC-6 (E48.8) — network-error path

**Prerequisites**:
- `setupAppShell` with `ADMIN_SESSION`; ticket detail page open.
- `mockSupportApi` configured with `ticketReplyError: { status: 500, error: "internal" }`.
- Playwright project: `e2e-chromium`.

**When** the admin fills the reply textarea and clicks "Odoslať odpoveď"
**Then** an error indication is visible in the UI (TBD — agent must read the reply composer component for the exact error element testid)
**and** the thread does NOT optimistically add the reply message (or if it does, the message is rolled back on the 500)
**and** the reply textarea still contains the typed text (not cleared on error)

### TC-37: Back/forward navigation after submitting the contact form does not re-submit

**AC reference:** Idempotency / state desync

**Prerequisites**:
- `/contact-form` open; `mockSupportApi` wired.
- Playwright project: `e2e-chromium`.

**When** the user submits the form (success state appears)
**and** clicks the browser back button
**and** then forward button
**Then** `captures.ticketCreateRequests` still has exactly one entry (no second POST triggered)
**and** the success state is visible (or the form is re-shown in its initial state — either is acceptable, neither re-fires the POST)

### TC-38: Viewing the ticket thread on mobile (375×667) does not cause horizontal overflow

**AC reference:** I3 — mobile viewport

**Prerequisites**:
- Playwright viewport set to `375 x 667` via `page.setViewportSize({ width: 375, height: 667 })` before navigation.
- Consent primed; `mockSupabase` stubs `get_ticket_thread_for_view_token`.
- Playwright project: `e2e-chromium`.

**When** the browser opens the ticket view page
**Then** `kontakt-ticket-view-root` is visible without horizontal scrollbar
**and** `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth` (no overflow)

### TC-39: Admin queue CSV export does not expose unauthenticated rows (auth gate test)

**AC reference:** Auth / RLS on CSV

**Prerequisites**:
- `setupAppShell` with `ADMIN_AAL1_SESSION` (AAL1 only, no TOTP completed).
- Playwright project: `e2e-chromium`.

**When** the browser navigates to `/admin/tickets`
**Then** the page redirects to the AAL2 challenge (same assertion as TC-17 in `E48-security.md`)
**and** the CSV export button is never rendered (cannot export without AAL2)

### TC-40: Supabase `storage/v1` URL with only anon key cannot access private bucket objects

**AC reference:** E48-security.md TC-45 (cross-reference, distinct assertion scope)

**Prerequisites**:
- A real attachment `storage_path` is known (seeded for this test).
- Live DB required.
- Playwright project: `integration`.

**When** `GET <SUPABASE_URL>/storage/v1/object/support-attachments/<path>` is sent with only the anon key header
**Then** the HTTP status is 400, 401, 403, or 404
**and** the file contents are not present in the response body

### TC-41: Confirmation email receipt has correct subject line with ticket id verbatim

**AC reference:** AC-1 (E48.5)

**Prerequisites**:
- `supportTicketReceivedEmail` function imported from `functions/_lib/email-templates.ts`.
- This is a Vitest unit test in `tests/functions/email-templates-support.test.ts`.
- Playwright project: `unit`.

**When** `supportTicketReceivedEmail({ ticketId: "abc-123", viewToken: "x".repeat(64), viewUrl: "https://subenai.sk/contact-form/ticket/...", subject: "Moja žiadosť", category: "bug" })` is called
**Then** the returned `subject` string is exactly `"Vašu žiadosť o podporu sme prijali — abc-123"`
**and** the returned `html` string contains "abc-123"
**and** the returned `html` string contains the `viewUrl` value

### TC-42: Admin reply email subject contains ticket id

**AC reference:** AC-2 (E48.5)

**Prerequisites**:
- Same Vitest unit test context as TC-41.

**When** `supportTicketReplyEmail({ ticketId: "abc-123", replyBody: "Odpoveď", adminName: "Admin", viewUrl: "https://..." })` is called
**Then** the returned `subject` string is exactly `"Re: vaša žiadosť o podporu — abc-123"`
**and** the returned `html` string contains "Odpoveď" with line-break preservation (not stripped)

### TC-43: Resolved notification email subject contains ticket id

**AC reference:** AC-3 (E48.5)

**Prerequisites**:
- Same Vitest unit test context.

**When** `supportTicketResolvedEmail({ ticketId: "abc-123", viewUrl: "https://..." })` is called
**Then** the returned `subject` string is exactly `"Vaša žiadosť o podporu bola uzavretá — abc-123"`
**and** the returned `html` does not contain `<script>`

### TC-44: Audit log records every admin write action with correct actor_id and ticket_id

**AC reference:** AC-8 (E48.7); AC-4 d (E48.8)

**Prerequisites**:
- A ticket seeded via `seedTickets(workerIndex)`.
- Admin JWT with AAL2 (`SUPPORT_ADMIN_JWT`).
- Live DB required.
- Playwright project: `integration`.

**When** the admin sends a reply via `POST /api/support-ticket-reply`
**and** then calls `assign_admin_to_ticket(ticket_id, admin_id)` via RPC
**and** then calls `transition_ticket_status(ticket_id, 'in_progress', null)` via RPC
**Then** a `SELECT * FROM audit_log WHERE metadata->>'ticket_id' = '<ticket_id>'` via service role returns at least 3 rows
**and** each row has `actor_id = <admin_user_id>` for the performing admin
**and** the rows include `action = 'support_admin_reply_sent'` and an assignment-related action

### TC-45: Admin queue renders within 2000ms with 50 seeded tickets

**AC reference:** AC-9 (E48.6) — performance smoke

**Prerequisites**:
- `seedTicketsForQueue(workerIndex, 50, "new")` inserts 50 rows; IDs stored for cleanup.
- `setupAppShell` with `ADMIN_SESSION`; `mockSupabase` returns the 50 seeded rows.
- Playwright project: `e2e-chromium`.

**When** `performance.now()` is recorded before navigation and again when `admin-tickets-queue` root element is visible
**Then** the elapsed time is less than 2000ms

### TC-46: Detail page with 20 messages and 10 attachments renders within 3000ms

**AC reference:** J2 — performance smoke

**Prerequisites**:
- `seedTicketWithMessages(workerIndex, 20)` and `seedTicketWithAttachments(workerIndex, 10 clean stubs)` prepare data; `mockSupabase` returns those rows.
- `setupAppShell` with `ADMIN_SESSION`.
- Playwright project: `e2e-chromium`.

**When** `performance.now()` is recorded before navigation and again when `admin-ticket-detail-thread` is visible
**Then** the elapsed time is less than 3000ms

### TC-47: Image thumbnails in the inline attachment viewer have `loading="lazy"`

**AC reference:** J3 — lazy-load

**Prerequisites**:
- `setupAppShell` with `ADMIN_SESSION`; ticket mocked with 3 clean image attachments.
- Playwright project: `e2e-chromium`.

**When** the admin opens the detail page
**Then** every `<img>` element inside `admin-ticket-detail-attachments` has the attribute `loading="lazy"`

---

## Senior-level discipline checks

- **Every spec creates only what it needs and cleans it up.** Specs using `mockSupabase` / `mockSupportApi` create no real DB rows. Specs using `seedTickets` / `seedTicketWithMessages` / `seedTicketWithAttachments` register rows under the worker-index prefix and rely on `cleanupAllSeeds()` in `e2e/global-teardown.ts`. New helpers (`cleanupAuditRows`, `cleanupAttachmentObjects`) are added to `tests/fixtures/seed-tickets.ts` in the same PR that ships the audit log and attachment tests.
- **POM-only locators.** Specs MUST NOT call `page.locator(...)`, `page.getByTestId(...)`, `page.getByRole(...)`, or similar directly. All element access goes through POM getters. New getters for multi-assignment, lightbox, and audit log are listed in the "Files to create" section above.
- **Test-ids on every asserted element.** Before the generator writes any spec, it must verify that every element the spec asserts on has a `data-testid` in the source file. The following test-ids are either confirmed to exist (from reading the POMs) or are required to be added to source files before spec generation:
  - Confirmed existing: all getters in `AdminTicketsQueuePage.ts`, `AdminTicketDetailPage.ts`, `KontaktPage.ts`, `KontaktTicketViewPage.ts`
  - Required additions to source (agent must add in the same PR): `admin-tickets-sort-header-{col}`, `admin-tickets-assignees-cell-{ticketId}`, `admin-tickets-queue-status-popover-{ticketId}`, `admin-tickets-bulk-select-{ticketId}`, `admin-tickets-bulk-actions-bar`, `admin-tickets-csv-export`, `admin-tickets-page-next`, `admin-tickets-page-prev`, `admin-sidebar-support-badge`, `admin-ticket-assignees-block`, `admin-ticket-admin-picker-button`, `admin-ticket-admin-picker-search`, `admin-ticket-admin-picker-option-{userId}`, `admin-ticket-assigned-chip-{userId}`, `admin-ticket-unassign-chip-{userId}`, `admin-ticket-self-assign-button`, `admin-ticket-self-unassign-button`, `admin-ticket-attachment-lightbox`, `admin-ticket-attachment-lightbox-prev`, `admin-ticket-attachment-lightbox-next`, `admin-ticket-attachment-lightbox-close`, `admin-ticket-attachment-lightbox-caption`, `admin-ticket-attachment-pdf-iframe-{attachmentId}`, `admin-ticket-internal-note-checkbox`, `admin-ticket-internal-note-badge-{messageId}`, `admin-ticket-delete-button`, `admin-ticket-delete-cancel-banner`, `admin-ticket-audit-log-section`, `admin-ticket-audit-log-entry-{action}`, `kontakt-view-ticket-link`, `kontakt-copy-ticket-id-button`, `kontakt-form-dropzone`, `kontakt-form-attachment-item-{n}`
- **No flaky waits.** All waits use `waitFor({ state: "visible" })` on a specific locator or `expect.poll()` for captured requests. No `page.waitForTimeout()` calls. Performance assertions use `performance.now()` deltas, not arbitrary timeouts.
- **Slovak strings asserted verbatim.** Every Slovak UI string in a TC is in quotation marks and sourced from the component file or story AC. Strings marked `TBD` must be resolved by reading the component source before the spec is written.
  - Known verbatim Slovak strings cited in this plan: `"Žiadne žiadosti tohto typu"`, `"Vyčistiť filtre"`, `"Chýba bezpečnostný token"`, `"Odkaz už nie je platný"`, `"Nové"`, `"Začať riešiť"`, `"Čakám na používateľa"`, `"Uzavrieť"`, `"Znovu otvoriť"`, `"Archivovať"`, `"Označiť ako spam"`, `"Odoslať odpoveď"`, `"Uložiť poznámku"`, `"Interná poznámka (nepošle sa zákazníkovi)"`, `"Interná poznámka"`, `"Téma musí mať aspoň 5 znakov."`, `"Správa musí mať aspoň 20 znakov."`, `"Prevziať"`, `"Odhlásiť"`, `"Dostávať upozornenia z podpory"`, `"Uložiť zmeny"`, `"Nastavenia upozornení boli uložené."`, `"Vašu žiadosť o podporu sme prijali — {ticketId}"`, `"Re: vaša žiadosť o podporu — {ticketId}"`, `"Vaša žiadosť o podporu bola uzavretá — {ticketId}"`, `"Zadajte prvých 30 znakov témy"`
  - TBD — agent must read the following source files for additional strings: `src/components/support/SupportContactForm.tsx` (rate-limit error message), reply composer error message, attachment error messages; the exact "Odoslať" button label; the exact "Zrušiť" cancel label in ConfirmDialog.
- **Real test users where the flow truly requires DB state.** Integration tests using live DB (`SUPPORT_LIVE_DB=1`) rely on `audit-bot@subenai.test` or service-role-generated JWTs. E2e browser tests use `ADMIN_SESSION` / `ADMIN_AAL1_SESSION` mocked via `primeAuthSession`.
- **Parallelism-safe.** Worker index embedded in every seed prefix. No spec shares mutable data with another spec's worker.

---

## Out of scope

- Real Resend email delivery to a live inbox (Resend is mocked in all tests; a separate staging smoke covers real delivery per E48.10 DoD).
- Real Cloudflare Turnstile validation (widget mocked at network layer).
- Real VirusTotal / ClamAV / EICAR scan (deterministic-only pipeline; no AV test codes).
- Inbound email parsing and the `ticket+{id}@subenai.sk` reply-to path (explicitly out of E48 scope per PLAN §Out).
- Image re-encoding / EXIF metadata stripping (deferred to v2 per PLAN runbook §2b).
- JBIG2Decode / JPXDecode PDF filter rejection (not implemented in sanitise.ts v1; tracked as open question in `E48-security.md`).
- Canned-reply templates dropdown in the composer (placeholder UI only per E48.7 AC-5; no functional test possible).
- Quiet-hours email suppression in notification dispatcher (out of E48.9 scope per Open questions).
- Web push / browser notification channel (out of scope per E48.9 AC discussion).
- Slack / Discord webhook integrations (not in this epic).
- Multi-tenancy / SLA escalation (not in this epic).
- `/app/help/contact` authenticated form (E48.4 — separate spec file `e2e/specs/app/help.spec.ts`).
- WCAG 2.1 AA full audit (requires `axe-core` integration and a separate design review gate; this plan covers structural aria attributes only).
- The `abuse_report` category Slovak label (pending copy-team confirmation per E48.3 open question; include in spec once confirmed).
- Performance benchmarking beyond the two explicit smoke thresholds (J1/J2); Lighthouse scores are a separate CI gate.
- Production-Supabase writes from the feature branch (schema migrations apply to prod only after PR merge and manual `supabase db push` per `CLAUDE.md` DB migration rules).
- All scenarios already covered by `specs/support/E48-security.md` (TC-01 through TC-48) — those are explicitly not duplicated here.

---

## Resolved discrepancies (shipped 2026-05-22)

The following plan/UI mismatches surfaced while implementing Wave 4 specs have been reconciled:

- **Subject minimum** — plan said 5 chars; live schema was `min(1)`. **Resolved in PR #177**: client `supportContactSchema` + server `support-ticket-create.ts` both now enforce `subject ≥ 5` and `body ≥ 20`. Slovak error strings updated to communicate the limits explicitly.
- **Hard delete vs. spam-mark** — plan named "Vymazať natvrdo" with subject-typed confirm; live UI implements safer soft-mark "Označiť ako spam" with **ticket-id**-typed confirm. **Plan updated** (TC-14 + state machine row above) to assert shipped behavior. The soft-mark semantics are the senior call: irreversible hard delete on PII data without explicit retention need is risk-positive without product benefit.
- **Internal note feature (D-07)** — plan assumed feature available; live composer did not expose the toggle. **Resolved in PR #178** (full 5-layer vertical slice: DB column + view-token RPC filter + CF reply handler + composer checkbox + thread badge + tests). The D-07 spec in `admin-detail-render.spec.ts` is no longer `test.fixme`.
- **`p_inline` parameter on `request_attachment_signed_url`** — shipped in E48-v3 migration (`20260522170000_e48_v3_multi_assignment.sql`). Schema-invariants test re-enabled in PR #171.
- **PDF iframe testid pattern (TC-27)** — confirmed shipped: `admin-ticket-attachment-pdf-{id}`. POM `attachmentPdfEmbed(id)` getter exists.
- **Attachment lightbox component** — confirmed shipped: `src/components/admin/detail/AttachmentLightbox.tsx`. POM `attachmentLightboxRoot` + `attachmentLightboxCloseButton` getters exist.

## Open questions

- **Exact Slovak string for rate-limit client error:** TC-08 asserts `/príliš veľa žiadostí/i` — generator must read `src/components/support/SupportContactForm.tsx` and the `mapErrorCode()` helper to find the verbatim string before writing the spec assertion.
- **Reply composer error element testid for TC-36:** The testid for the in-flight error state in the reply composer is not yet in `AdminTicketDetailPage.ts`. Generator must add it (e.g. `admin-ticket-detail-reply-error`) to the source component and POM.
- **`support_ticket_assignees` direct INSERT policy (E-09):** Confirm the migration has no INSERT RLS policy on `support_ticket_assignees` and that the only valid insertion path is through the `assign_admin_to_ticket` RPC. If a direct-insert policy exists for admin AAL2, the TC result changes from "denied" to "allowed" and this TC should be removed.
- **G-02 state machine on race resolve + reply:** Confirm whether `transition_ticket_status('resolved', ...)` followed immediately by a reply that auto-flips to `waiting_user` is the intended behavior or if the reply should fail on a resolved ticket. The state machine reference above shows `resolved → in_progress` only via "Znovu otvoriť", meaning a reply to a resolved ticket may be blocked at the application layer.
