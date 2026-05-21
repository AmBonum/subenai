# E48 support ticketing — security test plan

**Area:** `specs/support/`
**Component(s) under test:**
- `functions/api/support-ticket-create.ts`
- `functions/api/support-ticket-reply.ts`
- `functions/api/support-attachment-upload.ts`
- `functions/_lib/attachment-sanitize.ts`
- `supabase/migrations/20260521260000_e48_1_support_tickets_schema.sql`
**Routes:** `/kontakt`, `/kontakt/ticket/$id`, `/admin/tickets`, `/admin/tickets/$ticketId`
**API endpoints:**
- `POST /api/support-ticket-create`
- `POST /api/support-ticket-reply`
- `POST /api/support-attachment-upload`
- Supabase RPC `submit_support_ticket(jsonb)`
- Supabase RPC `get_ticket_thread_for_view_token(uuid, text, text)`
- Supabase RPC `request_attachment_signed_url(uuid)`
- Supabase RPC `transition_ticket_status(uuid, support_ticket_status, text)`
**Data dependencies:**
- `public.support_tickets`, `public.support_ticket_messages`, `public.support_ticket_attachments`, `public.admin_notification_preferences`
- RLS policies on all four tables (anon revoked; `authenticated` scoped by `submitter_user_id = auth.uid()`; admin via `has_role()`)
- Storage bucket `support-attachments` (private)
- `audit_log` table (E46 pattern)
**Source stories:** `tasks/PLAN-2026-05-21-E48-support-contact-ticketing.md` decisions D-1 through D-10; `tasks/E48-runbook.md` §3 threat model
**Last updated:** 2026-05-21

---

## Context

E48 ships a public support form (`/kontakt`) with file-attachment support and an admin ticketing console. Because the form accepts files from unauthenticated visitors and renders user-supplied text in admin pages, it presents a broad attack surface: polyglot file uploads, stored XSS, SQL injection through the search box, RLS bypass, view-token forgery, and rate-limit abuse. This plan covers every threat-model row documented in the PLAN's security review checklist and runbook §3, plus concurrency, injection, and auth-layer edge cases. Happy-path flows (anonymous submit, admin reply, notification preferences) are already covered by the smoke specs listed in the references — this plan does **not** duplicate those cases.

## Out of scope

- Happy-path anonymous submission and confirmation email (covered by `e2e/specs/marketing/support.spec.ts` / E48.10 smoke specs noted above).
- Admin reply happy path and notification preferences happy path (covered by E48.10 smoke specs).
- Inbound email parsing — explicitly out of E48 scope per PLAN §Out.
- Multi-admin assignment, SLAs, Slack/Discord webhooks — not in this epic.
- VirusTotal / ClamAV scanning — D-1 decided deterministic-only; no AV scan codes to test.
- Image re-encoding / EXIF strip — deferred to v2 per runbook §2b; no WASM decoder in v1.
- Image bomb caps (pixel-count) — deferred to v2 per runbook §2b.
- JBIG2Decode / JPXDecode PDF filter rejection — the PLAN lists this mitigation but the current `attachment-sanitize.ts` v1 does not implement the `unsupported_filter` check; flagged in Open questions below.
- SEO, marketing copy, or UX critique of `/kontakt` — separate review gate per PLAN §SEO+marketing.
- Accessibility audit (WCAG 2.1 AA) — separate `design:accessibility-review` gate per PLAN §SEO+marketing.
- `/app/help/contact` authenticated form happy-path — covered by the existing smoke suite.

---

## Happy paths

_This plan is security-focused; happy-path flows are intentionally minimal here — they exist only to establish baseline server behavior that the negative and edge-case TCs can measure deviations against._

### TC-01: Valid anon POST reaches the RPC and returns ticket_id + view_token

**Prerequisites**:
- `POST /api/support-ticket-create` is reachable at `http://localhost:8080`.
- `TURNSTILE_SECRET_KEY` is unset (local dev bypass path) or a valid Turnstile test token is provided.
- No prior request from this test's IP within the 24-hour rate-limit window.
- Playwright project: `integration`.

**When** a `POST /api/support-ticket-create` is sent with `{ subject: "Test subject", body: "Test body", email: "security@test.example", category: "question", _h_addr: "" }`
**and** no Authorization header is present
**Then** the response status is 200
**and** the body contains `{ ok: true, ticket_id: "<uuid>", view_token: "<64-hex-string>" }`
**and** the `view_token` is exactly 64 lowercase hex characters

### TC-02: Valid admin JWT with AAL2 reaches `POST /api/support-ticket-reply`

