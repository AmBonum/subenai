# E48 — Support ticketing runbook

**Audience:** subenai admins / on-call. Operational reference for the
support contact form (`/kontakt`, `/app/help/contact`) and the admin
ticketing console (`/admin/tickets`).

**State of the runbook:** Phase A (sections §1–§5, §10) ship with the
schema foundation. Sections §6–§9, §11 are added incrementally as
phases B/C/D/E land. If you arrive at a missing section, the linked
story file (`tasks/stories/E48.x-*.md`) is the source of truth until
the runbook entry catches up.

---

## §1 — Schema overview

| Table | Purpose | Owner |
|---|---|---|
| `public.support_tickets` | One row per submitted request. Subject/body/email immutable post-insert (UPDATE policy + BEFORE UPDATE trigger). View-token-gated anonymous reads via `get_ticket_thread_for_view_token()`. | E48.1 |
| `public.support_ticket_messages` | Thread of user + admin + system messages on a ticket. `email_message_id` mirrors the Resend Message-Id for outbound replies. | E48.1 |
| `public.support_ticket_attachments` | Sanitised file metadata. `storage_path` points into the `support-attachments` private bucket. `scan_status` is `clean` once the deterministic sanitisation passes (no third-party AV per D-1). | E48.1 |
| `public.admin_notification_preferences` | Per-admin lazy-created row. Master `enabled`, `channels` jsonb (`{email, in_app}`), `per_category` jsonb, `digest_cadence` (instant/hourly/daily/off). | E48.1 |

Four RPCs handle every privileged operation (all SECURITY DEFINER):

| RPC | Caller | Gate |
|---|---|---|
| `submit_support_ticket(jsonb)` | CF function via service-role (anon) OR authenticated user | role branching; anon path NEVER sets `user_id` |
| `get_ticket_thread_for_view_token(uuid, text, text)` | anon-with-token OR authenticated | constant-time HMAC compare on token; audit-logged |
| `request_attachment_signed_url(uuid)` | admin only | role + `aal=aal2` + `scan_status='clean'`; audit-logged |
| `transition_ticket_status(uuid, status, text)` | admin only | role + AAL2 + state-machine validation |

Two triggers:

- `BEFORE UPDATE` on `support_tickets`: blocks edits to immutable
  columns (subject/body/email/name/view_token/category/source) and
  writes `audit_log` rows for status/assignee/deleted/archived/
  view_token_invalidated changes.
- `AFTER INSERT` on `support_tickets`: server-side notification
  fan-out — inserts `notifications` rows for every admin whose prefs
  opt them in (per-category + in-app channel), then fires
  `pg_notify('support_tickets_admin', …)` for live realtime updates.
  Server-side creation guarantees notifications cannot be lost when
  no admin browser tab is open.

State machine for `transition_ticket_status`:

```
new → in_progress
in_progress → waiting_user | resolved
waiting_user → in_progress | resolved
resolved → reopened | archived
reopened → in_progress
archived → reopened
```

---

## §2 — Secrets

Configured at the Cloudflare Pages → Settings → Environment
Variables panel; mirrored locally in `.env` (gitignored).

| Secret | Used by | How to obtain |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | E48.3 anti-spam on `/kontakt` | Cloudflare dashboard → Turnstile → Sites → Add site for `subenai.sk` → copy secret key |
| `VITE_TURNSTILE_SITE_KEY` | E48.3 client-side widget | Same panel, copy site key (NOT the secret) |
| `RESEND_API_KEY` | E48.5 / E48.8 — confirmation + admin reply emails | Already provisioned by E11.8. `resend.com/api-keys` → re-issue if rotation needed. |

No VirusTotal key in this epic — D-1 decided deterministic-only
sanitisation. If a future incident justifies adding it, see §5.

---

## §2b — Attachment pipeline (D-1 deterministic sanitisation, v1)

E48.2 ships the upload endpoint at `POST /api/support-attachment-upload`.
The pipeline (`functions/_lib/attachment-sanitize.ts`) is intentionally
**lighter than full image re-encoding**:

