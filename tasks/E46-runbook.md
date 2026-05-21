# E46 — Admin runbook: fulfilling GDPR requests

**Created:** 2026-05-21
**Audience:** SubenAI admin / DPO / on-call operator
**Scope:** Procedures for handling every GDPR Art. 15–22 request that reaches us via `/admin/dsr`, e-mail, or paper letter.
**State of tooling (v1.14.3):** All 5 GDPR rights are end-to-end via `/admin/users/<id>` for the MVP scope — Art. 15 export, Art. 16 rectification (`profiles.display_name` today; extending to more fields is a 1-commit drop-in), Art. 17 anonymise, Art. 17 hard-delete with 5-min grace window + auto-execute via pg_cron `pending-erasures-flush` (runs every minute). The *Emergency hard-delete* path at the bottom retracts to regulator-order use only.

This runbook complements `/privacy` section 5 (the public-facing disclosure) — that document tells the data subject *what we do*; this one tells the operator *how to do it*.

---

## 0. Prerequisites

Before opening any dossier:

- Sign into `/admin` with your AAL2 (TOTP) factor — every dossier action is gated on AAL2.
- Confirm the requesting party is who they claim to be. We don't process anonymous requests via this surface. Identity proof = e-mail-OTP loop **AND** one secondary signal (last login IP correlation, account-specific question, payment method on file). Document the proof in the DSR's `note` field before performing any action.
- If the request arrived outside `/admin/dsr` (e-mail, paper), create the DSR record first via `/app/legal/dsr` under your own admin session **with the data subject's e-mail** — this creates the audit anchor for the 30-day SLA clock.

The SLA clock starts the moment we receive the request, not when we open the dossier. Treat the dossier as the *fulfilment* surface, not the *receipt* surface.

---

## 1. Art. 15 — Right of access (export the user's data)

Most common request. Read-only, no destructive action.

1. Open `/admin/dsr`, locate the request (status = *open* or *in_progress*).
2. Click the *Otvoriť GDPR dossier* icon on the row. (If disabled — see *Non-registered subjects* below.)
3. On the dossier, click *Stiahnuť Art. 15 JSON*. The browser downloads `dossier-<userId>-<timestamp>.json` containing every record we hold about this user across identity, preferences, role, DSR history, DPA history.
4. **Verify the export** — open the JSON locally, sanity-check that the `subject.email` matches the requester. If anything looks off (wrong user, empty payload), stop and escalate.
5. Send the JSON to the requester via the verified channel (typically the same e-mail address that submitted the DSR). Encrypt the attachment if the requester provided a PGP key; otherwise password-protect the ZIP and deliver the password through a second channel (SMS to the phone number we have on file, or magic-link to a one-time bucket).
6. Mark the DSR `completed` via *Uzavrieť*. The `completed_at` timestamp + your admin identity are auto-written to `audit_log`.

**SLA:** 30 days from receipt. Most Art. 15 requests should resolve in under 1 hour of operator time.

---

## 2. Art. 16 — Right to rectification (fix inaccurate data)

### 2a. For `profiles.display_name` (the MVP path — preferred)

1. Open the dossier as above. Read the requester's `note` to identify what field needs correcting.
2. Cross-check that the requested correction is **factually verifiable** — e.g. a typo in `display_name` is fine; changing `email` is not (we require self-service via `/app/account/profile` for e-mail changes per E46 D-2).
3. In the dossier's *Identita + role* section, click the pencil icon next to *Meno*. A dialog opens with the current value pre-filled.
4. Edit the value (max 200 chars) and click *Uložiť opravu*. The `rectify_user_data()` RPC fires, the dossier reloads with the corrected name, and an `audit_log` row is written with action `dsr_rectification_applied` + OLD and NEW values quoted in `details`.
5. Send the requester a confirmation e-mail noting the corrected value. Mark the DSR `completed`.

### 2b. For any other field (manual SQL path — interim)

Until the rectify whitelist extends to more (table, column) pairs, fixes to fields other than `profiles.display_name` go through SQL editor. The path here is the historical pre-E46.6 procedure, preserved for completeness.

1. Open the dossier as above. Read the requester's `note` to identify what field needs correcting.
2. From Supabase SQL editor (service role), run the targeted `UPDATE`:
   ```sql
   -- Example: fix a misspelled audience kind.
   UPDATE public.profile_preferences
   SET audience_kind = 'corrected_value'
   WHERE user_id = '<userId>';
   -- The forensic audit trigger writes an audit_log row automatically
   -- for tables that have one wired (profiles does; many others don't).
   ```