**Prerequisites**:
- A ticket seeded via `supabase/scripts/seed-e48-tickets.sql` with `status = 'new'` exists; its UUID is stored in a test variable.
- A valid admin JWT with `aal=aal2` is available (mocked or from the audit-bot test admin account).
- Playwright project: `integration`.

**When** `POST /api/support-ticket-reply` is called with `{ ticket_id: "<seeded_uuid>", body: "Reply body" }` and the admin JWT in the `Authorization: Bearer` header
**Then** the response status is 200
**and** the body contains `{ ok: true, message_id: "<uuid>" }`
**and** a row in `support_ticket_messages` with `author_kind = 'admin'` exists for that ticket

---

## Negative scenarios

### TC-03: Honeypot non-empty returns 200 with `ticket_id: "honeypot-discarded"`

**Risk reference:** "Anonymous spam flood"

**Prerequisites**:
- No prior requests from this test IP within the rate-limit window.
- Playwright project: `integration`.

**When** `POST /api/support-ticket-create` is sent with `{ subject: "Spam", body: "Spam body", email: "bot@example.com", category: "question", _h_addr: "http://spam.example/" }`
**Then** the response status is 200 (silent block — attacker cannot probe)
**and** the body is `{ ok: true, ticket_id: "honeypot-discarded", view_token: "discarded" }`
**and** no row is inserted into `support_tickets` for `email = 'bot@example.com'`

### TC-04: 21st request from the same IP within 24 hours returns 429

**Risk reference:** "Anonymous spam flood"

**Prerequisites**:
- The server's in-memory IP rate-limit counter for the test IP is at 20 (achieved by 20 prior seeded calls or by setting `SUPPORT_PER_IP_PER_DAY=20` and making 20 calls in the test).
- Playwright project: `integration`.

**When** a 21st `POST /api/support-ticket-create` is sent from the same IP with an otherwise valid payload and `_h_addr: ""`
**Then** the response status is 429
**and** the body contains `{ "error": "rate_limited_ip" }`

### TC-05: Same email cooldown blocks a second submission within 10 minutes

**Risk reference:** "Anonymous spam flood"

**Prerequisites**:
- A previous successful `POST /api/support-ticket-create` was made from this test with `email: "cooldown@test.example"` within the last 10 minutes.
- Playwright project: `integration`.

**When** a second `POST /api/support-ticket-create` is sent with `email: "cooldown@test.example"` and a fresh IP address (different from the first)
**Then** the response status is 429
**and** the body contains `{ "error": "email_cooldown" }`

### TC-06: Admin reply without Authorization header returns 401

**Prerequisites**:
- Playwright project: `integration`.

**When** `POST /api/support-ticket-reply` is sent with a valid body `{ ticket_id: "<valid_uuid>", body: "reply" }` and **no Authorization header**
**Then** the response status is 401
**and** the body contains `{ "error": "not_authenticated" }`

### TC-07: Admin reply with non-admin JWT returns 403 not_admin

**Prerequisites**:
- A valid Supabase JWT for a regular user (role=`user`, not `admin`) is available — use `audit-bot@subenai.test` credentials; that user does not hold the admin role.
- Playwright project: `integration`.

**When** `POST /api/support-ticket-reply` is sent with the non-admin user's JWT in the Authorization header and a valid body
**Then** the response status is 403
**and** the body contains `{ "error": "not_admin" }`

### TC-08: Admin reply with admin JWT at AAL1 (no TOTP) returns 403 aal2_required

**Prerequisites**:
- A JWT with `aal=aal1` (TOTP not yet satisfied) belonging to an admin user is available (can be crafted by sign-in without completing the TOTP challenge, or mocked in unit test by altering the `aal` claim in a service-role-generated token in the integration test).
- Playwright project: `integration`.

**When** `POST /api/support-ticket-reply` is sent with the AAL1 admin JWT in the Authorization header and a valid body
**Then** the response status is 403
**and** the body contains `{ "error": "aal2_required" }`

### TC-09: Attachment upload with an expired view token returns 403

**Prerequisites**:
- A ticket exists in `support_tickets` with `view_token_expires_at = now() - interval '1 second'` (seeded via `UPDATE` after insert to simulate expiry).
- The plain `view_token` that would hash to `view_token_hash` is known (retained from the seed step).
- Playwright project: `integration`.

**When** `POST /api/support-attachment-upload` is sent as multipart/form-data with a valid PNG file, the ticket's UUID as `ticket_id`, and the now-expired `view_token`
**Then** the response status is 403
**and** the body contains `{ "error": "not_authorized" }`