| Layer | What it does | Cost |
|---|---|---|
| Size cap | Rejects > 5 MB (matches DB CHECK) | ~free |
| MIME whitelist | Only `image/png`, `image/jpeg`, `application/pdf` | ~free |
| Magic byte verify | First 3-8 bytes must match declared MIME — blocks polyglots, spoofed `Content-Type` | ~free |
| Filename sanitiser | Reduces to `[A-Za-z0-9._\-]+`, max 200 chars; strips `../` traversal | ~free |
| **PDF script strip** | `pdf-lib` parses object tree, removes `/JS`, `/JavaScript`, `/AA`, `/OpenAction`, `/URI`, `/Launch`, `/SubmitForm`, AcroForm, EmbeddedFiles, RichMedia | ~ms |
| SHA-256 checksum | Audit trail + dedup | ~ms |

**TOCTOU race on the 3-per-ticket cap (closed 2026-05-22).** The CF
function pre-checks the existing attachment count via SELECT count(*)
before INSERT — three concurrent multipart POSTs against the same
`ticket_id` would each see count=0, all pass the `>= 3` guard, all
three insert. Migration `20260522100000_e48_2_attachment_cap_trigger.sql`
adds a BEFORE INSERT trigger (`enforce_attachment_cap_per_ticket_trg`)
that re-counts inside the transaction with `SELECT ... FOR UPDATE`,
serialising concurrent inserts on the same ticket_id; the 4th raises
`attachment_limit_reached` with ERRCODE `check_violation`, which the
CF function maps to the same friendly 400 response as the pre-check.
TC-40 in `specs/support/E48-security.md` covers the parallel-upload
case.

**What v1 does NOT do (deferred to v2):**

- Image re-encoding (would strip EXIF + ICC + foreign trailing bytes).
  Adding it requires a WASM image codec (`@jsquash/jpeg` +
  `@jsquash/png`, ~400 KB compressed) which is borderline for the CF
  Pages worker bundle budget. Today image bytes pass through unchanged
  after magic verify. Mitigations in place: the bucket is private +
  RLS-gated, files served via signed URLs only to ticket participants,
  and the magic-byte gate catches the most common attack class
  (polyglots / spoofed Content-Type).
- Image bomb caps (e.g. 25 MP after decode). Same reason — requires a
  WASM decoder.
- VirusTotal lookup. PLAN D-1 explicitly rules out third-party AV.

When (not if) you want to add image re-encoding, the work is:
1. Add `@jsquash/jpeg` + `@jsquash/png` deps (verify CF Pages bundle
   size budget — currently ~3 MB compressed, hard limit 25 MB on Free).
2. Extend `sanitizeAttachment()` to branch on `mime === "image/*"` and
   call the decoder → re-encoder pipeline.
3. Add test cases for: EXIF GPS strip, ICC profile strip, embedded
   thumbnail strip, polyglot trailing bytes strip.

## §3 — Threat model (deterministic-only attachment sanitisation)

E48.2 sanitisation does these structural transforms:

| Input | Transform | Coverage |
|---|---|---|
| PNG / JPEG | Decode + re-encode via `sharp` (or `@cf-wasm/sharp` if running in CF Workers). Output: PNG-from-PNG, JPEG-from-JPEG. EXIF, ICC, XMP, all metadata stripped. Image-bomb cap: refuse if >40 MP or >12000 px on either axis. | EXIF-stuffed payloads, embedded JavaScript in PNG metadata, ICC profile abuses, oversized decompression attacks |
| PDF | Re-save via `pdf-lib`, stripping `/JS`, `/JavaScript`, `/AA`, `/OpenAction`, `/Launch`, `/SubmitForm`, `/RichMedia`, `/3D`, `/Movie`, `/Sound`, `/EmbeddedFile`, `/Filespec`, `Names → EmbeddedFiles`. AcroForm scripts removed. `/URI` annotations stripped. PDF-bomb cap: refuse if >50 pages or any single page object >2 MB after re-save. | Embedded JS, auto-action JS, form-action scripts, file-embedded payloads, malicious URI annotations, page-flood DoS |
| Any | Magic-byte verification via `file-type`. Declared MIME must match the actual file signature. | MIME confusion (file claims `image/png`, actually `text/html` etc.) |
| PDF with `/Filter` containing `JBIG2Decode` or `JPXDecode` | **Reject** with `code: 'unsupported_filter'` | JBIG2/JPX decoder CVE chains in PDF viewers — `pdf-lib` preserves image streams verbatim, sanitisation cannot strip without rasterising, which we don't do for PDFs |
| Anything else | Reject at MIME-sniff | SVG (XSS via embedded JS), `application/octet-stream`, `text/html` |