3. **Manually** write an `audit_log` entry capturing the request → change mapping (in addition to the auto-trigger if any):
   ```sql
   INSERT INTO public.audit_log (actor_name, action, target_type, target_id, pii_access, details)
   VALUES (
     '<your-name>',
     'dsr_rectification_applied',
     'profile',
     '<userId>',
     true,
     'DSR #<dsrId>: profile_preferences.audience_kind corrected per Art. 16. Old: ''<old>''. New: ''<new>''.'
   );
   ```
4. Send the requester a confirmation e-mail. Mark the DSR `completed`.

**Note:** When operational volume justifies, extend the `rectify_user_data()` whitelist to cover the field (1-commit migration), then the UI driver, then this manual procedure retires for that field too.

---

## 3. Art. 17 — Right to erasure (right to be forgotten)

Two strategies, **always default to anonymise** unless the requester explicitly demands hard delete.

### 3a. Anonymise (default, reversible-by-restore-from-backup)

Anonymise NULLs the PII columns (`profiles.email`, `profiles.display_name`, `respondents.email`, `respondents.display_name`, `dpa_requests.contact_email`, `dpa_requests.contact_name`) but keeps statistical rows. Art. 17(3)(b) GDPR explicitly allows this for "archiving purposes in the public interest" — aggregate test scores, donation totals etc. survive.

1. Open the dossier. Click *Anonymizovať PII*.
2. The destructive `ConfirmDialog` asks for confirmation. There's no typed-confirm gate (anonymise is reversible-via-backup, not irreversible).
3. On confirm, the `erase_user_data(p_user_id, p_strategy='anonymize')` RPC fires. The dossier reloads with `(anonymizované)` markers next to every previously-PII row.
4. The DSR queue's *Posledná GDPR udalosť* column on `/admin/users` is updated.
5. Mark the DSR `completed`. Send the requester a confirmation e-mail noting "your data has been anonymised — your contributions to aggregate statistics remain but your identity is not recoverable from our systems".

### 3b. Hard delete (irreversible)

