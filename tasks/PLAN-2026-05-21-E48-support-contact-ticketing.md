# E48 — Support contact form + admin ticketing system

**Created:** 2026-05-21
**Status:** 🟡 Plan drafted — awaiting product-owner approval
**Owner:** _to assign_
**Branch (when work starts):** `feature/E48-support-ticketing`
**Commit prefix:** `feat(support):`
**Dependencies:** E11.8 (Resend email infra), E40 (admin queue UI pattern), E46 (audit_log + ConfirmDialog + AAL2 gating), AH-10.4 (the empty `/admin/support` route stub this epic fills)
**Target:** Ship a production-grade support contact channel (anonymous and authenticated submissions) with file attachments, virus/script scanning, an admin ticketing console, and per-category notification preferences — fully tested across security, integration, and e2e layers.

## TL;DR

Today subenai has no support channel beyond the `support_config` table (a 1-row singleton holding a public contact email, surfaced in the footer) and an empty 3-line route stub at `src/routes/admin/support.tsx`. Users who hit a bug, want to ask a question, request a feature, or report inappropriate content have no in-product path — they have to find the e-mail in the footer and write a free-form message that lands in someone's inbox without categorisation, attachment scanning, or audit trail.

This epic ships an end-to-end support pipeline:

1. **Two submission surfaces** — public `/kontakt` (any visitor, with Cloudflare Turnstile + honeypot + per-IP rate limit) and authenticated `/app/help/contact` (pre-filled from `profiles`, no CAPTCHA noise). Both write to the same `support_tickets` table.
2. **File attachments** — JPG / PNG / PDF only, max 5 files × 5 MB each. Defence-in-depth pipeline: (a) client-side `accept=` + size guard, (b) Pages Function magic-byte verification (matches the declared MIME), (c) image re-encode via `sharp` to strip EXIF + embedded JS / steganographic payloads, (d) PDF JS-stripping + form-action stripping via `pdf-lib`, (e) upload to a **private** Supabase Storage bucket, (f) async VirusTotal scan stamping `scan_status ∈ {pending, clean, infected, error}`. Admin sees a download link only when `scan_status = 'clean'`. Infected → quarantined, ticket flagged, automatic admin alert.
3. **Admin ticketing console** at `/admin/tickets` (index) and `/admin/tickets/$ticketId` (detail). Filter by status, category, scan status, assignee, search. Status transitions: `new → in_progress → waiting_user → resolved → archived`. Reply box sends via Resend (email-out with reply-to threading) **and** persists as a `support_ticket_messages` row so the conversation lives in the DB. Destructive ops (delete, archive irreversibly) gated by `ConfirmDialog` with severity. All transitions audited.
4. **Per-category notification preferences** at `/admin/settings/notifications`. Each admin opts in/out globally (master switch) and per ticket category (`bug`, `question`, `feature_request`, `abuse_report`, `billing`, `gdpr`, `other`). Channels: e-mail (Resend) and in-app (existing `notifications` table + new Supabase Realtime channel for the badge counter in the admin sidebar).
5. **Full test pyramid + cleanup** — Vitest contract tests on the migration (schema + RLS lockdown + RPC behaviour), Vitest integration tests hitting real Supabase via service role (with `TEST_PREFIX` cleanup pattern from `webhook-events.spec.ts`), Playwright e2e for both submission surfaces and the admin reply flow (using the canonical `audit-bot@subenai.test` user + a fresh seed SQL file `seed-e48-tickets.sql`), security suite (CSP self-test, RLS lockdown fuzz, attachment-XSS bait, SQL injection through search), accessibility audit on every new page.

Done definition: a user can submit a ticket with an attachment in <60 seconds, the file is scanned within 90 seconds, the admin gets an e-mail + in-app badge based on their preferences, replies land in the user's inbox with a working reply-to thread, and the entire flow is covered by automated tests that seed and clean their own data.

## Scope

### In