### TC-10: Attachment upload with a revoked view token returns 403

**Prerequisites**:
- A ticket exists with `view_token_invalidated_at = now()` (set via a direct UPDATE using the service-role, simulating the §10 runbook invalidation procedure).
- The matching plain `view_token` is known from the seed step.
- Playwright project: `integration`.

**When** `POST /api/support-attachment-upload` is sent with the revoked `view_token`
**Then** the response status is 403
**and** the body contains `{ "error": "not_authorized" }`

### TC-11: `get_ticket_thread_for_view_token` with missing token returns null (not the ticket)

**Prerequisites**:
- A ticket exists with a valid `view_token_hash`.
- Playwright project: `integration`.

**When** `get_ticket_thread_for_view_token(ticket_id, NULL, NULL)` is called via PostgREST (anon role)
**Then** the RPC returns `null` (PostgreSQL NULL → JSON null)
**and** the HTTP status from PostgREST is 200 with `null` body (not 401, not the ticket object — information-disclosure boundary is enforced)

---

## Edge cases

### RLS shape verification (live-DB integration tests, Playwright project: `integration`)

### TC-12: Anon role cannot read `support_tickets` directly via PostgREST

**Risk reference:** "RLS / RPC escape — anon DML on support tables"

**Prerequisites**:
- The migration `20260521260000_e48_1_support_tickets_schema.sql` has been applied to the test DB.
- A row exists in `support_tickets` (seeded via service-role).
- The Supabase project URL and anon key are available.
- Playwright project: `integration`.

**When** an HTTP GET is sent to `<SUPABASE_URL>/rest/v1/support_tickets?select=id` with the `apikey: <anon key>` header and no Authorization header
**Then** the HTTP status is 401 or the response body is an empty array `[]`
**and** the row seeded above is not present in the response (REVOKE ALL FROM anon enforced)

### TC-13: Anon role cannot INSERT into `support_tickets` directly via PostgREST

**Risk reference:** "RLS / RPC escape — anon DML on support tables"

**Prerequisites**:
- Same DB state as TC-12.
- Playwright project: `integration`.

**When** an HTTP POST is sent to `<SUPABASE_URL>/rest/v1/support_tickets` with the anon key, a valid JSON body, and no Authorization header
**Then** the HTTP status is 401 or 403
**and** no row is inserted into `support_tickets`

### TC-14: Non-admin authenticated user cannot read another user's ticket via PostgREST

**Risk reference:** "IDOR on `request_attachment_signed_url`"

**Prerequisites**:
- Two distinct authenticated users exist: user A (the submitter) and user B (a different non-admin user).
- A ticket exists with `submitter_user_id = user_A_id`.
- A valid JWT for user B is available.
- Playwright project: `integration`.

**When** an HTTP GET is sent to `<SUPABASE_URL>/rest/v1/support_tickets?select=id` with the `Authorization: Bearer <user_B_jwt>` header
**Then** the response body is an empty array `[]`
**and** the ticket belonging to user A is not returned

### TC-15: Non-admin authenticated user cannot UPDATE any ticket column

**Prerequisites**:
- A ticket exists with `submitter_user_id = user_A_id`.
- A valid JWT for user A (the submitter) is available.
- Playwright project: `integration`.

**When** an HTTP PATCH is sent to `<SUPABASE_URL>/rest/v1/support_tickets?id=eq.<ticket_id>` with `{ "status": "resolved" }` and `Authorization: Bearer <user_A_jwt>`
**Then** the HTTP status is 400 or 403
**and** the ticket's `status` remains `'new'` when re-queried via service role

### TC-16: `request_attachment_signed_url` RPC rejects a non-admin authenticated caller

**Risk reference:** "IDOR on `request_attachment_signed_url`"

**Prerequisites**:
- A `support_ticket_attachments` row with `scan_status = 'clean'` exists.
- Its UUID is known.
- A valid JWT for a non-admin authenticated user is available.
- Playwright project: `integration`.

**When** the non-admin user calls `request_attachment_signed_url('<attachment_uuid>')` via PostgREST RPC with their JWT
**Then** the RPC raises an exception with the message containing `not_authorized`
**and** no signed URL is returned
**and** no `audit_log` row is written for this call

### TC-17: `/admin/tickets` route redirects to AAL2 gate when session is AAL1

**Risk reference:** "Auth gate on `/admin/tickets`" (D-8)

**Prerequisites**:
- The browser is signed in with the admin account but TOTP has NOT been completed (session is at `aal1`).
- Playwright project: `e2e-chromium`.

