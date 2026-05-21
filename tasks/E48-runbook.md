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

## §§ to be filled in by later phases

- **§6 — Debugging a missing confirmation email** (E48.5)
- **§7 — When an admin reply email doesn't arrive** (E48.8)
- **§8 — Adjusting per-admin notification settings** (E48.9)
- **§9 — Running E48 tests locally** (E48.10)
- **§11 — Escalating an `abuse_report` ticket to legal** (E48.11)

Each section will be added by the closing story of its phase. If you
need one now, see the corresponding story file under
`tasks/stories/E48.*.md`.