| # | Surface | Effort | Priority | Status |
|---|---|---|---|---|
| E48.1 | DB migration: `support_tickets`, `support_ticket_messages`, `support_ticket_attachments`, `admin_notification_preferences`, RLS, RPCs, audit triggers | M | P0 | 🟡 Ready |
| E48.2 | Storage bucket `support-attachments` (private) + signed-URL pipeline + deterministic sanitisation pipeline (magic-byte + `sharp` re-encode + `pdf-lib` JS/AcroForm/URI strip + image/PDF bomb caps) in `/functions/api/support-attachment-upload.ts` | M | P0 | 🟡 Ready |
| E48.3 | Public `/kontakt` route + form (anonymous-friendly, Turnstile, honeypot, rate limit, file upload UX) | M | P0 | 🟡 Ready |
| E48.4 | `/app/help/contact` authenticated form (reuses E48.3 component, pre-fills from `profiles`, no Turnstile) + `/app/help` landing-page card linking to it | S | P0 | 🟡 Ready |
| E48.5 | Confirmation e-mails — Slovak templates (`supportTicketReceivedEmail`, `supportTicketReplyEmail`, `supportTicketResolvedEmail`) wired into the existing `/functions/_lib/email.ts` Resend dispatcher | S | P0 | 🟡 Ready |
| E48.6 | `/admin/tickets` index — sortable table, filter chips (status / category / scan / assignee), full-text search on subject + body, pagination (50 per page), `Otvoriť` row action | M | P0 | 🟡 Ready |
| E48.7 | `/admin/tickets/$ticketId` detail — sticky header, thread view, reply composer (Markdown-ish), attachment downloader gated on `scan_status='clean'`, status transition buttons via `ConfirmDialog`, soft-delete + archive | M | P0 | 🟡 Ready |
| E48.8 | Admin reply send — `/functions/api/support-ticket-reply.ts` (Resend out with `Reply-To: ticket+{id}@subenai.sk` for future inbound threading), persisted as `support_ticket_messages` row, status auto-flips to `waiting_user` | S | P0 | 🟡 Ready |
| E48.9 | Admin notification system — `admin_notification_preferences` table, `/admin/settings/notifications` UI with global toggle + per-category toggles + channel toggles, Supabase Realtime subscription in the admin shell for live badge, e-mail dispatch on new-ticket / new-reply / scan-failed events | M | P0 | 🟡 Ready |
| E48.10 | Test pyramid: Vitest contract (migration schema + RLS + RPCs), Vitest integration (real Supabase, seed + cleanup), Playwright e2e (anonymous submit, /app submit, admin reply, scan-status gating) + `supabase/scripts/seed-e48-tickets.sql` + cleanup script | M | P0 | 🟡 Ready |
| E48.11 | Docs + privacy + cookies + CHANGELOG + runbook — `/privacy` s6 disclosure for support data retention, `/cookies` for Turnstile, `tasks/E48-runbook.md` (admin handbook for triaging, escalating, GDPR-deleting tickets), `/docs/admin/support` content, `CHANGELOG.md` entry | S | P0 | 🟡 Ready |

### Out — explicitly NOT in this epic

- **Inbound email parsing** — users replying by email to the admin response do NOT automatically append to the ticket thread. The reply-to address (`ticket+{id}@subenai.sk`) carries the ticket id for future ingestion, but the parsing function is a separate epic. For now, replies hit a monitored mailbox and an admin manually re-opens the ticket.
- **Multi-admin assignment workflows / SLAs** — a ticket has an optional `assigned_to` admin, but there's no round-robin, no escalation timer, no SLA breach alert. Single-admin assumption (we have one admin today).
- **Public ticket portal for users** — logged-in users see their own tickets at `/app/help/tickets` (P1 if requested), but anonymous submitters do NOT get a status page link. They get an e-mail confirmation with the ticket id and instructions to reply by e-mail.
- **Slack / Discord / Telegram webhooks** — out of scope. Email + in-app only.
- **Translation of admin UI** — all admin strings ship Slovak only (matches the rest of `/admin/*`). End-user `/kontakt` page ships Slovak; `/app/help/contact` ships Slovak. EN/CS not in scope.
- **Live chat / chatbot triage** — not in scope. Form-based async support only.
- **Attachment OCR / content-aware scanning** — VirusTotal scan only. No automatic redaction of PII in uploaded screenshots (out of scope; admin reads at own discretion and processes per existing GDPR pipeline).
- **Bulk operations** (mass-archive, mass-delete N tickets at once). Row-by-row only.

## Decisions