### Residual risks accepted (per D-1)

1. **Steganographic payloads in valid PNGs/PDFs targeting specific
   viewer CVEs.** Deterministic re-encoding eliminates known structural
   attack vectors but cannot detect novel content-based exploits that
   target the *renderer* (the operator's image viewer / PDF reader).
   Mitigation: admin training treats attachments as untrusted; never
   inline-render (download-only with `Content-Disposition: attachment`).

2. **PDF feature drift.** New PDF spec features could introduce attack
   classes not in our strip list. Audit the strip list every 12 months
   against the latest PDF/A spec + recent CVE chains.

3. **Volume-based attacks.** Per-IP rate limit on `/kontakt` (3 per
   24h, see E48.3) is the primary defence; the per-ticket attachment
   cap (5 files) is the secondary. A motivated attacker with rotating
   IPs can still pile up storage — mitigation is a GDPR-cleanup cron
   that purges archived tickets >36 months old (E48.10 scope).

   **Required KV binding (audit A3, 2026-05-21).** The rate-limit
   counters in `functions/_lib/security.ts` switched from per-isolate
   `Map` storage to Cloudflare KV. Without a bound namespace, every
   isolate keeps its own counter — the "3/24h" cap reads more like
   "3/24h per isolate", which is many times the intended budget on a
   busy region. Steps to bind:

   1. Cloudflare dashboard → **Workers & Pages** → **KV** → **Create
      namespace** named `support_rate_limit` (use the same name across
      prod + preview).
   2. The project's **Pages** dashboard → Settings → **Functions** →
      **KV namespace bindings** → Add binding with **Variable name**
      `SUPPORT_RATE_LIMIT_KV` and select the `support_rate_limit`
      namespace.
   3. Save + redeploy. The handler logs no errors when unbound — it
      silently falls back to in-memory state — so verify the binding
      is live by checking the CF Pages deployment env in the
      "Functions / Bindings" tab.
   4. Same binding must exist on both **Production** and **Preview**
      environments for branch deploys to enforce limits.

   The KV reads cost ~1 µs each from the same region; the put cost
   is amortised over the rate-limit window. No measurable latency
   impact on `/api/support-ticket-create`.

If any production sample slips through these defences, escalate to §5
and consider adding VirusTotal or a ClamAV sidecar as defence-in-depth.

---

## §4 — Manually inspect an attachment

When an admin needs to look at an attachment outside the normal
download flow (forensic analysis, complaint review, scan_status=error
debugging):

1. **Supabase dashboard** → Project → Storage → `support-attachments` bucket.
2. Browse by `<ticket_id>/` folder. The `<ticket_id>` is visible in the
   admin URL `/admin/tickets/<ticket_id>`.
3. Click the object → "Download" — Supabase issues a one-time admin
   download URL. **Do not** share this URL; treat it as PII-bearing.
4. Open the downloaded file in a sandboxed viewer:
   - **PNG/JPEG:** any image viewer is fine; the file has been
     re-encoded and stripped of metadata.
   - **PDF:** open in a sandboxed viewer (browser's PDF viewer is
     adequate; **do NOT** open in Acrobat Reader if you can avoid it
     — Acrobat has a worse CVE history). Confirm no auto-action
     opens, no JS dialog, no embedded form submission.
5. After review, **log the manual access** by writing an `audit_log`
   row via Supabase SQL editor:

```sql
INSERT INTO public.audit_log (
  actor_id, actor_name, action, target_type, target_id, pii_access, details, at
) VALUES (
  auth.uid(),
  (SELECT display_name FROM public.profiles WHERE id = auth.uid()),
  'support_attachment_manual_inspection',
  'support_ticket_attachments',
  '<attachment_uuid>',
  true,
  jsonb_build_object('reason', '<short Slovak/English reason>', 'ticket_id', '<ticket_uuid>'),
  now()
);
```

The dashboard download does not auto-audit; the admin must.

---

## §5 — Adding VirusTotal later (forward pointer)

D-1 (PLAN) chose deterministic-only sanitisation to keep the deploy
surface small and avoid recurring cost. If real-world incidents justify
adding VirusTotal:

1. Re-add the columns we dropped in E48.1:
   ```sql
   ALTER TYPE public.support_attachment_scan_status ADD VALUE 'pending';
   ALTER TYPE public.support_attachment_scan_status ADD VALUE 'infected';
   ALTER TABLE public.support_ticket_attachments
     ADD COLUMN scan_provider text NOT NULL DEFAULT 'deterministic'
     CHECK (scan_provider IN ('deterministic', 'virustotal')),
     ADD COLUMN scan_result jsonb;
   ```
   Note: `ALTER TYPE ADD VALUE` is not transactional and not reversible.
2. Provision `VIRUSTOTAL_API_KEY` in `wrangler.toml` env.
3. Write `/functions/api/support-attachment-scan.ts` that polls
   `scan_status='pending'` rows via pg_cron, posts to VT `/files`
   endpoint, updates row with verdict.
4. Update upload function to set `scan_status='pending'` instead of
   `'clean'` for files that should be VT-scanned (e.g. only PDFs, or
   all of them).
5. Update `request_attachment_signed_url` to keep rejecting
   `<> 'clean'` — `pending` and `infected` are both not-clean.
6. Update `/admin/tickets/$id` UI to render pending/infected badges
   alongside the existing clean/error.

Plan a privacy-policy refresh (`/privacy` s6 third-parties list) and
a CHANGELOG entry before merging this follow-up.

---

## §10 — HMAC view-token secret rotation

Every anonymous ticket carries a 256-bit `view_token` returned in the
confirmation email. The token is SHA-256-hashed at insert time and
stored in `support_tickets.view_token_hash`. Lifetime: 90 days from
insert; revocable via `view_token_invalidated_at`.

### When to rotate

- A view-token URL appeared in a security-incident log (browser
  history dump, leaked email forward, server access log).
- Routine annual rotation as part of secrets hygiene.

### Procedure

The `view_token` is generated server-side via
`encode(gen_random_bytes(32), 'hex')` inside the
`submit_support_ticket()` RPC. There is no shared HMAC secret —
each token is a fresh random string. **Rotation = invalidate
outstanding tokens.**

To kill all currently-valid tokens:

```sql
UPDATE public.support_tickets
SET view_token_invalidated_at = now()
WHERE view_token_invalidated_at IS NULL
  AND view_token_expires_at > now();
```

Effect: every existing `view_token` URL returns "ticket not found /
token expired" on next click. Admins continue to access tickets
normally (RPC + RLS path is unaffected).

### Re-issuing for a specific ticket

If a single user lost their email and asks for a new view link:

```sql
-- Generate a fresh token + hash
WITH new_tok AS (
  SELECT encode(gen_random_bytes(32), 'hex') AS token
)
UPDATE public.support_tickets
SET view_token_hash = encode(digest((SELECT token FROM new_tok), 'sha256'), 'hex'),
    view_token_expires_at = now() + interval '90 days',
    view_token_invalidated_at = NULL
WHERE id = '<ticket_uuid>'
RETURNING (SELECT token FROM new_tok) AS plain_token;
```

Send `plain_token` to the user via secure channel (their verified
email) and discard from your terminal history immediately.

Audit-log the re-issue:

```sql
INSERT INTO public.audit_log (...) VALUES (
  auth.uid(), ..., 'support_ticket_view_token_reissued',
  'support_tickets', '<ticket_uuid>', true,
  jsonb_build_object('reason', '<short reason>'),
  now()
);
```

---

## §6 — Debugging a missing confirmation email

A submitter says "I never got the confirmation email." Walk the chain:

1. **Did the ticket land in the DB?**
   ```sql
   SELECT id, status, submitter_email, created_at
   FROM public.support_tickets
   WHERE submitter_email ILIKE '<email>'
   ORDER BY created_at DESC LIMIT 5;
   ```
   If no row: the submission never reached `submit_support_ticket()`.
   Check Cloudflare Pages function logs for `/api/support-ticket-create`
   (look for `turnstile_failed`, `rate_limited_*`, `category_invalid`).

2. **Did the email handler fire?** Email dispatch in
   `functions/api/support-ticket-create.ts` is **non-fatal** — a Resend
   outage doesn't roll back the row. Grep CF logs for
   `support-ticket-create email failed`. The error body Resend returned
   is logged alongside the ticket id.

3. **Is the recipient on Resend's suppression list?** Bounced or
   complained addresses get auto-suppressed. Check the Resend dashboard
   → Suppressions. Remove only after confirming the address is
   legitimate.

4. **Manually re-send.** If the row exists and email failed:
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "noreply@subenai.sk",
       "to": "<submitter_email>",
       "subject": "Vaša žiadosť bola prijatá",
       "html": "...",
       "idempotency_key": "support-ticket-received-<ticket_id>"
     }'
   ```
   The idempotency key prevents double-sends if you retry.

5. **Re-issue the view-token link** if the original token was
   compromised or never received: §10 *Re-issuing for a specific ticket*.

---

## §7 — When an admin reply email doesn't arrive

The admin clicked *Send reply* in `/admin/tickets/{id}`, the UI showed
the success toast, but the user reports no email.

1. **Did the message row + status flip land?**
   ```sql
   SELECT m.id, m.author_kind, m.created_at, t.status
   FROM public.support_ticket_messages m
   JOIN public.support_tickets t ON t.id = m.ticket_id
   WHERE m.ticket_id = '<ticket_uuid>'
   ORDER BY m.created_at DESC;
   ```
   If the admin row is there but `status` is still `in_progress`/`new`,
   the `transition_ticket_status` RPC failed silently — re-run from the
   admin UI's *Začať riešiť* / *Označiť ako vyriešené* buttons until
   the state machine reaches `waiting_user`.

2. **Email dispatch is non-fatal in this handler too.** Check CF logs
   for `support-ticket-reply email failed (message already saved)`.
   The log includes `ticket_id` + `message_id` + Resend's error string.

3. **The reply email has no view link if the view-token has been
   invalidated or expired.** This is by design — once the submitter
   creates an authenticated account and the admin invalidates the token
   per §10, future replies use the user's `/app/help` thread instead.
   Confirm the email body still contains the prose response even
   without the link.

4. **Manual re-send**: the idempotency key is
   `support-ticket-reply-<message_id>`. Reuse it via the same Resend
   curl pattern as §6 step 4.

---

## §8 — Adjusting per-admin notification settings

> **Hard rule (D-5):** admins cannot edit another admin's notification
> preferences. The RLS policy `admin_notification_preferences_owner_*`
> enforces `user_id = auth.uid()`. There is **no service-role override
> path** in the UI — and there shouldn't be: notification routing is a
> personal preference, not a compliance-bearing setting.

If a colleague is overwhelmed by notifications and asks for help:

1. **Walk them to `/admin/settings/notifications`** (sidebar →
   *Nastavenia* → card *Upozornenia z podpory* → button *Otvoriť
   nastavenia upozornení*).

2. **Suggested defaults by role:**
   - On-call only: `enabled=true`, `channels.email=true`,
     `channels.in_app=true`, `digest_cadence=instant`, all categories on.
   - Daily triage: `digest_cadence=daily` (09:00 Europe/Bratislava).
   - Vacation: `enabled=false` — single switch off.
   - GDPR-only escalation queue: leave only `gdpr` + `abuse_report`
     toggles on.

3. **Confirm the row exists** if they expect emails but get none:
   ```sql
   SELECT enabled, channels, per_category, digest_cadence
   FROM public.admin_notification_preferences
   WHERE user_id = '<admin_user_id>';
   ```
   No row → they have never visited the page; the in-app fan-out
   trigger defaults to *all categories on* per the
   `COALESCE(..., true)` in `enqueue_admin_notifications_for_ticket()`.

4. **Cron dispatcher for hourly/daily digests is a forward pointer**
   — not yet wired. Until shipped, `digest_cadence` only affects which
   admins are eligible for instant emails (any value other than `off`
   results in instant delivery). When the dispatcher lands, this
   section will be updated with the cron schedule + back-off rules.

---

## §9 — Running E48 tests locally

The E48 test surface spans schema asserts, function contract tests,
component tests, and CF function tests:

```bash
# Whole E48 suite
npx vitest run \
  tests/db/support-tickets-schema.test.ts \
  tests/db/support-storage-bucket.test.ts \
  tests/components/SupportContactForm.test.tsx \
  tests/components/admin/AdminNotificationPreferences.test.tsx \
  tests/functions/support-ticket-create.test.ts \
  tests/functions/support-ticket-reply.test.ts \
  tests/functions/email-templates-support.test.ts \
  tests/routes/kontakt-ticket-view.test.tsx
