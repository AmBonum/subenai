# E48 — Support ticketing test coverage matrix

**Date:** 2026-05-21
**Scope:** every feature surface in `tasks/PLAN-2026-05-21-E48-support-contact-ticketing.md`
mapped to the test layer that should own it, with gaps flagged for PR #C.

Layer legend:

- **U** = pure-unit Vitest (no env)
- **VC** = Vitest contract (string-grep over migration SQL)
- **VF** = Vitest function (CF handler with `fetch` stub)
- **VR** = Vitest React (component / route render under jsdom)
- **PB** = Playwright browser e2e (full UI flow)
- **PI** = Playwright integration (HTTP against running app, no UI)
- **DB** = live-Supabase test (service-role or `audit-bot`, asserts RLS / RPC at runtime)
- **MON** = production monitoring (Sentry / CF logs / pg_cron alert)

---

## 1. Feature surface inventory

| # | Surface | AC source | Current coverage | Risk | Gap |
|---|---|---|---|---|---|
| 1 | Migration: enums + tables + CHECKs | E48.1 AC-1..AC-4 | VC: `tests/db/support-tickets-schema.test.ts` (84 asserts) | H | no |
| 2 | Migration: `ENABLE RLS` on all 4 tables | E48.1 AC-5 | VC: schema test (per-table grep) | H | no |
| 3 | RLS: `REVOKE ALL FROM anon` on 3 ticketing tables | PLAN §RLS, C-S1 | VC only — no live-DB proof | C | **partial** |
| 4 | RLS policy: `support_tickets_user_select` (own rows) | PLAN §RLS | VC name-grep | C | **partial** (no live DB) |
| 5 | RLS policy: `support_tickets_user_insert` WITH CHECK uid match | PLAN §RLS | VC name-grep | C | **partial** |
| 6 | RLS policy: `support_tickets_update_locked` (immutable subject/body/email) | PLAN §RLS, H-DB4 | VC: trigger-body grep | C | **partial** (no live DB) |
| 7 | RLS policy: `admin_notification_preferences_owner_*` (no admin-of-admin override) | E48.9, D-5 | VC name-grep | M | **partial** |
| 8 | Storage `support-attachments` bucket private + RLS | E48.2 AC-1 | VC: `tests/db/support-storage-bucket.test.ts` | C | **partial** (no live anon-GET-403 proof) |
| 9 | RPC `submit_support_ticket` — service-role branch (anon) | E48.1 AC-7, PLAN §RPCs | VC body-grep + VF: ticket-create.test.ts via RPC stub | C | **partial** (live DB call missing) |
| 10 | RPC `submit_support_ticket` — authenticated branch (uid match) | E48.4 AC-3 | VC + VF (forwards JWT) | H | **partial** |
| 11 | RPC `submit_support_ticket` — server-side `view_token` gen | PLAN C-S1 | VC grep `gen_random_bytes(32)` | C | **partial** (no live RPC roundtrip) |
| 12 | RPC `get_ticket_thread_for_view_token` — constant-time HMAC compare | PLAN §RPCs | none — not directly tested | C | **yes** |
| 13 | RPC `get_ticket_thread_for_view_token` — expired token rejected | PLAN §RPCs, H-S3 | VR: `kontakt-ticket-view.test.tsx` mocks null return | H | **partial** |
| 14 | RPC `get_ticket_thread_for_view_token` — invalidated token rejected | H-S3 | VF: `support-attachment-upload.test.ts` covers via lookup | H | **partial** |
| 15 | RPC `request_attachment_signed_url` — admin + AAL2 + clean-only | E48.2 AC-6, D-9 | VC body-grep only | C | **yes** (no live or VF call) |
| 16 | RPC `transition_ticket_status` — state machine legality | PLAN §RPCs | VC body-grep `new→in_progress`, `resolved→reopened|archived` | H | **partial** (no exhaustive enumeration) |
| 17 | Trigger `BEFORE UPDATE` blocks immutable-field edits | H-DB4 | VC body-grep | H | **partial** (no live DB UPDATE-rejected proof) |
| 18 | Trigger `AFTER INSERT` server-side notification fan-out | H-S4 | VC body-grep | H | **partial** |
| 19 | POST `/api/support-ticket-create` — happy path anon | E48.3 AC-3 | VF: 17 cases incl. ticket_id+view_token return | H | no |
| 20 | POST `/api/support-ticket-create` — Turnstile fail | E48.3 AC-3 | VF: `rejects Turnstile failure` | H | no |
| 21 | POST `/api/support-ticket-create` — honeypot non-empty | E48.3 AC-3 | VF: `silently discards honeypot` | M | no |
| 22 | POST `/api/support-ticket-create` — per-IP rate limit | E48.3 AC-3 | VF: `rate limits after the per-IP daily cap` | H | **partial** (no live KV proof) |
| 23 | POST `/api/support-ticket-create` — per-user rate limit (auth) | E48.4 AC-3 | VF: `rate-limits per user (not per IP)` | M | no |
| 24 | POST `/api/support-ticket-create` — Resend email dispatch + non-fatal | E48.5 AC | VF: 4 email cases (with/without view link, fail-soft, no env) | M | no |
| 25 | POST `/api/support-ticket-create` — field validation (subject, body, email, category) | E48.3 AC-3 | VF: 4 cases | H | no |
| 26 | POST `/api/support-attachment-upload` — happy PNG | E48.2 AC-3..AC-5 | VF: 14 cases | H | no |
| 27 | POST `/api/support-attachment-upload` — magic-byte mismatch / polyglot reject | E48.2 AC-4 | VF + U (`attachment-sanitize.test.ts` 32 cases) | C | no |
| 28 | POST `/api/support-attachment-upload` — JWT-auth path (auth users) | E48.4 | VF: `authorizes JWT user who owns the ticket` | H | no |
| 29 | POST `/api/support-attachment-upload` — anon view_token path | E48.3 | VF: 3 token cases (mismatch/expired/invalidated) | H | no |
| 30 | POST `/api/support-attachment-upload` — per-ticket 3-file cap | E48.2 AC-3 | VF: `rejects when attachment limit (3) already reached` | M | no |
| 31 | PDF JS / OpenAction / AcroForm strip | E48.2 AC-4, PLAN §3 | U: 4 dedicated `attachment-sanitize.test.ts` cases | C | **partial** (no JBIG2/JPX `unsupported_filter` reject test) |
| 32 | Filename sanitiser — path traversal / unicode / extension | M-S1 | U: 11 dedicated cases | C | no |
| 33 | SHA-256 checksum deterministic | E48.2 AC-5 | U: 2 cases | L | no |
| 34 | POST `/api/support-ticket-reply` — auth + AAL2 + admin gate | E48.8 | VF: 5 cases (401/403 path) | C | no |
| 35 | POST `/api/support-ticket-reply` — message insert + state flip + Resend out | E48.8 | VF: 5 happy/insert cases | H | no |
| 36 | POST `/api/support-ticket-reply` — Resend non-fatal | runbook §7 | VF: `skips email dispatch when RESEND_API_KEY is missing` | L | no |
| 37 | Email templates: `supportTicketReceivedEmail` Slovak rendering | E48.5 | VF: `tests/functions/email-templates-support.test.ts` (14 cases) | M | no |
| 38 | Email templates: `supportTicketReplyEmail` | E48.5 | VF: covered | M | no |
| 39 | Email templates: `supportTicketResolvedEmail` | E48.5 | VF: covered | M | no |
| 40 | `<SupportContactForm>` component — Slovak labels + 7 category options | E48.3 AC-2 | VR: 19 cases | M | no |
| 41 | `<SupportContactForm>` — honeypot off-screen + tabindex=-1 + aria-hidden | E48.3 AC-2 | VR: covered | M | no |
| 42 | `<SupportContactForm>` — char counter + a11y label assoc | E48.3 AC-8 | VR: covered | L | no |
| 43 | `<SupportContactForm>` — attachment picker + per-file error | E48.3 AC-2 | VR: covered | M | no |
| 44 | `<SupportContactForm>` — authenticated variant pre-fill + read-only | E48.4 AC-2 | VR: covered | M | no |
| 45 | `/kontakt` route SEO (title/meta/JSON-LD/canonical) | E48.3 AC-1, AC-9 | none in tests/seo/ | M | **yes** |
| 46 | `/kontakt/odoslane` success page | E48.3 AC-4 | none | L | **yes** |
| 47 | `/kontakt/ticket/$id` thread render | E48.3 AC-5 | VR: 5 cases (`kontakt-ticket-view.test.tsx`) | H | no |
| 48 | `/kontakt/ticket/$id` — missing/expired/invalidated token state | E48.3 AC-5 | VR: 3 cases | H | no |
| 49 | `/admin/tickets` index — table + columns + sort | E48.6 AC-2 | none | H | **yes** |
| 50 | `/admin/tickets` index — filter chips (status/category/scan/assignee) | E48.6 AC-3 | none | H | **yes** |
| 51 | `/admin/tickets` index — full-text search debounced | E48.6 AC-4 | none | M | **yes** |
| 52 | `/admin/tickets` index — pagination + count | E48.6 AC-5 | none | L | **yes** |
| 53 | `/admin/tickets` index — empty state + clear filters | E48.6 AC-7 | none | L | **yes** |
| 54 | `/admin/tickets` index — realtime new-ticket toast | E48.6 AC-10 | none | M | **yes** |
| 55 | `/admin/tickets/$id` sticky header + status badge | E48.7 AC-2 | none | M | **yes** |
| 56 | `/admin/tickets/$id` thread render (user/admin/system messages) | E48.7 AC-3 | none | H | **yes** |
| 57 | `/admin/tickets/$id` status transition buttons via ConfirmDialog | E48.7 AC-4 | none | C | **yes** |
| 58 | `/admin/tickets/$id` reply composer | E48.7 AC-5 | none | H | **yes** |
| 59 | `/admin/tickets/$id` attachment chip — clean/error/pending render | E48.7 AC-3, AC-7 | none | H | **yes** |
| 60 | `/admin/tickets/$id` clean-attachment download (signed URL + audit) | E48.7 AC-6 | none | C | **yes** |
| 61 | `/admin/tickets/$id` realtime cross-admin update | E48.7 AC-10 | none | L | **yes** |
| 62 | `<AdminNotificationPreferences>` — master/channel/cadence/categories | E48.9 AC-2 | VR: 8 cases | M | no |
| 63 | `<AdminNotificationPreferences>` — dirty bar, discard, full-payload submit | E48.9 AC-2 | VR: covered | M | no |
| 64 | Realtime channel `support_tickets_admin` subscription in shell | E48.9 AC-4 | none | M | **yes** |
| 65 | Sidebar badge counter (unread support notifications) | E48.9 AC-6 | none (`AdminSidebar.test.tsx` doesn't cover support badge) | M | **yes** |
| 66 | Lazy-creation of `admin_notification_preferences` row | E48.9 AC-7 | none | L | **yes** |
| 67 | pg_cron `support-notify-admins` digest dispatcher | E48.9 AC-5 | none (still forward pointer per runbook §8) | M | **yes** |
| 68 | pg_cron auto-archive 90-day-resolved | D-7, E48.10 | none | L | **yes** |
| 69 | CSP — `https://challenges.cloudflare.com` in `script-src`/`frame-src` for `/kontakt` only | E48.3 AC-6, D-10 | none in `tests/security/csp-*` | H | **yes** |
| 70 | Robots `index, follow` for `/kontakt`; `noindex` for thread/odoslane | E48.3 AC-1, AC-4, AC-5 | none in `tests/seo/` | L | **yes** |
| 71 | End-to-end: anon submit → admin reply → user email | E48.10 AC-6 | none — `e2e/specs/support/` does not exist | C | **yes** |
| 72 | E2E POMs (`KontaktPage`, `AdminTicketsIndexPage`, etc.) | E48.10 AC-8 | none — `e2e/poms/support/` does not exist | H | **yes** |
| 73 | Seed/cleanup SQL (`seed-e48-tickets.sql`, `cleanup-e48-tickets.sql`) | E48.10 AC-1, AC-2 | none | H | **yes** |
| 74 | Security fuzz suite — SQL injection / XSS bait / path traversal / JWT tamper / view-token replay | E48.10 AC-7 | none | C | **yes** |
| 75 | GDPR Art. 17 cascade — delete user → tickets + attachments + storage objects | privacy s6, E48.11 | none | H | **yes** |
| 76 | Audit log row written on every status transition / attachment URL / reply | E48.7 AC-8 | VC body-grep | M | **partial** |
| 77 | Production: Resend bounce / suppression handler | runbook §6 | MON only | L | n/a (monitoring) |
| 78 | Production: Realtime channel `CLOSED` for > 2 min indicator | E48.9 AC-9 | none | L | **yes** |

---

## 2. Test layer assignment rationale (for gaps + partials)

The current E48 suite leans heavily on **VC string-grep** of the migration. That
proves the *intent* is committed to SQL but not that Postgres *enforces* it.
Several CRITICAL rows (3, 4, 5, 15, 57, 60, 74) need a live-DB proof to be
trustworthy. Assignments:

- **Surfaces 3–7, 17 (RLS + immutability triggers)** → **DB**. A grep cannot
  catch a typo in the policy expression (`USING (submitter_user_id = auth.uid())`
  vs `auth.uid()::text = submitter_user_id::text`). Spin up a service-role
  client + an anon client + an `audit-bot` client; do positive (allowed) and
  negative (denied) reads/writes. Reuse the existing `edu-rls-lockdown.test.ts`
  shape. Cleanup with `DELETE WHERE subject LIKE 'E48_TEST_%'`.
- **Surface 8 (Storage bucket privacy)** → **DB**. Anonymous fetch of
  `/storage/v1/object/public/support-attachments/...` must return 403. One HTTP
  call from the test runner is enough; cheaper than parsing policy SQL.
- **Surfaces 9–18 (RPC behaviour)** → **DB**. RPC bodies are the security
  boundary for anonymous writes. Test happy paths AND the negative cases
  (anon calling `transition_ticket_status` = denied; non-AAL2 admin calling
  `request_attachment_signed_url` = denied; expired view-token returns null;
  invalid state transition raises). Two test files: `tests/db/support-rpcs.test.ts`
  + `tests/db/support-rls-lockdown.test.ts`.
- **Surfaces 12, 14 (view-token HMAC)** → **DB**. Constant-time compare is
  hard to verify from logs; a DB test that calls the RPC with a known good
  hash and a one-bit-flipped hash is the cheapest proof.
- **Surface 22 (rate-limit live KV)** → **PI**. The VF test stubs KV; the
  KV namespace itself can be misconfigured in `wrangler.toml`. One Playwright
  integration call that POSTs 4× from a fixed IP and asserts the 4th gets
  429 closes the gap. Don't promote this to **PB** — the test doesn't need
  a browser.
- **Surfaces 45, 46, 47–48 (`/kontakt` SEO + thread view)** → **VR** for
  meta/JSON-LD/robots assertions (extend `tests/seo/seo-meta.test.ts`),
  **PB** for the cross-page flow.
- **Surfaces 49–61 (admin tickets index + detail UI)** → **VR** for the
  component-level slicing (filters, empty state, ConfirmDialog severity, reply
  send, badge render). Keep PB minimal — one happy-path spec per page is
  enough. Component tests are 10× faster and find regressions before CI fans out.
- **Surface 57 (ConfirmDialog severity for destructive actions)** → **VR**.
  Assert the dialog renders with `severity="destructive"` for delete /
  archive, and that `data-testid="admin-ticket-action-delete"` requires
  typed-confirm of the subject (CLAUDE.md non-negotiable).
- **Surface 60 (signed-URL download)** → **DB + PB**. DB asserts the RPC
  refuses non-clean / non-AAL2 / non-admin; PB asserts the chip is
  clickable only when scan_status='clean' and opens with
  `Content-Disposition: attachment`.
- **Surface 64 (Realtime channel subscription)** → **VR** with a stubbed
  Supabase Realtime client (the channel callback fires → toast appears →
  query invalidates). Live realtime in CI is flaky; do it as **PB** smoke
  only on staging.
- **Surfaces 67, 68 (pg_cron jobs)** → **DB**. Run the worker function
  directly via SQL (`SELECT public.support_notify_admins_tick();`) against
  a seeded dataset, assert the right rows changed. Don't wait for the
  cron itself — that's **MON**.
- **Surface 69 (CSP)** → **U**. The existing `tests/security/headers-contract.test.ts`
  shape parses `public/_headers` and asserts the directive table; add a row.
  No need for a live browser load.
- **Surface 71 (end-to-end)** → **PB**, single multi-actor spec.
- **Surface 74 (fuzz)** → mostly **VF** (path-traversal, MIME confusion,
  JWT tamper); some **DB** (SQL injection through search → uses
  parameterised queries, verify with a `'; DROP TABLE` subject). View-token
  replay = **DB**.
- **Surface 75 (GDPR cascade)** → **DB**. Set up a user, ticket, attachment,
  storage object; trigger Art. 17 deletion; assert nothing dangles.

Layer principle: **the closer the test is to the assertion subject, the
cheaper the regression-discovery loop.** Live-DB tests are slower than
Vitest but cheaper than a 4-minute Playwright run; reserve **PB** for
truly user-visible cross-component flows.

---

## 3. Hard gaps prioritised (PR #C backlog)

| Rank | Severity | Gap | Test cases that close it |
|---|---|---|---|
| 1 | C | RLS lockdown not proven against a live Postgres (anon DML revoked, owner-only `admin_notification_preferences`) — surfaces 3–7 | `tests/db/support-rls-lockdown.test.ts`: anon INSERT into each of 3 tables → permission denied; anon SELECT → empty; authenticated user A reads user B's ticket → empty; admin A reads admin B's prefs → permission denied; UPDATE subject on own ticket as authenticated → blocked by immutability trigger. |
| 2 | C | RPC `request_attachment_signed_url` not tested for AAL2 / clean-only enforcement — surface 15, 60 | `tests/db/support-rpcs.test.ts`: anon calls → permission denied; AAL1 admin → `not_aal2`; admin AAL2 against `scan_status='error'` → `not_clean`; admin AAL2 against `clean` row → returns URL with 15-min TTL + audit_log row written. |
| 3 | C | End-to-end multi-actor flow does not exist — surface 71 | `e2e/specs/support/support-end-to-end.spec.ts`: anon submits `/kontakt`; service-role helper reads the new ticket; admin signs in (audit-bot promoted via fixture), opens detail, clicks Začať riešiť (ConfirmDialog confirm), types reply, sends; integration helper asserts Resend was called + `support_ticket_messages` row landed + status flipped to `waiting_user`. Seeded + cleaned per E48.10 AC-1/AC-2. |
| 4 | C | Security fuzz suite missing — surface 74 | `tests/security/support-ticket-fuzz.test.ts`: 100 random payloads → no 5xx; SQLi bait in subject + body → search returns rows but DB intact; XSS bait → admin UI renders text-safe (assert HTML escaping at SupportTicketDetail render); path traversal `../../etc/passwd` → filename sanitiser strips; MIME confusion (HTML claiming PNG) → magic-byte reject; modified `aal` JWT → 403; view-token-A used with ticket-B → 404; `X-Forwarded-For` rotation → KV still bucketed by CF-Connecting-IP. |
| 5 | H | CSP regression risk: `/kontakt` opens Turnstile origin in `script-src`/`frame-src` — surface 69 | Extend `tests/security/headers-contract.test.ts`: assert the per-route `_headers` block for `/kontakt` whitelists `https://challenges.cloudflare.com` and assert no other route inherits it. |
| 6 | H | No coverage of `SupportTicketsQueue` / `SupportTicketDetail` React components — surfaces 49–61 | `tests/components/admin/SupportTicketsQueue.test.tsx`: 1k-row fixture, filter chips toggle, search debounce, empty state. `tests/components/admin/SupportTicketDetail.test.tsx`: status-transition button → ConfirmDialog with correct `severity`; reply composer → calls reply endpoint; attachment chip clean → request_attachment_signed_url → window.open with `_blank` + `Content-Disposition` header asserted via fetch stub; attachment error → tooltip text matches AC-7. |
| 7 | H | E2E POMs not authored — surface 72 | 8 POM files per E48.10 AC-8; specs use POM getters only (CLAUDE.md POM rule). Don't merge any new PB spec without its POM. |
| 8 | H | Seed + cleanup SQL not authored — surface 73 | `supabase/scripts/seed-e48-tickets.sql` (7 tagged rows per E48.10 AC-1); `cleanup-e48-tickets.sql` deletes by `subject LIKE 'E48_TEST_%'` + storage objects under the same prefix. Both idempotent. |
| 9 | H | Per-IP rate-limit not proven against live KV — surface 22 | `e2e/integration/support/rate-limit.spec.ts`: 4 POSTs from a fixed IP within 24h, 4th returns 429 `rate_limited_ip`. Reset KV namespace in `afterAll`. |
| 10 | H | GDPR Art. 17 cascade not proven — surface 75 | `tests/db/support-gdpr-cascade.test.ts`: create user + ticket + 2 attachments + 2 storage objects; call existing Art. 17 RPC on the user; assert 0 rows in `support_tickets` for that submitter_user_id, 0 attachment rows (FK cascade), 0 storage objects under the ticket prefix. Storage cleanup may need a follow-up trigger if not already wired — flag as runbook §12. |

These ten close every CRITICAL row and the highest-impact HIGH rows. The
remaining HIGH rows (54, 55, 56, 58, 59) are pure UI and can stack into
two component-test files (rank 6).

---

## 4. Test pyramid health check

**Observed counts in the E48 surface today** (E48 files only, `it()` blocks):

| Layer | Files | Cases | Share |
|---|---|---|---|
| U (pure unit, e.g. `attachment-sanitize.test.ts`) | 1 | 32 | 26 % |
| VC (schema string-grep) | 2 | ~28 | 23 % |
| VF (CF function with fetch stub) | 4 | 60 | 49 % |
| VR (React component / route) | 3 | 32 | 26 % |
| DB (live Supabase) | 0 | 0 | 0 % |
| PI (Playwright API) | 0 | 0 | 0 % |
| PB (Playwright browser) | 0 | 0 | 0 % |
| MON | n/a | n/a | n/a |

*(Shares overlap because some files contain mixed-layer cases; the column
gives a sense of weight, not a strict partition.)*

**Shape:** the pyramid is **stunted at the top and missing the
ground-truth layer.** Almost all confidence today comes from
function-handler tests with mocked Supabase + mocked Resend. They prove
the handler logic is internally consistent, not that the *system* works.
There is:

- zero live-DB coverage — every RLS / RPC claim is a string-grep promise.
- zero Playwright e2e — the user-visible flow (`/kontakt` submit → email
  → admin reply → user inbox) has never executed in CI.
- zero security fuzz — the threat-model table in PLAN §"Security review
  checklist" is documentation, not enforcement.

**Senior recommendation:**

1. **Add the DB layer first, not the PB layer.** Two test files
   (`support-rls-lockdown.test.ts`, `support-rpcs.test.ts`) close eight
   of the ten CRITICAL/HIGH gaps. They run in ~5–10 s against a live
   project and don't carry the flake cost of a browser. This is the
   highest information-per-second bet available.
2. **Then add ONE end-to-end PB spec, not many.** Rank-3 closes the
   integration-bug class for the price of one slow spec. Resist the
   urge to write a PB spec per page — the component tests in rank 6
   give you faster feedback on UI regressions; PB is for the multi-
   actor scenario the component layer cannot fake.
3. **The fuzz suite is cheap-per-bug.** Rank-4 is mostly VF + a couple
   of DB cases; it's ~1 file, ~25 cases, ~3 s runtime. Highest
   bugs-found-per-line in the backlog.
4. **Don't grow the VF layer further before the DB layer exists.**
   Adding more VF cases on top of an unverified Supabase contract gives
   diminishing returns — you're just exercising the stub.
5. **VC tests are correct as a *change-detection* signal, not a
   *correctness* signal.** Keep them; their value is that a future
   migration edit forces a conscious decision. But never count them
   as proof of behaviour.

Target shape after PR #C lands:

| Layer | Target cases | Why |
|---|---|---|
| U | 35 | unchanged |
| VC | 28 | unchanged |
| VF | 60 | unchanged |
| VR | 60 | + admin components (rank 6), + SEO assertions |
| DB | 30 | RLS lockdown, RPC behaviour, GDPR cascade, cron worker (ranks 1, 2, 10) |
| PI | 5 | rate-limit, storage 403, robots, CSP, redirects (rank 9) |
| PB | 1–2 | rank 3 only; do not exceed |
| MON | Sentry alert on `support-ticket-create email failed` log line | runbook §6 |

That distribution restores a classic pyramid — broad fast unit layer,
narrower live-DB middle, single deep e2e — and closes every CRITICAL
gap without inflating CI time beyond ~90 s for the E48 suite.