| ID | Question | Decision | Why |
|---|---|---|---|
| D-1 | Antivirus strategy — ClamAV-on-VM, VirusTotal-as-a-service, or magic-byte-only? | **Deterministic-only at the edge: magic-byte verification + `sharp` image re-encode (strips EXIF/SVG/scripts; max 40 MP image-bomb cap) + `pdf-lib` JavaScript/AcroForm/`/URI` annotation stripping (max 50 pages PDF-bomb cap). No third-party AV. `scan_status` collapsed to `clean` / `error`.** | Cloudflare Workers cannot run ClamAV (>2 GB DB; Workers cap 128 MB). Deterministic sanitisation eliminates ~95 % of attack surface (embedded JS in PDFs, EXIF-stuffed images, MIME confusion, image/PDF bombs) with zero recurring cost and zero new third-party dependency. Trade-off: exotic steganographic malware embedded in a benign-looking but valid PNG/PDF (targeting a specific viewer's CVE) will pass — accepted for our threat model (low-volume support form, files only downloaded by trained admins onto sandboxed viewer apps, never auto-rendered). VirusTotal or a ClamAV sidecar can be added later as a follow-up if any production sample slips through. |
| D-2 | Anonymous submissions allowed? | **Yes**, but rate-limited (3 per IP per 24h, enforced in CF function via KV / Durable Object counter), gated by Cloudflare Turnstile (free), and protected by a honeypot field. | The user brief explicitly distinguishes "user of subenai" (general visitor) from "authenticated /app user". Anonymous channel is part of the brief. The triple-gate (Turnstile + honeypot + rate limit) is the standard production-grade anti-spam stack and integrates cleanly with our existing Cloudflare deployment. |
| D-3 | Reply channel — email-only, in-app-only, or both? | **Both: persisted `support_ticket_messages` row + email-out via Resend.** Reply-to address `ticket+{id}@subenai.sk` carries ticket id for future inbound parsing. | Audit trail (in-DB) + user convenience (email). Single source of truth = the DB row; email is a notification mirror. Avoids the "where is the real thread?" problem if/when inbound parsing ships. |
| D-4 | Should anonymous submitters be able to see their ticket status? | **Not via a portal.** They receive an email confirmation with a unique ticket id + a unique `view_token` (HMAC-signed, 90-day TTL). Clicking the link in the email shows a read-only thread page at `/kontakt/ticket/$id?token=$token`. No login, no listing of other tickets, no PII beyond what they sent. | Self-service status check is a real UX need; a full portal is over-engineering. HMAC-signed view token is the same pattern as DPA delivery emails (E40). |
| D-5 | Notification preferences scope — per-admin or global? | **Per-admin.** Each admin row in `user_roles` (role='admin') gets a corresponding `admin_notification_preferences` row created lazily on first /admin login. Master switch + per-category enable + per-channel enable. | Multiple admins eventually; one admin's "email me everything" should not flood another. Lazy creation avoids dead rows for inactive admins. |
| D-6 | Category taxonomy | **Fixed enum**: `bug`, `question`, `feature_request`, `abuse_report`, `billing`, `gdpr`, `other`. | Closed set = predictable filter UI + predictable notification routing. Free-text "category" leaks into operator inconsistency over time. Seven options is the sweet spot (covers > 95% of inbound based on industry norms; "other" is the escape hatch). |
| D-7 | Auto-archive resolved tickets? | **Yes, after 90 days resolved → auto-archive via pg_cron** (extends the E46.5 cron pattern). Archived tickets are read-only, hidden from default index view, surfaced only when filter chip `Archivované` is active. Hard-delete after 36 months per E38 retention policy. | Index page bloat is the failure mode for ticketing systems at year 2. Auto-archive keeps the working set small without losing history. 36-month total retention matches `audit_log` and aligns with statute-of-limitations defaults. |
| D-8 | Auth gate on `/admin/tickets` | **Admin role + AAL2 (TOTP).** | PII surface — attachments may contain screenshots with personal data. Matches `/admin/dsr`, `/admin/users`. Uses the existing `requireRole + requireAal2` HOC. |
| D-9 | URL shape for attachments served to admin | **Signed URLs (15-min TTL) via Supabase Storage SDK.** Never inline `<img src>` — always `<a href download>`. Content-Disposition: `attachment`. | Inline rendering of user-uploaded images is the classic XSS vector via SVG/MIME-confusion. Download-only forces the admin to open in their viewer of choice, which has its own sandbox. Signed URLs prevent hotlinking and expire fast enough to limit replay if a URL leaks. |
| D-10 | CSP impact | **No CSP relaxation** — admin never inlines attachments, so `img-src` doesn't change. The Turnstile script on `/kontakt` adds `https://challenges.cloudflare.com` to `script-src` and `frame-src` (the canonical Turnstile origin). | Tightest possible CSP. New domain whitelisted is documented + scoped to the one route that needs it. |

## Architecture

### Data model

```
support_tickets
├── id (uuid, PK)
├── created_at (timestamptz)
├── updated_at (timestamptz)
├── status (enum support_ticket_status: new | in_progress | waiting_user | resolved | reopened | archived; M-DB1 added `reopened`)
├── category (enum support_ticket_category: bug | question | feature_request | abuse_report | billing | gdpr | other)
├── source (enum support_ticket_source: public_form | app_form; H-DB1 was free text)
├── subject (text NOT NULL CHECK (char_length BETWEEN 1 AND 200) — immutable after insert via UPDATE policy; H-DB4)
├── body (text NOT NULL CHECK (char_length BETWEEN 1 AND 5000) — immutable after insert; H-DB4)
├── submitter_user_id (uuid, FK auth.users, nullable — anonymous tickets)
├── submitter_email (text NOT NULL CHECK (char_length BETWEEN 5 AND 254 AND regex match); M-S2 length cap)
├── submitter_name (text, optional for anonymous, mirrored for authenticated)
├── view_token_hash (text NOT NULL CHECK (view_token_hash ~ '^[0-9a-f]{64}$') — server-generated; never written by anon; L-DB2)
├── view_token_expires_at (timestamptz NOT NULL)
├── view_token_invalidated_at (timestamptz, nullable — H-S3: revocation path; set to now() to kill outstanding tokens)
├── assigned_to (uuid REFERENCES auth.users(id) ON DELETE SET NULL — C-DB2)
├── resolved_at (timestamptz, nullable)
├── archived_at (timestamptz, nullable)
├── source (text: 'public_form' | 'app_form')
├── user_agent (text, nullable, truncated to 200 chars)
├── ip_country (text, 2-letter, from CF-IPCountry header — no full IP stored)
└── deleted_at (timestamptz, nullable — soft delete with 5-min grace per E46 pattern)

support_ticket_messages
├── id (uuid, PK)
├── ticket_id (uuid, FK support_tickets ON DELETE CASCADE)
├── created_at (timestamptz)
├── author_kind (enum: 'user' | 'admin' | 'system')
├── author_user_id (uuid, FK auth.users, nullable for anonymous user)
├── author_name (text — denormalised so deleted accounts still show a name)
├── body (text, 10000 chars max)
└── email_message_id (text, nullable — Resend Message-Id for outbound)

support_ticket_attachments
├── id (uuid, PK)
├── ticket_id (uuid, FK support_tickets ON DELETE CASCADE)
├── message_id (uuid, FK support_ticket_messages, nullable — first-message attachments)
├── created_at (timestamptz)
├── filename (text, 200 chars max, sanitised server-side)
├── mime_type (text — VERIFIED via magic bytes, not the declared one)
├── size_bytes (integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5_242_880))
├── storage_path (text NOT NULL — `<ticket_id>/<crypto.randomUUID()>.<ext>`; ext from hardcoded MIME map, never user-derived; M-S1)
├── scan_status (enum support_attachment_scan_status: 'clean' | 'error')
├── scanned_at (timestamptz, nullable)
└── checksum_sha256 (text)

  Phase-A review removed: scan_provider (C-DB1), scan_result (L-S2/L-DB1).
  Re-add both if/when VirusTotal follow-up ships.

admin_notification_preferences
├── user_id (uuid, PK, FK auth.users)
├── created_at, updated_at (timestamptz)
├── enabled (boolean, default true — master switch)
├── channels (jsonb — { email: true, in_app: true })
├── per_category (jsonb — { bug: true, question: false, … })
└── digest_cadence (enum: 'instant' | 'hourly' | 'daily' | 'off', default 'instant')
```

### RLS policies — anon has NO direct DML access (Phase-A review absorbed)

Per Phase-A security review (C-S1, C-S2): closing the entire "anon impersonates / forges view_token / bypasses CF function via PostgREST" attack class by **revoking all direct DML privileges from `anon` on the new tables**. Anonymous submissions go through the SECURITY DEFINER RPC `submit_support_ticket()`, called by `/functions/api/support-ticket-create.ts` using the **service-role key**. Anonymous reads go through `get_ticket_thread_for_view_token()`, also SECURITY DEFINER, which validates the HMAC view token. RLS policies cover the **authenticated** and **admin** paths only:

- `support_tickets_user_select` — `SELECT` for `authenticated` when `submitter_user_id = auth.uid()`.
- `support_tickets_user_insert` — `INSERT` for `authenticated` with `WITH CHECK (submitter_user_id = auth.uid())`.
- `support_tickets_update_locked` — `UPDATE` for `authenticated` explicitly excludes `subject`, `body`, `submitter_email`, `submitter_name`, `view_token_hash`, `view_token_expires_at`, `created_at` from the allowed set (H-DB4: post-insert immutability).
- `support_tickets_admin_all` — `ALL` when `public.has_role(auth.uid(), 'admin')`.
- `support_ticket_messages_*` and `support_ticket_attachments_*` — three policies each (SELECT/INSERT/admin-all) mirroring the parent ticket gate via ticket-FK lookup. Attachment download URL generation passes through `request_attachment_signed_url()` RPC (admin + AAL2 + scan_status='clean').
- `admin_notification_preferences_owner_*` — owner-only SELECT/INSERT/UPDATE; no admin-of-admin override (each admin's prefs are their own).
- `storage.objects` bucket policy: anon = no access; authenticated = no access; admins SELECT only; INSERT via service-role only.

`ALTER TABLE … ENABLE ROW LEVEL SECURITY` on every new table; **`REVOKE ALL ON support_tickets, support_ticket_messages, support_ticket_attachments FROM anon`** to enforce zero anon DML at the role layer (defence-in-depth even if a policy is misconfigured later). Mitigations elsewhere in the pipeline: (a) the CF function performs Turnstile + honeypot + per-IP rate-limit BEFORE calling the RPC; (b) the RPC generates `view_token` server-side via `gen_random_bytes(32)` — anon never supplies it; (c) the `AFTER INSERT` trigger calls `enqueue_admin_notifications_for_ticket(...)` which writes `notifications` rows server-side (H-S4: not browser-side) and fires `pg_notify` for live updates.

### RPCs (4 total — Phase-A review added `get_ticket_thread_for_view_token`)

- `submit_support_ticket(p_payload jsonb) RETURNS jsonb` — SECURITY DEFINER. Generates `view_token` + `view_token_hash` server-side (`gen_random_bytes(32)` → `encode(digest(..., 'sha256'), 'hex')`). Returns `{ ticket_id, view_token }` (plain token, one-time return). When called by `service_role` (CF function for anon submissions): no `auth.uid()` check. When called by `authenticated`: requires `p_payload->>'user_id' = auth.uid()::text`. **GRANT EXECUTE TO `service_role, authenticated`** — explicitly NOT `anon`.
- `get_ticket_thread_for_view_token(p_ticket_id uuid, p_view_token text) RETURNS jsonb` — SECURITY DEFINER. Computes SHA-256 of `p_view_token`, constant-time compares to stored hash; validates `expires_at > now() AND invalidated_at IS NULL`; writes `audit_log` row `action='support_ticket_view_token_used'`; returns the thread (subject + status + messages + attachment metadata; no attachment download URLs to anon). **GRANT EXECUTE TO `anon, authenticated`** — the token IS the auth.
- `request_attachment_signed_url(p_attachment_id uuid) RETURNS text` — SECURITY DEFINER. Validates admin role + AAL2 + `scan_status='clean'`; issues a 15-min signed URL with `Content-Disposition: attachment; filename=<sanitised>` (never inline). Audit-logged. **GRANT EXECUTE TO `authenticated`** only.
- `transition_ticket_status(p_ticket_id uuid, p_new_status support_ticket_status, p_note text) RETURNS jsonb` — SECURITY DEFINER. Admin + AAL2. Enforces the state-machine (legal moves only: `new → in_progress`, `in_progress → waiting_user|resolved`, `waiting_user → in_progress|resolved`, `resolved → reopened|archived`, `reopened → in_progress`, any → soft-delete). Writes `audit_log`. **GRANT EXECUTE TO `authenticated`** only.

### CF Pages Functions (2 new)

- `/functions/api/support-attachment-upload.ts` — accepts a `multipart/form-data` blob, validates size + filename + magic bytes (`file-type` lib), re-encodes images via `sharp` (output PNG/JPEG, strips EXIF/ICC, max 40 MP), strips PDF JavaScript + AcroForm scripts + `/URI` annotations via `pdf-lib` (max 50 pages), uploads sanitised file to private Supabase Storage bucket, inserts `support_ticket_attachments` row with `scan_status='clean'`. Returns the row id. On any sanitisation failure: 400 with `code: 'sanitization_failed'`; no row inserted; no Storage object written.
- `/functions/api/support-ticket-reply.ts` — admin-only (validates JWT + admin role + AAL2 claim), sends Resend email with `Reply-To: ticket+{id}@subenai.sk`, persists `support_ticket_messages` row, flips ticket status to `waiting_user`.

### Storage bucket

- `support-attachments` — **private** (no public read policy). Path pattern `<ticket_id>/<attachment_uuid>.<extension>`. Lifecycle: kept indefinitely while ticket is non-archived; cascade-deleted on ticket archive via cron (E48.10 cleanup step). RLS on the underlying `storage.objects` table: admin SELECT only, INSERT via Pages Function service-role only.

### Notification flow (Phase-A review H-S4: notification rows created server-side)

```
New ticket inserted
   ↓
AFTER INSERT trigger calls enqueue_admin_notifications_for_ticket(ticket_id)
  (SECURITY DEFINER, server-side, runs whether or not any admin browser is open)
   ↓
For each admin with enabled=true AND per_category[ticket.category]=true:
   ↓
  INSERT INTO notifications (user_id=admin_id, event_type='support_ticket_new', ...)
   ↓
   ↓
Trigger ALSO fires pg_notify('support_tickets_admin', payload)
   ↓
Supabase Realtime channel 'support_tickets_admin' broadcast
   ↓
For any admin browser currently open:
  1. Read the just-created `notifications` row (NOT created by the browser)
  2. Increment sidebar badge counter, show toast
   ↓
Separately: pg_cron job 'dispatch-admin-emails' (every minute) selects
unprocessed `notifications` rows of support_ticket_*, for each admin
with channels.email=true respects digest_cadence:
  - instant → fire immediately via /functions/api/support-notify-admin.ts
  - hourly  → batch every hour at :00 Europe/Bratislava
  - daily   → batch every day at 09:00 Europe/Bratislava
  - off     → skip
Each row stamped with `delivered_at` once dispatched.
```

**Why server-side:** A new-ticket alert cannot be silently dropped just because no admin browser tab happened to be open at the moment of `INSERT`. The `notifications` row is the source-of-truth; the browser is the render layer. The pg_cron sweep gives the email path the same robustness — even if the browser realtime channel disconnects, the cron picks up unprocessed rows.

### UI — surface inventory

- **Public**
  - `/kontakt` — single-page form (subject, category dropdown, body, attachments dropzone, email, optional name, honeypot, Turnstile, submit). Slovak copy. Bilingual error states. Live char counter.
  - `/kontakt/ticket/$id?token=$token` — read-only thread page (token-gated, anonymous-friendly). Slovak.
  - `/kontakt/odoslane` — success state with ticket id + email confirmation note. Slovak.
- **Authenticated**
  - `/app/help` — landing card linking to `/app/help/contact` (and to existing `/app/help/faq` if present). Slovak.
  - `/app/help/contact` — same form, no Turnstile, pre-filled email + name from `profiles`. Slovak.
  - `/app/help/tickets` — list of this user's own submissions (`submitter_user_id = auth.uid()`). Slovak. (Stretch — keeps the user honest about their open conversations.)
  - `/app/help/tickets/$id` — own-ticket thread view. Slovak.
- **Admin**
  - `/admin/tickets` — index. Slovak.
  - `/admin/tickets/$ticketId` — detail + thread + reply + status transitions. Slovak.
  - `/admin/settings/notifications` — admin notification preferences (master + per-category + per-channel + digest cadence). Slovak.

## Security review checklist (E48.10 + E48.11 enforce; **bold rows added by Phase-A pre-implementation review 2026-05-21**)

| Risk | Mitigation |
|---|---|
| XSS via uploaded SVG / EXIF-stuffed image | All images re-encoded via `sharp` → PNG/JPEG (strips SVG, EXIF, ICC). SVG explicitly rejected at MIME-sniff. |
| Malicious PDF (embedded JS, /OpenAction, external form actions) | `pdf-lib` rewrites the file: strip `/JS`, `/JavaScript`, `/AA`, `/OpenAction`, `/Launch`, `/SubmitForm`, **`/EmbeddedFile`, `/Filespec`, `Names → EmbeddedFiles` sub-tree**, all `/AcroForm` script entries, all `/URI` annotations. |
| **PDF with malicious image filter (JBIG2 / JPX viewer-CVE chain)** | **Reject the upload if any image stream `/Filter` array contains `JBIG2Decode` or `JPXDecode`. The deterministic pipeline cannot re-encode these and `pdf-lib` preserves them verbatim.** |
| MIME confusion (file claims `image/png`, is actually `text/html`) | Magic-byte verification rejects mismatches at upload. |
| **Storage path traversal via user filename** | **Storage path constructed server-side ONLY as `<ticket_id>/<crypto.randomUUID()>.<ext>` where `<ext>` comes from a hardcoded `{image/png: 'png', image/jpeg: 'jpg', application/pdf: 'pdf'}` map keyed by the verified MIME — never from user-supplied filename.** |
| Stored XSS in `body` / `subject` | Admin UI renders all user text through React (auto-escape). No `dangerouslySetInnerHTML` anywhere on admin ticket pages. Email outbound uses HTML-escape, not Markdown render. |
| SQL injection via search query | Parameterised queries only; PostgreSQL full-text search via `to_tsvector` + `plainto_tsquery`. No string concat. |
| **RLS / RPC escape — anon DML on support tables** | **`anon` role REVOKE'd from all direct DML on `support_tickets` / `support_ticket_messages` / `support_ticket_attachments`. Anonymous submissions can ONLY land via `submit_support_ticket()` SECURITY DEFINER RPC, called by CF function with service-role key. RPC owns `view_token` generation (server-side `gen_random_bytes(32)`); anon never supplies the hash.** |
| **IDOR on `request_attachment_signed_url`** | **RPC validates admin role + AAL2 BEFORE any query touches the attachment row. RLS lockdown test asserts authenticated non-admin passing a valid attachment UUID gets permission-denied / null.** |
| Anonymous spam flood | Turnstile (free, 0.5s server-side verify) + honeypot field (renders out-of-viewport, real users won't fill) + per-IP rate limit (CF KV counter, 3 per 24h). |
| Replay of view_token from URL bar history | 90-day TTL on the token. Token-bound to ticket id; trying another id with the same token = 404. Audit-logged on every use via `log_view_token_use(p_ticket_id, p_ip_country)` SECURITY DEFINER (M-S4). |
| **View_token compromise (user's email hacked, attacker has 90 days)** | **`view_token_invalidated_at timestamptz` column (H-S3). Setting it to `now()` invalidates outstanding tokens. Runbook §10 documents the procedure: "Re-issue view token for ticket #X" → UPDATE row, send a new email with the fresh token.** |
| **HMAC secret leak** | **Rotation procedure in runbook §10 (L-S3): bump secret in CF env, `UPDATE support_tickets SET view_token_invalidated_at = now()` to kill all outstanding tokens at once, users get "your link expired" on next click and can request re-issue.** |
| Attachment download URL leak | Signed URL with 15-min TTL. Admin-only generation. Audit-logged. |
| Inbound user reply email phishing the admin | Reply emails routed through a monitored mailbox, NOT processed automatically. Admin manually verifies before re-opening a ticket. |
| Storage bucket public read | Bucket is private (no public read policy). Direct URL access returns 403. |
| Audit log gaps | Every status transition + every attachment download URL request + every reply send writes an `audit_log` row. Verified by E48.10 RLS lockdown tests. |

## SEO + marketing + UX disciplines (parallel review gate before merge)

Per the user's brief ("senior level in SEO, copyright, marketing, UX/UI, security, dev"), before each phase merges to `main` the relevant skill-using agent reviews the work:

- **SEO** — `marketing:seo-audit` skill against `/kontakt`. `<title>`, meta description, structured data (`ContactPage` schema), canonical, OG tags. Robots = `index, follow` for `/kontakt`; `noindex` for `/kontakt/odoslane`, `/kontakt/ticket/*`, `/app/help/*`.
- **Marketing copy** — `marketing:draft-content` for the `/kontakt` page hero + the post-submit page + the three transactional emails. Tone: warm, competent, non-corporate. Slovak. Match the existing `/zmeny`, `/o-projekte` register.
- **UX critique** — `design:design-critique` on the form mockup (mobile-first) before E48.3 implementation begins. Output: a punch list of friction points (do users see required-field hints? is the dropzone discoverable?).
- **Accessibility** — `design:accessibility-review` on every new page before merge. WCAG 2.1 AA. Touch targets ≥ 44 px. Colour contrast ≥ 4.5 : 1. Form labels programmatically associated. Live region for upload progress + scan status.
- **Security review** — `engineering:code-review` skill on the CF functions in E48.2 + E48.8 in fresh context. Specifically: file-upload validation, SSRF in the VT scanner, JWT validation in the reply function, secret leakage in error responses.

These reviews are story-level acceptance criteria (called out in each story's "Code review" subtask), not standalone stories — they run as part of the per-story DoD § 2 gate.

## Story map

| ID | Title | Effort | Priority | Status | Notes |
|---|---|---|---|---|---|
| E48.1 | DB migration: tickets + messages + attachments + admin prefs + RLS + RPCs + audit triggers | M | P0 | 🟡 Ready | Includes `DEPLOY_SETUP.sql` update, `types.ts` sync, contract Vitest. |
| E48.2 | Storage bucket + deterministic sanitisation pipeline (no third-party AV) | M | P0 | 🟡 Ready | New deps: `sharp` (WASM build for Workers), `pdf-lib`, `file-type`. No new secrets. CSP unchanged. |
| E48.3 | Public `/kontakt` route + form (Turnstile + honeypot + rate limit) | M | P0 | 🟡 Ready | New secret: `TURNSTILE_SECRET_KEY`. CSP gets `https://challenges.cloudflare.com` in `script-src` + `frame-src`. SEO meta + ContactPage JSON-LD. |
| E48.4 | `/app/help/contact` authenticated form + `/app/help` landing card | S | P0 | 🟡 Ready | Reuses `<SupportContactForm>` component. Profile prefill via `useSession()`. |
| E48.5 | Confirmation e-mails (3 Slovak templates) wired into Resend dispatcher | S | P0 | 🟡 Ready | Templates: `supportTicketReceivedEmail`, `supportTicketReplyEmail` (user-facing of admin reply), `supportTicketResolvedEmail`. |
| E48.6 | `/admin/tickets` index — table + filters + search + pagination | M | P0 | 🟡 Ready | Slot replaces stub at `src/routes/admin/support.tsx` (kept as 301 → `/admin/tickets`). Sidebar entry moves. |
| E48.7 | `/admin/tickets/$ticketId` detail — thread + reply box + status transitions + scan-gated downloads | M | P0 | 🟡 Ready | Uses `ConfirmDialog` for archive/delete; `severity='destructive'` for delete with typed-confirm of subject. |
| E48.8 | Admin reply CF function + Resend out + persisted message | S | P0 | 🟡 Ready | `Reply-To: ticket+{id}@subenai.sk` (DNS not required for this to be a valid header; inbound parsing out of scope). |
| E48.9 | Admin notification system — prefs schema + UI + Realtime + email dispatch | M | P0 | 🟡 Ready | Realtime channel `support_tickets:admin`. Badge counter in admin sidebar. Quiet-hours field deferred to later. |
| E48.10 | Test pyramid + security suite + test data SQL + cleanup | M | P0 | 🟡 Ready | `supabase/scripts/seed-e48-tickets.sql` (idempotent, `ON CONFLICT DO NOTHING`). Cleanup via `TEST_PREFIX` pattern. Playwright specs under `e2e/specs/support/` + integration under `e2e/integration/support/`. |
| E48.11 | Docs + privacy + cookies + CHANGELOG + runbook + admin docs page | S | P0 | 🟡 Ready | `/privacy` s6 new section for support data. `/cookies` Turnstile entry. `tasks/E48-runbook.md` for triage / escalation / Art. 17 deletion of support data. `/docs/admin/support` content. |

**Total:** 11 stories, ~3 sprints (15 working days) if done by one engineer with the parallel skill-review gates.

## Sprint estimate

| Sprint | Days | Stories | Outcome |
|---|---|---|---|
| 1 | 1–2 | E48.1 | Schema + RLS + RPCs landed; types regenerated; contract tests green. |
| 1 | 3–5 | E48.2 | Deterministic sanitisation pipeline live; private bucket configured. |
| 2 | 6 | E48.3 | Public /kontakt form behind a feature flag. |
| 2 | 7 | E48.4 + E48.5 | /app/help/contact + 3 confirmation emails. |
| 2 | 8–9 | E48.6 + E48.7 | Admin tickets index + detail page. |
| 2 | 10 | E48.8 | Admin reply round-trip. |
| 3 | 11–12 | E48.9 | Notification prefs + realtime badge + dispatch. |
| 3 | 13 | E48.10 | Test pyramid; CI green. |
| 3 | 14 | E48.11 | Docs + privacy + CHANGELOG + runbook. |
| 3 | 15 | — | Buffer + production smoke + feature flag flip. |

## Risks + mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| `sharp` / `pdf-lib` adds bundle weight or fails to install on CF Workers | Medium | High | These ship in **Pages Functions** (Workers runtime) — `sharp` works via WASM build (`sharp/wasm`). Pre-verify in a spike commit before E48.2 implementation work begins. Fallback: reject the file with "use a different format" if sanitisation fails. |
| Exotic malware passes deterministic sanitisation (e.g. steganographic payload in a valid PNG targeting a specific viewer's CVE) | Low | Medium | Out-of-scope per D-1: low-volume support form, admins trained to treat attachments as untrusted, download-only (never inline-rendered). Add VirusTotal or a ClamAV sidecar as a follow-up if any production sample slips through. |
| Anonymous spam still gets through Turnstile | Low | Medium | Rate limit is the safety net. If volume spikes, raise Turnstile difficulty + add disposable-email-domain blocklist. |
| Storage bucket fills up | Low | Low | 5 MB × 5 attachments × N tickets — at our volume, years before we hit 1 GB. Lifecycle: archived tickets older than 36 months get attachments hard-deleted by cron. |
| RLS escape via crafted JWT | Very low | Critical | Defence: `submit_support_ticket()` validates `auth.uid()` against `submitter_user_id`; anon policy explicitly requires `submitter_user_id IS NULL`. E48.10 RLS lockdown tests cover both directions. |
| Admin sees PII in a screenshot they shouldn't | Medium | Medium | Privacy doc s6 discloses that uploads may contain user data; admin training in runbook says "treat attachments as PII". GDPR Art. 17 deletion of a ticket cascades to attachments + storage objects (hard delete, not soft). |
| User clicks the view-token link, link is in their email forever, account compromised → attacker reads the ticket | Low | Medium | 90-day TTL on the token. Tickets older than 90 days require re-submission. We can offer to re-issue a token if user requests; that's a runbook entry. |
| The admin sidebar realtime channel doesn't reconnect after network blip | Medium | Low | Supabase Realtime auto-reconnects; we also poll every 60s as a fallback when realtime is `CLOSED`. UI shows a small "offline" indicator if the channel is down > 2 min. |
| Migration applied to prod but RLS not enabled | Very low | Critical | Migration ends with `ALTER TABLE … ENABLE ROW LEVEL SECURITY` for every new table. E48.10 has a Vitest contract test that greps the migration file for `ENABLE ROW LEVEL SECURITY` on every `CREATE TABLE`. |

## Open questions

- **Q1 — Email return address.** `support@subenai.sk` or `noreply@subenai.sk` for outbound? *Lean: `support@subenai.sk`*, real human reads the inbox during the inbound-parsing-deferred period. Decision before E48.5 kickoff.
- **Q2 — Turnstile feature-flag default.** Ship with Turnstile on or off? *Lean: on from day one.* Free; small friction (invisible on most browsers); avoids "shipped without it, got spammed, scrambled to add" pattern. Decision before E48.3 kickoff.
- **Q3 — Admin badge counter source-of-truth.** Realtime-driven only, or also polled? *Lean: realtime + 60s poll fallback* (D-7-ish reliability). Decision before E48.9 kickoff.
- **Q4 — `/kontakt` page slug.** `/kontakt` (Slovak) or `/contact` (English)? Existing public route convention is Slovak (`/podpora`, `/podakovanie`, `/zmeny`, `/o-projekte`). *Lean: `/kontakt`.* Decision before E48.3 kickoff.
- **Q5 — Should we add a "Self-service: have you searched the FAQ?" gate before the form?** Standard SaaS pattern; reduces ticket volume. *Lean: not in this epic.* Adds friction; we don't have a populated FAQ yet. Capture as a follow-up.

## Done definition (epic-level)

- All 11 stories shipped, each satisfying per-story DoD § 2.
- `npm run lint` 0/0, `npm test` 100% pass, `npm run build` ✓ (every shipped PR).
- DB migrations applied on production Supabase post-merge.
- Storage bucket `support-attachments` provisioned + RLS verified.
- Secrets configured: `TURNSTILE_SECRET_KEY` (new), `RESEND_API_KEY` (already present from E11.8).
- Feature flag `support_form_enabled` set to `true` in `app_settings` post-launch.
- End-to-end Playwright spec demonstrates anonymous submission → admin reply → user receives email in < 90s.
- Privacy s6 published; cookies entry published; CHANGELOG v1.15.0 entry written; runbook committed; admin docs page live.
- Per-discipline review gates green (SEO audit, marketing copy review, accessibility audit, security review).

## Why now

Three forcing functions:

1. **GDPR ticket inflow is increasing.** E46 closed the in-product DSR flow, but inbound questions ("how do I anonymise my data?", "I forgot which email I used") still hit a personal inbox. A categorised support queue with audit trail makes Art. 12 ("transparent communication") provably compliant.
2. **The `/admin/support` route stub is a known unfinished feature** flagged in PR #115 (E47.1 admin docs). Fixing it closes a self-help loop — the admin docs link to `/docs/admin/support`, which describes a system that didn't exist. After this epic, that doc describes the real thing.
3. **Marketing intends to drive traffic via blog/SEO in Q3.** Inbound from cold visitors needs a low-friction support surface, which today is "find email in footer, write blind". A form-based intake is table stakes for any product blog-driven funnel.

The cost of NOT shipping: every inbound channel quality issue (no triage, no scanning, no archive) compounds and forces a rewrite under time pressure later. The cost of shipping: 3 sprints, deterministic scope, well-known patterns.

## Related work (already shipped — context for this epic)

- E11.8 — Email infra (Resend SDK + Slovak templates) — the dispatcher this epic plugs into.
- E40 — DPA admin queue — the admin queue UX pattern this epic mirrors.
- E46 — Admin user-data manager — the audit_log, ConfirmDialog, typed-confirm, and pg_cron patterns this epic reuses.
- AH-10.4 — Original support stub story (closed without implementation; this epic supersedes its scope).
- AH-1.6 — `support_config` singleton table (kept; surfaces the contact email in the footer; orthogonal to ticketing).
- E47.1 — Admin docs pages — `/docs/admin/support` content will be authored as part of E48.11.