```

Schema tests are **string-asserts over the migration SQL file** — they
don't need a live Postgres. CF function tests stub `fetch` to intercept
each Supabase REST endpoint and the Resend API by URL pattern (see
`tests/functions/support-ticket-create.test.ts` for the canonical
shape). Component tests use the shared `tests/utils/admin-query-wrapper.tsx`
helper to wrap with a fresh `QueryClient` per test.

For real DB integration (RLS shape, FSM enforcement, view-token hash
validation), see the integration section in
`tasks/stories/E48.10-test-pyramid-and-security.md`.

---

## §11 — Escalating an `abuse_report` ticket to legal

`category=abuse_report` is the only category whose handling has a
mandated chain of custody:

1. **Do not reply from the admin UI directly.** A reply changes status
   to `waiting_user` and notifies the reporter — premature disclosure
   if legal still needs the report under wraps.

2. **Set status to `in_progress` via *Začať riešiť*** (this audit-logs
   the assignment without any external side-effects).

3. **Dump the thread + attachments to legal**:
   ```sql
   SELECT to_jsonb(t.*) - 'view_token_hash' AS ticket,
     (SELECT jsonb_agg(to_jsonb(m.*)) FROM public.support_ticket_messages m
       WHERE m.ticket_id = t.id) AS messages,
     (SELECT jsonb_agg(to_jsonb(a.*)) FROM public.support_ticket_attachments a
       WHERE a.ticket_id = t.id) AS attachments
   FROM public.support_tickets t
   WHERE t.id = '<ticket_uuid>';
   ```
   Hand the JSON over via the existing legal escalation channel
   (1Password "Legal escalations" vault, NOT email or chat).

4. **Invalidate the view-token** (§10 *Re-issuing for a specific
   ticket* but without re-issuing — set
   `view_token_invalidated_at = now()`) so the reporter cannot watch
   the thread evolve. They will still receive the eventual outcome
   email manually drafted by legal counsel.

5. **Resolve only after legal sign-off.** Resolution note must include
   the legal escalation case number — it's captured in the audit log
   `support_ticket_status_changed.note` field via
   `transition_ticket_status(p_note := 'legal case #...')`.