**When** the browser navigates to `/admin/tickets`
**Then** the page redirects to the AAL2 challenge UI (the `AdminAal2GatePage` POM's root element is visible)
**and** the `/admin/tickets` content (ticket table) is not rendered

### View-token edge cases (Playwright project: `integration`)

### TC-18: All-zero token is rejected — does not match any stored hash

**Risk reference:** "Replay of view_token from URL bar history"

**Prerequisites**:
- A ticket exists in the DB with a valid (non-zero) `view_token_hash`.
- Its UUID is known.
- Playwright project: `integration`.

**When** `get_ticket_thread_for_view_token('<ticket_id>', '0000000000000000000000000000000000000000000000000000000000000000', NULL)` is called
**Then** the RPC returns `null`
**and** no `audit_log` row with `action = 'support_ticket_view_token_used'` is written

### TC-19: One-character-off token (Hamming distance 1) is rejected

**Risk reference:** "Replay of view_token from URL bar history"

**Prerequisites**:
- A ticket exists; its correct 64-hex `view_token` is known from the seed step.
- Playwright project: `integration`.

**When** the view token is mutated by changing exactly one hex character (e.g., `view_token[0]` from `'a'` to `'b'`) and passed to `get_ticket_thread_for_view_token`
**Then** the RPC returns `null` (constant-time SHA-256 comparison gives no oracle advantage)
**and** no `audit_log` row is written for this call

### TC-20: Expired token (view_token_expires_at in the past) returns null from the RPC

**Risk reference:** "User clicks the view-token link, link is in their email forever, account compromised"

**Prerequisites**:
- A ticket is seeded; then its `view_token_expires_at` is updated to `now() - interval '1 day'` via service role to simulate expiry.
- The correct plain `view_token` is known.
- Playwright project: `integration`.

**When** `get_ticket_thread_for_view_token('<ticket_id>', '<correct_token>', NULL)` is called
**Then** the RPC returns `null`
**and** calling `GET /kontakt/ticket/<ticket_id>?token=<correct_token>` in a browser returns a "not found" or "token expired" state, NOT the ticket content
**and** the HTTP response from the `/kontakt/ticket/$id` route is not a 401 (no information disclosure about the ticket's existence)

### TC-21: Invalidated token (view_token_invalidated_at set) returns null from the RPC

**Risk reference:** "View_token compromise (user's email hacked, attacker has 90 days)"

**Prerequisites**:
- A ticket is seeded with a valid token; `view_token_invalidated_at` is then updated to `now()` via service role (simulating the §10 runbook procedure).
- The token has not yet reached `view_token_expires_at`.
- Playwright project: `integration`.

**When** `get_ticket_thread_for_view_token('<ticket_id>', '<correct_token>', NULL)` is called
**Then** the RPC returns `null` immediately (the `invalidated_at IS NULL` predicate fails)
**and** no `audit_log` row with `action = 'support_ticket_view_token_used'` is written

### TC-22: Valid token for ticket_id A cannot be used with ticket_id B

**Risk reference:** "Replay of view_token from URL bar history"

**Prerequisites**:
- Two distinct tickets exist; call them A and B. The valid plain view token for ticket A is known.
- Playwright project: `integration`.

**When** `get_ticket_thread_for_view_token('<ticket_B_id>', '<token_for_A>', NULL)` is called
**Then** the RPC returns `null` (token is bound to ticket A's hash, not B's)
**and** calling `GET /kontakt/ticket/<ticket_B_id>?token=<token_for_A>` renders a not-found state

### Attachment polyglot attacks (Playwright project: `integration`)

### TC-23: JPEG with PNG magic bytes declared as `image/png` returns 400 `attachment_magic_mismatch`

**Risk reference:** "MIME confusion (file claims `image/png`, is actually something else)"

**Prerequisites**:
- A valid ticket and view_token are available for the upload authorization step.
- A test fixture file is constructed with the first 3 bytes `FF D8 FF` (JPEG magic) and `name="polyglot.png"`, `type="image/png"`.
- Playwright project: `integration`.

**When** `POST /api/support-attachment-upload` is sent with this fixture, the ticket's `view_token`, and `ticket_id`
**Then** the response status is 400
**and** the body contains `{ "error": "attachment_magic_mismatch" }`
**and** no row is inserted into `support_ticket_attachments`
**and** no object is written to the `support-attachments` Storage bucket

### TC-24: PDF with PNG magic bytes declared as `application/pdf` returns 400 `attachment_magic_mismatch`

**Risk reference:** "MIME confusion (file claims `image/png`, is actually something else)"

**Prerequisites**:
- Same ticket/token context as TC-23.
- A test fixture file starts with the PNG magic bytes `89 50 4E 47 0D 0A 1A 0A` but is declared as `type="application/pdf"`.
- Playwright project: `integration`.

**When** this fixture is uploaded
**Then** the response status is 400
**and** the body contains `{ "error": "attachment_magic_mismatch" }`

### TC-25: PDF with ZIP magic bytes (PK\x03\x04) declared as `application/pdf` returns 400 `attachment_magic_mismatch`

**Risk reference:** "MIME confusion (file claims `image/png`, is actually something else)"

**Prerequisites**:
- A test fixture starts with bytes `50 4B 03 04` (ZIP/DOCX magic) and is declared `type="application/pdf"`.
- Playwright project: `integration`.

**When** this fixture is uploaded with a valid ticket context
**Then** the response status is 400
**and** the body contains `{ "error": "attachment_magic_mismatch" }`

### TC-26: PNG declared as `image/png` but with HTML body is rejected at magic-byte layer

**Risk reference:** "MIME confusion (file claims `image/png`, is actually something else)"

**Prerequisites**:
- A test fixture contains the string `<!DOCTYPE html><script>alert(1)</script>` prepended with no valid PNG signature.
- It is declared `type="image/png"` and `name="payload.png"`.
- Playwright project: `integration`.

**When** this fixture is uploaded
**Then** the response status is 400
**and** the body contains `{ "error": "attachment_magic_mismatch" }` (first byte is `<` = 0x3C, not 0x89)

### TC-27: SVG with `<script>` payload declared as `image/svg+xml` returns 400 `attachment_mime_not_allowed`

**Risk reference:** "XSS via uploaded SVG / EXIF-stuffed image"

**Prerequisites**:
- A test fixture is a valid SVG containing `<script>alert(1)</script>`, declared `type="image/svg+xml"` and `name="xss.svg"`.
- Playwright project: `integration`.

**When** this fixture is uploaded
**Then** the response status is 400
**and** the body contains `{ "error": "attachment_mime_not_allowed" }` (`image/svg+xml` is not in the whitelist `ALLOWED_MIMES`)

### TC-28: PDF with embedded JavaScript `OpenAction` — strip pass removes JS from stored bytes

**Risk reference:** "Malicious PDF (embedded JS, /OpenAction, external form actions)"

**Prerequisites**:
- A test fixture PDF is constructed (via `pdf-lib` in the test setup) that contains a `/OpenAction` dict with a `/JS` entry executing `app.alert('pwned')`.
- The fixture passes magic-byte verification (`%PDF-` prefix is present).
- Playwright project: `integration`.

**When** this fixture is uploaded with a valid ticket context
**Then** the response status is 200 (the file is accepted after sanitisation)
**and** the stored file (downloaded from Storage via the service-role signed-URL path) is re-parsed with `pdf-lib`
**and** the resulting `PDFDocument` has no `/JS`, `/JavaScript`, `/OpenAction`, or `/AA` keys anywhere in its indirect-object tree

### Filename injection (Playwright project: `integration`)

### TC-29: Path traversal in filename is stripped to the basename component

**Risk reference:** "Storage path traversal via user filename"

**Prerequisites**:
- A valid PNG fixture is prepared with `name="../../../etc/passwd.png"` and `type="image/png"`.
- Playwright project: `integration`.

**When** this fixture is uploaded with a valid ticket context
**Then** the response status is 200 (file is accepted after sanitisation)
**and** the `filename` field in the response is `passwd.png` (or `passwd_png`, never `../../../etc/passwd.png`)
**and** the `storage_path` in the inserted `support_ticket_attachments` row is `<ticket_id>/<uuid>.png` — the user-supplied filename does NOT appear anywhere in the storage path

### TC-30: Windows reserved name `CON.png` is handled by the sanitiser

**Prerequisites**:
- A valid PNG fixture is prepared with `name="CON.png"`.
- Playwright project: `integration`.

**When** this fixture is uploaded
**Then** the upload either succeeds (if the sanitiser strips `CON` to a safe name like `CON.png` itself, since `CON` matches `[A-Za-z0-9]+`) or returns 400 with `attachment_filename_invalid`
**and** if it succeeds, the `storage_path` is still the safe `<ticket_id>/<uuid>.png` pattern derived from the verified MIME — NOT from the filename
**and** this case is documented as `filename_edge_known_gap: CON_passes_sanitizer` in the test annotation if the file is accepted unchanged (the sanitiser does not currently block Windows reserved names; the storage_path defence makes it moot but the gap is noted)

### TC-31: RTL override character in filename is neutralised

**Prerequisites**:
- A valid JPEG fixture has its `name` set to `image‮gnp.jpg` (RIGHT-TO-LEFT OVERRIDE before `gnp.jpg`, which visually displays as `image.jpg.gnp`).
- Playwright project: `integration`.

**When** this fixture is uploaded
**Then** the sanitiser strips the U+202E character (it is not in `[A-Za-z0-9._-]`)
**and** the stored `filename` contains no Unicode control characters
**and** the response is 200 with a sanitised filename such as `image_gnp.jpg`

### TC-32: 300-character filename stem is truncated to at most 200 characters preserving the extension

**Prerequisites**:
- A valid PDF fixture is prepared with `name="<'a' * 300>.pdf"` (300-character stem).
- Playwright project: `integration`.

**When** this fixture is uploaded
**Then** the response is 200
**and** the `filename` in the response is at most 200 characters total
**and** the filename ends with `.pdf` (extension preserved across truncation)
**and** the sanitiser truncates the stem, not the extension

### SQL injection in admin search box (Playwright project: `e2e-chromium`)

_These TCs verify the CodeQL ILIKE escape fix in `src/lib/admin/queries.ts`. They are browser-level tests that confirm no error toast, no unexpected data leak, and no crash — the underlying parameterised-query guarantee is tested at the DB layer via the integration project._

### TC-33: Search query `%` returns an empty or normal result set without error

**Risk reference:** "SQL injection via search query"

**Prerequisites**:
- The admin is signed in with AAL2 (full TOTP flow completed).
- `/admin/tickets` is open.
- POM: `AdminTicketsQueuePage` (POM extension needed — a `searchInput` getter and a `searchResults` list locator are required; add them to the POM before generating this test).

**When** the admin types `%` into the search box and submits
**Then** no error toast appears (the query is parameterised; `%` is treated as a literal character by `plainto_tsquery`)
**and** the results list either shows 0 results or the normally-matched tickets — no blank page, no 500 error

### TC-34: Search query `\\` (double backslash) returns without error

**Risk reference:** "SQL injection via search query"

**Prerequisites**:
- Same admin session and route as TC-33.

**When** the admin types `\\` into the search box and submits
**Then** no error toast appears (this was the CodeQL-reported escape issue; the fix in `src/lib/admin/queries.ts` must handle this)
**and** the result set is 0 or normally matched

### TC-35: Search query `'; DROP TABLE--` returns without error and no data loss

**Risk reference:** "SQL injection via search query"

**Prerequisites**:
- Same admin session and route as TC-33.
- At least one real ticket row exists before the search.

**When** the admin types `'; DROP TABLE--` into the search box and submits
**Then** no error toast appears
**and** the ticket row seeded before the search still exists in the DB when verified via a subsequent service-role query (table was not dropped)
**and** the results list renders normally

### XSS in subject / body (cross-project — `integration` for API layer, `e2e-chromium` for render layer)

### TC-36: Subject with `<script>alert(1)</script>` renders as escaped text in the admin queue

**Risk reference:** "Stored XSS in `body` / `subject`"

**Prerequisites**:
- A ticket is seeded with `subject = '<script>alert(1)</script>'` via the `submit_support_ticket` RPC (using the service-role path to bypass Turnstile, or a direct RPC call in the integration project).
- The admin is signed in with AAL2.
- Playwright project: `e2e-chromium`.

**When** the admin navigates to `/admin/tickets`
**and** the injected ticket appears in the queue
**Then** no `alert` dialog fires
**and** the subject text is rendered as the literal string `<script>alert(1)</script>` in escaped form inside the table cell (React auto-escapes; `dangerouslySetInnerHTML` must not be used)
**and** a `browser_console_messages` check shows no `Uncaught` errors on the page

### TC-37: XSS subject renders as escaped text in the admin ticket detail page

**Risk reference:** "Stored XSS in `body` / `subject`"

**Prerequisites**:
- Same seeded ticket as TC-36.
- The admin is signed in with AAL2.
- POM: `AdminTicketDetailPage` (POM does not exist yet — POM extension needed: `subjectHeading` getter that points to the sticky-header subject element).
- Playwright project: `e2e-chromium`.

**When** the admin opens the ticket detail page at `/admin/tickets/<ticket_id>`
**Then** no `alert` dialog fires
**and** the subject text in the sticky header and the thread view is the HTML-escaped literal (not interpreted as markup)

### TC-38: XSS subject renders as escaped text in the anonymous `/kontakt/ticket/$id` view

**Risk reference:** "Stored XSS in `body` / `subject`"

**Prerequisites**:
- Same seeded ticket as TC-36; the plain `view_token` from the seed step is available.
- Playwright project: `e2e-chromium`.

**When** the browser navigates to `/kontakt/ticket/<ticket_id>?token=<view_token>`
**Then** no `alert` dialog fires
**and** the subject text in the page heading is the HTML-escaped literal
**and** a `browser_console_messages` check shows no `Uncaught` errors

### TC-39: Body containing `onerror=`, `javascript:` URI, and `data:` URL is stored safely and never interpreted

**Risk reference:** "Stored XSS in `body` / `subject`"

**Prerequisites**:
- A ticket is seeded with `body = '<img src=x onerror=alert(2)> <a href="javascript:alert(3)">link</a> <iframe src="data:text/html,<script>alert(4)</script>"></iframe>'`.
- Playwright project: `e2e-chromium`.

**When** the admin opens the ticket detail page
**Then** no `alert` dialogs fire for values 2, 3, or 4
**and** the body text is rendered as plain escaped text (no HTML rendering of the user-supplied string)
**and** `browser_console_messages` shows no new `Uncaught` errors

### Concurrent attachment uploads — race on the 3-cap limit (Playwright project: `integration`)

### TC-40: Three parallel POSTs to `/api/support-attachment-upload` for the same ticket do not produce more than 3 attachment rows

**Risk reference:** "Volume-based attacks" (runbook §3)

**Prerequisites**:
- A fresh ticket exists with 0 existing attachments.
- Three valid PNG fixture files are available (all unique, each < 5 MB).
- The ticket's `view_token` is valid and unexpired.
- Playwright project: `integration`.

**When** three `POST /api/support-attachment-upload` requests are sent concurrently (via `Promise.all`) with the same `ticket_id` and `view_token`, each carrying a distinct PNG file
**Then** at most 3 attachment rows exist in `support_ticket_attachments` for this ticket when queried via service role after all three requests complete
**and** the responses collectively contain at most 3 `{ ok: true }` responses
**and** any response beyond the 3-attachment cap returns `{ "error": "attachment_limit_reached" }` with status 400

### Additional edge cases

### TC-41: Submitting `submit_support_ticket` RPC with `anon` role directly (not via service_role) is rejected

**Risk reference:** "RLS / RPC escape — anon DML on support tables"

**Prerequisites**:
- The Supabase project URL and anon key are available.
- Playwright project: `integration`.

**When** `submit_support_ticket` is called via a PostgREST RPC request authenticated only with the anon key (`apikey: <anon_key>`, no Authorization header)
**Then** the response is a 403 or a PostgreSQL exception with `unauthorized_role`
**and** no row is inserted into `support_tickets`

### TC-42: Immutability trigger blocks updating `subject` on an existing ticket

**Risk reference:** "Stored XSS in `body` / `subject`" (post-insert mutation path)

**Prerequisites**:
- A ticket row exists in `support_tickets`.
- An authenticated user who is the ticket's submitter is available (can UPDATE per the `support_tickets_update_locked` policy).
- Playwright project: `integration`.

**When** a PATCH is sent to `<SUPABASE_URL>/rest/v1/support_tickets?id=eq.<ticket_id>` with `{ "subject": "TAMPERED" }` and the submitter's JWT
**Then** the database raises `immutable_field_changed` (BEFORE UPDATE trigger)
**and** the `subject` column retains its original value when re-queried via service role

### TC-43: Attachment upload by a non-owner authenticated user (IDOR) returns 403

**Risk reference:** "IDOR on `request_attachment_signed_url`"

**Prerequisites**:
- A ticket exists owned by user A (seeded with `submitter_user_id = user_A_id`).
- A valid JWT for user B (different user, not admin) is available.
- Playwright project: `integration`.

**When** user B sends `POST /api/support-attachment-upload` with the ticket's UUID and their own JWT (no view_token)
**Then** the response status is 403
**and** the body contains `{ "error": "not_authorized" }`

### TC-44: `request_attachment_signed_url` RPC returns null for an attachment with `scan_status = 'error'`

**Risk reference:** "IDOR on `request_attachment_signed_url`"

**Prerequisites**:
- An attachment row exists with `scan_status = 'error'` (seeded via service role).
- An admin JWT with AAL2 is available.
- Playwright project: `integration`.

**When** an admin calls `request_attachment_signed_url('<attachment_uuid>')` for the error-status attachment
**Then** the RPC raises an exception with message containing `not_clean`
**and** no signed URL is returned
**and** no download link is shown in the `/admin/tickets/$id` detail view when opened in the browser

### TC-45: Storage bucket direct URL access without a signed URL returns 403

**Risk reference:** "Storage bucket public read"

**Prerequisites**:
- An attachment's `storage_path` is known (e.g. `<ticket_id>/<uuid>.png`).
- Playwright project: `integration`.

**When** an HTTP GET is sent directly to `<SUPABASE_URL>/storage/v1/object/support-attachments/<storage_path>` with only the anon key header
**Then** the response status is 400 or 403 (bucket is private; no public read policy)
**and** the file contents are not returned

### TC-46: `transition_ticket_status` rejects an illegal state-machine move (e.g. `new → resolved`)

**Prerequisites**:
- A ticket with `status = 'new'` exists.
- An admin JWT with AAL2 is available.
- Playwright project: `integration`.

**When** `transition_ticket_status('<ticket_id>', 'resolved', NULL)` is called directly by the admin
**Then** the RPC raises an exception with message containing `invalid_transition`
**and** the ticket's `status` remains `'new'` when re-queried

### TC-47: XSS payload in subject reaches the confirmation email as escaped text (not rendered HTML)

**Risk reference:** "Stored XSS in `body` / `subject`"

**Prerequisites**:
- The `supportTicketReceivedEmail` template is available for unit testing via `functions/_lib/email-templates.ts`.
- This TC runs as a Vitest unit test (project: `unit`), not a Playwright test; it is listed here for traceability.

**When** `supportTicketReceivedEmail({ ticketId: 'x', subject: '<script>alert(1)</script>', category: 'question', viewUrl: undefined })` is called
**Then** the returned `html` string does not contain `<script>alert(1)</script>` as raw markup
**and** the subject appears HTML-escaped (e.g. `&lt;script&gt;alert(1)&lt;/script&gt;`) or as a plain-text fallback
**and** the returned `text` string contains the literal `<script>alert(1)</script>` (plain text is safe by definition)

### TC-48: `view_token_hash` column CHECK constraint blocks a token hash that is not 64 lowercase hex characters

**Prerequisites**:
- Playwright project: `integration`.

**When** an INSERT into `support_tickets` via service role is attempted with `view_token_hash = 'not-a-hash'` (less than 64 chars, contains dashes)
**Then** the DB raises a CHECK constraint violation (the pattern `'^[0-9a-f]{64}$'` is enforced)
**and** no row is inserted

---

## Open questions

- **JBIG2Decode / JPXDecode rejection:** The PLAN security checklist lists "Reject the upload if any image stream `/Filter` array contains `JBIG2Decode` or `JPXDecode`" as a mitigation. The current `attachment-sanitize.ts` v1 does not implement this check — there is no `unsupported_filter` error code in `SanitizeError`. Before TC coverage for this can be written, the implementation must ship. Tracked as a known gap; a TC should be added here once the filter-rejection code lands.
- **`AdminTicketsQueuePage` POM:** The POMs `e2e/poms/support/KontaktPage.ts`, `e2e/poms/support/KontaktTicketViewPage.ts`, `e2e/poms/admin/AdminTicketsQueuePage.ts`, `e2e/poms/admin/AdminTicketDetailPage.ts`, and `e2e/poms/admin/AdminNotificationPreferencesPage.ts` do not exist yet. TC-33 through TC-35 require `AdminTicketsQueuePage` with a `searchInput` getter and a `searchResults` list locator. TC-37 requires `AdminTicketDetailPage` with a `subjectHeading` getter. These POMs must be created before the generator can emit the corresponding specs.
- **AAL1 admin JWT for TC-08:** Obtaining or mocking an AAL1 admin JWT in the integration project depends on whether the test DB allows signing tokens without TOTP completion. Confirm the integration test fixture strategy before the generator writes this spec.
- **Windows reserved filename (TC-30):** `CON.png` passes the current sanitiser regex `[A-Za-z0-9._-]+` unchanged. This is a known gap — the storage_path defence (server-generated UUID path) makes it moot in practice, but the test should assert and annotate this gap explicitly so it doesn't disappear from the security radar.
- **Email template XSS (TC-47):** This is a Vitest unit test, not a Playwright spec. The generator should route it to `tests/functions/email-templates-support.test.ts` rather than `e2e/`. Confirm the generator's routing rules for Vitest vs Playwright specs before submitting the plan to the generator.