Use only when the requester explicitly asks for full deletion (rare — typically a young user who never engaged, a deceased subject's estate, or a regulatory order).

1. Open the dossier. Click *Vymazať natvrdo*.
2. The destructive `ConfirmDialog` shows a typed-confirm input. **Type the user's e-mail exactly** — one typo and the button stays disabled. This is deliberate; a slip can wipe the wrong account.
3. On confirm, the user enters a 5-minute *Čaká sa na vymazanie* (pending erasure) state. The dossier shows a red banner with a *Zrušiť* button.
4. If you realise you confirmed the wrong user, click *Zrušiť* before the 5 minutes elapse. The `cancel_pending_erasure` RPC removes the queued operation cleanly.
5. After 5 minutes elapse, the pg_cron job `pending-erasures-flush` (runs every minute) picks up the row and executes the delete. Total worst-case latency from typed-confirm to row-gone: ≤6 minutes.
6. Once the cron completes, the user's `auth.users` row + all `ON DELETE CASCADE` rows are gone. `pending_erasures.processed_at` is stamped; the `pre_delete_snapshot` jsonb is preserved for forensic / Art. 5(2) accountability. The `audit_log` records both the enqueue (`dsr_hard_delete_enqueued`) and the execute (`dsr_hard_delete_executed`). Mark the DSR `completed`.
7. If the cron logs `dsr_hard_delete_failed` instead — manual intervention is required. Check `audit_log.details` for the SQLSTATE + message, fix the underlying issue, and use *Emergency hard-delete* below to retry.

**Sponsorship guard:** Hard delete refuses to proceed if the user has an active Stripe sponsorship subscription. Cancel the subscription in Stripe dashboard first, then retry. This prevents orphan subscriptions billing a non-existent account.

**SLA:** 30 days from receipt. Anonymise resolves in ~30 seconds; hard delete needs the 5-minute grace (plus current manual finish step).

---

## 4. Art. 18 — Right to restriction (freeze processing)

Restriction is the GDPR escape hatch when a user wants their data preserved but no longer used (e.g. while a complaint is being investigated). We don't currently have a restriction flag in the schema — process as manual ticket.

1. Open the dossier. Read the note for the scope of the restriction.
2. From SQL editor, write an `audit_log` entry recording the restriction:
   ```sql
   INSERT INTO public.audit_log (actor_name, action, target_type, target_id, pii_access, details)
   VALUES ('<your-name>', 'dsr_restriction_applied', 'profile', '<userId>', true,
           'DSR #<dsrId>: processing restricted per Art. 18. Scope: <scope>. Until: <date|indefinite>.');
   ```
3. If the restriction covers "no marketing e-mails" — flip `profile_preferences.digest_cadence` to `'none'`.
4. If it covers "no inclusion in aggregate analytics" — there's no flag today; document in the audit_log and remember to filter manually in any analytical queries while the restriction holds.
5. Send the requester a confirmation e-mail. Mark the DSR `completed` (the restriction itself doesn't auto-resolve; the requester has to lift it).

**Follow-up tracking:** Keep a private list of active restrictions (operator notebook is fine — we'll formalise when volume justifies). Lift the restriction proactively when the underlying reason resolves.

---

## 5. Art. 20 — Right to portability (machine-readable export)

Same data shape as Art. 15 (JSON export), but the user has the right to receive it in a *commonly used, machine-readable format* and to transmit it to another controller.

1. Follow steps 1–4 of *Art. 15 — Right of access*. The exported JSON is already a "commonly used, machine-readable format".
2. If the requester names a destination controller (e.g. "send my data directly to SubenAI competitor"), we are NOT obligated to do the transmission ourselves — Art. 20 only requires the *enablement*. Tell the requester to forward the JSON we sent.
3. The portability flag in the DSR queue is just a labelling convention; the fulfilment is identical to Art. 15.

---

## Non-registered subjects (orphan e-mails)

Some DSRs come from people whose e-mail is **not** in `profiles.email` — typically:
- A parent of a minor (the minor isn't a SubenAI user, but the parent submits on their behalf)
- Someone who never signed up but had their e-mail captured via a public test embed
- A spam / harassment request (sender claims data but we have nothing)

On `/admin/dsr` these rows show a *disabled* dossier link icon with a tooltip. **Don't ignore them** — Art. 12 still requires a response.

Procedure:
1. Open the DSR row. Read the requester's note.
2. Run a manual `SELECT` to confirm we hold no data for that e-mail:
   ```sql
   SELECT 'profiles' AS source, count(*) FROM public.profiles WHERE email = '<requesterEmail>'
   UNION ALL SELECT 'respondents', count(*) FROM public.respondents WHERE email = '<requesterEmail>'
   UNION ALL SELECT 'dpa_requests', count(*) FROM public.dpa_requests WHERE contact_email = '<requesterEmail>'
   UNION ALL SELECT 'dsr_requests', count(*) FROM public.dsr_requests WHERE requester_email = '<requesterEmail>';
   ```
3. If every count is 0 — reply to the requester with: "We have searched our records for the e-mail address you provided and we hold no personal data about you. There is nothing to export, rectify, or erase. If you believe we should have data on you under a different e-mail, please contact us with that address." Mark the DSR `completed`.
4. If we DO hold data under a different e-mail (alias, parent's e-mail, etc.) — escalate to the DPO. Don't anonymise/delete without identity proof.

---

## Emergency hard-delete (bypass the 5-minute grace window)

**Use only when:**
- A regulator order demands immediate execution (no grace window)
- The pg_cron job is paused / broken AND a delete must complete now
- A previous cron tick logged `dsr_hard_delete_failed` and the underlying issue is now fixed (manual retry)

Procedure:
1. Confirm the `pending_erasures` row exists and is not cancelled:
   ```sql
   SELECT id, target_user_id, created_at, cancelled_at, hard_deleted_at
   FROM public.pending_erasures
   WHERE target_user_id = '<userId>' AND cancelled_at IS NULL AND hard_deleted_at IS NULL;
   ```
2. From Supabase SQL editor as **service role**:
   ```sql
   SELECT public.erase_user_data('<userId>'::uuid, 'hard_delete');
   ```
3. This bypasses the grace window and performs the delete immediately. The RPC writes the `audit_log` row, sets `pending_erasures.hard_deleted_at`, and cascades through `auth.users`.
4. **Document the bypass** in the audit_log explicitly:
   ```sql
   INSERT INTO public.audit_log (actor_name, action, target_type, target_id, pii_access, details)
   VALUES ('<your-name>', 'dsr_hard_delete_emergency_bypass', 'user', '<userId>', true,
           'DSR #<dsrId>: grace window bypassed per <reason>. Cron E46.5 not yet deployed.');
   ```

When E46.5 ships, this manual step goes away — the cron picks up pending rows automatically and the *Emergency* path retracts to only the regulator-order case.

---

## Cross-references

- `/privacy` section 5 (public-facing disclosure of this process)
- `tasks/PLAN-2026-05-21-E46-admin-user-data-manager.md` (epic plan + closeout note)
- `supabase/migrations/20260521230000_admin_user_data_rpcs.sql` (the RPCs this runbook calls)
- `src/components/admin/UserDossier.tsx` (the UI surface — `/admin/users/<id>`)
- `e2e/specs/admin/dossier-flow.spec.ts` (the Playwright contract for the dossier flow)
