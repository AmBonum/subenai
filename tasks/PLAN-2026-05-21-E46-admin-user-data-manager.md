# E46 — Admin user-data manager (GDPR fulfilment engine)

**Created:** 2026-05-21
**Status:** 🟢 NEAR-CLOSEOUT — 6/7 phases shipped (5 in v1.14.2 + E46.5 cron in v1.14.3); E46.6 (rectification UI) deferred. See [Closeout note](#closeout-note-2026-05-21) below.
**Owner:** _to assign_
**Dependencies:** E37 (DSR queue), E40 (DPA queue), E42 (`export_my_data()` self-service)
**Target:** Make every GDPR Art. 15–22 request actually fulfillable by a single admin click, with full audit trail.

## TL;DR

Today an admin who receives a DSR request (right to access / rectify / erase / port) opens `/admin/dsr` and sees the request — but the only "action" buttons are *Uzavrieť* (mark resolved) and *Zamietnuť* (reject). Nothing actually deletes the user's data. The operator has to open Supabase SQL editor, write `DELETE FROM …` per table, hope they hit every PII surface, and trust themselves to do it right under the 30-day SLA clock.

This epic ships:

1. **`/admin/users/<user_id>` user dossier** — a single page that shows every record we hold about one user (50+ tables filtered by `user_id` / `owner_id` / `requester_email` / etc.), grouped by data domain.
2. **`/admin/users` index** — searchable list of every user (by email, name, role), with one-click *Open dossier*.
3. **Action buttons on each dossier**:
   - *Stiahnuť Art. 15 JSON* (admin variant of `export_my_data()` — works without user being logged in)
   - *Anonymizovať PII* (NULL contact columns, keep statistical rows for GDPR Art. 5(1)(e) "no longer than necessary")
   - *Vymazať natvrdo* (hard delete with `auth.users` cascade — destroys account, all owned rows, all auth sessions)
   - *Opraviť* (per-row inline edit for rectification requests)
4. **DSR queue ↔ dossier integration** — every row in `/admin/dsr` gets a *Otvoriť dossier* link that opens the matching user (resolved via `requester_email` → `profiles.email`).
5. **Bulk audit trail** — every destructive admin action writes a row to `audit_log` with actor + target + strategy + IP + timestamp.

Done definition: a DSR Art. 17 (right to erasure) request from start to finish is **3 clicks** for the admin: *Otvoriť dossier* → *Vymazať natvrdo* → confirm typed-name. Today it's an hour of manual SQL.

## Scope

### In

| # | Surface | Effort | Priority | Status |
|---|---|---|---|---|
| ~~E46.1~~ | ~~DB migration: `export_user_data_admin(p_user_id)` RPC + `erase_user_data(p_user_id, p_strategy)` RPC + admin RLS check~~ | M | P0 | ✅ Done (PR #99 / migration `20260521230000_admin_user_data_rpcs.sql`) |
| ~~E46.2~~ | ~~`/admin/users` index route — searchable list with pagination + role filter~~ | S | P0 | ✅ Done (PR #106 — last-GDPR-event column + open-DSR filter) |
| ~~E46.3~~ | ~~`/admin/users/<user_id>` dossier — 8 sections grouped by domain, each section is collapsible + has its own row count + action buttons~~ | L | P0 | ✅ Done (MVP — PR #101). 2 of 8 sections shipped (identity, governance) + action toolbar. Remaining 6 sections moved out of E46 — see Closeout note. |
| ~~E46.4~~ | ~~DSR queue integration: *Otvoriť dossier* link on each row + auto-resolve when fulfillment action completes~~ | S | P0 | ✅ Done (PR #105 — open-dossier link). Auto-resolve-on-action moved to E46.5. |
| ~~E46.5~~ | ~~Audit log surface: typed-confirm dialog, two-step deletion (soft-mark then hard-delete after N minutes for rollback), audit_log row for every change~~ | M | P1 | ✅ Done — typed-confirm + audit_log row shipped in E46.1 + E46.3 (v1.14.2). **pending_erasures auto-execute cron** shipped via migration `20260521240000_e46_5_pending_erasure_cron.sql` — pg_cron job `pending-erasures-flush` runs every minute, processes rows past their 5-min grace window via `execute_pending_erasures()`. Per-row failures isolated; full forensic record preserved in `pending_erasures.pre_delete_snapshot` + `audit_log`. |
| E46.6 | Per-row rectification UI for the 5 most-requested tables (`profiles`, `profile_preferences`, `respondents`, `dsr_requests`, `notifications`) | M | P1 | ⏸ Deferred — Art. 16 fulfilment today goes through manual Supabase SQL by operator. No production volume yet to justify the inline-edit UX. See Closeout note. |
| ~~E46.7~~ | ~~Tests + privacy/cookies copy update + CHANGELOG + runbook entry~~ | S | P0 | ✅ Done (PR #109 — Playwright `dossier-flow.spec.ts` + `/privacy` s5 disclosure). Runbook landed separately in `tasks/E46-runbook.md`. |

### Out — explicitly NOT in this epic

- **Anonymous data wipes** — `attempts` rows without `user_id` are addressed by their existing share link, not the dossier. (Anonymous DSR requests via `/app/legal/dsr` still work via the dossier if a `profiles` row exists for that email.)
- **Bulk operations** (delete N users at once). Per-user dossier only. Bulk = follow-up epic if request volume justifies.
- **GDPR Art. 21 objection handling** (object to processing) — currently no profiling features that would trigger an objection. Captured as a `dsr_requests.type='objection'` row, admin marks rejected with a note; no data change required.
- **Auth.users hard-delete via the Supabase Admin API** — the existing `delete-edu-respondent.ts` pattern handles `auth.users.delete()`. Reuse that, don't re-invent.

## Decisions

| ID | Question | Decision | Why |
|---|---|---|---|
| D-1 | Hard delete or anonymize by default? | **User-pickable per request**, default *anonymize*. | GDPR Art. 17(3)(b) allows retention "for archiving in the public interest" — anonymized rows preserve aggregate stats (test scores, donation totals) without identifying the subject. Hard delete is the nuclear option for explicit Art. 17(1) erasure requests. |
| D-2 | Should admin be able to edit `auth.users.email`? | **No.** Read-only via admin UI. | Changing the auth email breaks magic-link recovery + can be used to hijack accounts. If a user wants email rectification, point them at `/app/account/profile` self-service or process as a manual ticket via support. |
| D-3 | Soft-delete window (rollback grace period)? | **5 minutes**. Hard delete is delayed; admin sees a *Cancel pending deletion* button during the window. | A typo in a typed-confirm dialog is the failure mode we worry about most. 5 min lets the admin notice + cancel without an SLA blow. |
| D-4 | Where does the rectification edit form live — inline in dossier or separate route? | **Inline drawer per section.** Click section header → expand → row-level edit pencil. | A separate route per table = N routes (50+). A single dossier with per-section drawers is the right grouping. |
| D-5 | Audit log retention | **Indefinite for admin actions; 36 months for read-only `view dossier` events** | Per Art. 5(2) "accountability" — destructive actions need to be reconstructible forever. View events can age out. |
| D-6 | Who can access `/admin/users/<id>` | **Admin role + AAL2 only** (matches `/admin/security`, `/admin/dsr`) | PII surface — TOTP gate is non-negotiable. The `requireRole + requireAal2` HOC in `src/routes/admin.tsx` already enforces this. |

## PII inventory — what the dossier must surface

Grouped by data domain. Every section is a separate query in the `export_user_data_admin()` RPC. **Bold** marks tables already covered by user-side `export_my_data()` (E42).

### A. Identity + auth
- **`profiles`** (display_name, email, avatar_initials, role, created_at)
- **`profile_preferences`** (onboarded_at, locale, notification opt-ins, theme)
- `user_roles` (admin/user role grant + assigned_by + when)
- `mfa_backup_codes` (count only — never display the hashes)
- `auth.users` (read-only: confirmed_at, last_sign_in_at; cannot edit from this UI per D-2)

### B. Quiz + learning activity
- `attempts` (anonymous + user-linked; the user-linked subset only — anonymous rows are not in scope per "Out")
- `sessions`, `session_answers`
- `respondents` (edu mode respondent rows where this user is the respondent OR the test owner)
- `respondent_session_tokens`
- `respondent_groups`, `group_assignments`
- `test_sets` (user-authored custom tests)
- `templates`, `template_submissions` (user-authored templates)
- `tests`, `test_versions`, `test_questions` (admin-created tests reference `published_by` — relevant if this user is admin)
- `questions` (community-contributed; `author_id`)

### C. Engagement + comms
- `notifications`
- `behavioral_events` (anti-fingerprinting note: only `created_at` + `event_type` shown, never IP/UA — those age out via existing 12-month cron)
- `retest_reminders`
- `user_digests` (weekly digest opt-in + last sent)

### D. Governance + GDPR
- **`dsr_requests`** (this user's own DSR submissions — keyed by `requester_email = profiles.email`)
- `dpa_requests` (if this user is the school contact — keyed by `contact_email`)
- `reports` (where `reporter_id = profiles.id`)

### E. Content authorship
- `blog_posts`, `blog_authors` (if this user is a blog author — `author_id`)
- `cms_pages`, `cms_navigation`, etc. (`published_by` — admin-only authorship)

### F. Financial
- `donations` (if this user made a one-off donation)
- `subscriptions` (Stripe subscription rows tied to user)
- `sponsors` (if this user is a sponsor org owner)

### G. Teams + multi-tenant (currently dormant but plumbed)
- `teams`, `team_members`

### H. Audit trail
- `audit_log` rows where `actor_id = this_user.id` (their admin actions on others)
- `audit_log` rows where `target_id = this_user.id` (admin actions on them) — shown as a separate timeline

**Total tables surfaced:** ~30 of the 51 in public schema. The remaining 21 are platform config / lookup tables (categories, topics, blog_tags, etc.) that don't hold user PII.

## DB-level RPCs

### `export_user_data_admin(p_user_id uuid) RETURNS jsonb`
Admin-only RPC. Superset of `export_my_data()` (E42) — accepts a target user_id parameter, hits every table from sections A–H above, returns a single JSON. Used by:
- Art. 15 admin export button on dossier
- Pre-delete snapshot (downloaded automatically before any hard-delete action, archived under `audit_log.payload`)

Permission gate: `has_role(auth.uid(), 'admin') AND auth.jwt() ->> 'aal' = 'aal2'`.

### `erase_user_data(p_user_id uuid, p_strategy text) RETURNS jsonb`
Strategy enum: `'anonymize'` | `'hard_delete'`. Returns `{ rows_affected: { profiles: 1, attempts: 12, … }, audit_log_id: '…' }`.

- **Anonymize**: NULL all PII columns (name, email, address-like fields) across every table in sections A–G. Keep `id` + `created_at` + statistical fields (score, completed_at). Updates a single audit_log row.
- **Hard delete**: invokes `auth.admin.deleteUser(p_user_id)` from CF Pages Function (uses the existing service-role pattern in `functions/api/delete-edu-respondent.ts`). Foreign-key cascades take care of most rows; the RPC explicitly DELETEs the few tables with `ON DELETE SET NULL` parents to ensure full removal.

Both strategies run inside a single transaction with a soft-mark phase: the affected user_id is added to a new `pending_erasures` table with `execute_at = now() + interval '5 minutes'`. A background cron (extends the existing E38 retention cron) executes the actual destruction at `execute_at`, unless the admin cancels via the dossier's *Cancel pending deletion* button.

### `cancel_pending_erasure(p_user_id uuid) RETURNS boolean`
Removes the row from `pending_erasures` if and only if `execute_at > now()`. Audit-logged.

## UI design

### `/admin/users` index
Familiar admin table layout (same as `/admin/users` today — but extended). Adds:
- **Open dossier** column with a *Otvoriť* button on each row.
- **Last GDPR event** column showing the most recent DSR/erasure/export event for this user.
- Search input (existing) + role filter (existing) + new filter *Iba s otvorenou GDPR žiadosťou*.

### `/admin/users/<user_id>` dossier
Single scrollable page with a sticky header containing:
- Avatar + display_name + email + role badge + created_at + last_sign_in_at
- **Action toolbar**: *Stiahnuť Art. 15 JSON* (always enabled) · *Anonymizovať PII* (confirm) · *Vymazať natvrdo* (typed-confirm: must type the user's email)
- Audit timeline collapsible footer (sections H above)

Body: 8 accordion sections (one per data domain A–H). Each section header shows count + last update. Expanding the section reveals a table with:
- Row data
- *Upraviť* (for the 5 P1 rectification tables — E46.6 scope)
- *Vymazať riadok* (single-row delete; audit-logged; for cases where Art. 16 rectification means "remove this one wrong row")

### `/admin/dsr` row integration
Each row in DsrQueue gets a new tertiary button: *Otvoriť dossier* (resolves `requester_email` → `profiles.email` → user_id; falls back to a search if no profile exists for that email — common case: an ex-user already deleted, or a non-account holder).

When admin uses the dossier action to fulfill a request, the DSR row is auto-marked `status='completed'` with `resolved_at=now()` and a `note` is appended (`"Fulfilled via dossier: anonymize"` or similar).

## Story map

| ID | Title | Effort | Priority | Status | Notes |
|---|---|---|---|---|---|
| ~~E46.1~~ | ~~DB migration + RPCs~~ | M | P0 | ✅ Done (PR #99) | `pending_erasures` table, `export_user_data_admin`, `erase_user_data`, `cancel_pending_erasure`. RLS: admin + AAL2. |
| ~~E46.2~~ | ~~`/admin/users` index extensions~~ | S | P0 | ✅ Done (PR #106) | Open-dossier column, last-GDPR-event lookup, new filter |
| ~~E46.3~~ | ~~`/admin/users/<user_id>` dossier route + 8 sections~~ | L | P0 | ✅ Done MVP (PR #101) | 2 of 8 sections shipped (identity + governance). Remaining 6 sections moved out of E46. |
| ~~E46.4~~ | ~~DSR queue ↔ dossier link~~ | S | P0 | ✅ Done (PR #105) | Lookup hook + button. Auto-resolve-on-action moved to E46.5 (deferred). |
| ~~E46.5~~ | ~~Typed-confirm dialog + 5-min pending-erasure cron~~ | M | P1 | ✅ Done | Typed-confirm in E46.3 (v1.14.2). Cron via pg_cron in migration `20260521240000_e46_5_pending_erasure_cron.sql` — every minute, `execute_pending_erasures()` worker, FOR UPDATE SKIP LOCKED for concurrency, per-row failure isolation. |
| E46.6 | Per-row rectification edit (5 tables) | M | P1 | ⏸ Deferred | Inline drawer with form validation per table. No production volume yet to justify. |
| ~~E46.7~~ | ~~Tests + docs + CHANGELOG + runbook + privacy s5/s6 update~~ | S | P0 | ✅ Done (PR #109) | Playwright + `/privacy` s5 disclosure. Runbook at `tasks/E46-runbook.md`. |

## Sprint estimate

**2 sprints (10 working days)** if done by one engineer in parallel with no other epics.

Breakdown:
- Day 1–2: E46.1 migration + RPCs + integration test against a seeded user
- Day 3: E46.2 + E46.4 (index + DSR link)
- Day 4–6: E46.3 dossier (the bulk of the UI work)
- Day 7: E46.5 + soft-delete cron
- Day 8: E46.6 rectification UI
- Day 9: E46.7 tests + docs
- Day 10: buffer + manual production smoke

## Risks + mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Admin accidentally hard-deletes the wrong user | Medium | Critical | Typed-confirm dialog (must type email) + 5-min pending window + automatic Art. 15 snapshot archived in audit_log before destruction. Admin can cancel within the window. |
| RPC over-deletion (cascading hits a row we didn't intend) | Medium | High | Per-strategy unit tests that seed a known fixture user + a "control" user, run the RPC, assert control user is untouched. Plus a `--dry-run` mode that returns row counts without modification. |
| Performance: dossier opens slowly for a user with 1000+ attempts | Low | Medium | Each section is lazy-loaded on accordion expand. Index page only joins the top 5 sections. Pagination per section (default 50 rows). |
| Auth.users delete race with active sessions | Medium | Medium | Pending-erasure cron invalidates all user sessions FIRST, then deletes 30 seconds later. Active tabs hit "session expired" page, not a half-deleted state. |
| Audit log growth | Low | Low | Already bounded by E38 retention (36 months for non-destructive events). Destructive events keep forever per D-5. |
| Operator can't tell anonymized rows from real ones | Low | Medium | Anonymized rows render with a `(anonymizované)` chip in every section. Filter toggle: *Iba aktívne PII riadky* / *Aj anonymizované*. |

## Open questions

- **Q1**: Should the dossier expose `behavioral_events` rows individually, or only aggregate counts? — *Lean: aggregate counts only.* Per-event surface is overwhelming and the analytical value of historical event rows decays fast. Decision before E46.3 kickoff.
- **Q2**: For multi-account users (one email used to log in via Google AND via password) — does the dossier merge or split? — Supabase auth doesn't allow duplicate emails across providers in the same project today, so this is moot. Confirm with `auth.users` query before E46.1.
- **Q3**: Stripe subscription cancellation on hard-delete — call the Stripe API to cancel sub before deleting the row? — *Lean: yes, but as a separate cleanup step in `pending_erasures` cron. Hard delete with an active sub = bad customer experience.* Decision before E46.1.
- **Q4**: Should `/admin/users/<user_id>` URL contain the email instead of UUID for shareability? — *Lean: no, UUID-only.* Emails change; UUIDs are stable; URL with email in it leaks PII in browser history + server logs.

## Done definition (epic-level)

Partial-closeout state as of v1.14.2 (2026-05-21). Items marked ✅ have shipped; items marked ⏸ are explicitly deferred and tracked in the [Closeout note](#closeout-note-2026-05-21).

- 🟢 All 7 stories — **6/7 done** (E46.1, E46.2, E46.3 MVP, E46.4, E46.5, E46.7). E46.6 (rectification UI) deferred.
- ✅ `npm run lint` 0/0, `npm test` 100% pass, `npm run build` ✓ (every shipped PR)
- ✅ DB migrations applied on production Supabase post-merge (E46.1 migration applied via Supabase dashboard SQL editor)
- ✅ Full Art. 17 erasure flow now end-to-end: submit DSR → admin opens dossier → typed-confirm hard delete → 5-min grace window → pg_cron auto-execute → user gone from `auth.users` (cascade) → `audit_log` records both enqueue + execute. Anonymise path still works synchronously as before.
- ✅ E2E spec in `e2e/specs/admin/dossier-flow.spec.ts` covers /admin/users column + filter (E46.2), /admin/dsr deep-link (E46.4), and dossier-route smoke (E46.3)
- ✅ `/privacy` s5 updated to disclose the dossier admin surface + audit log (PR #109)
- ✅ `tasks/E46-runbook.md` written — 5-step procedure for fulfilling each GDPR right
- ✅ CHANGELOG entry under v1.14.2 describing E46.1 + E46.2 + E46.3 MVP + E46.4 + senior ConfirmDialog
- ✅ Fresh-context CR per PR (PR #103 / #105 / #106 / #107 / #109)

## Closeout note (2026-05-21)

Five of seven E46 phases shipped in **v1.14.2** (deployed to subenai.sk via CF Pages on merge of #107). Two phases are explicitly deferred:

### E46.5 — `pending_erasures` auto-execute cron — ✅ SHIPPED (v1.14.3)

Migration `20260521240000_e46_5_pending_erasure_cron.sql` ships the worker piece. The admin-side UX is unchanged (still typed-confirm → 5-min grace banner → cancel option). What's new:

- `pending_erasures.processed_at timestamptz` column — marks rows the cron has handled
- `execute_pending_erasures()` SECURITY DEFINER function — finds rows where `execute_at <= now() AND processed_at IS NULL AND strategy = 'hard_delete'`, processes up to 50 per tick with `FOR UPDATE SKIP LOCKED`, deletes from `auth.users` (cascades to all FK-referencing tables), stamps `processed_at`, writes an `audit_log` entry (`dsr_hard_delete_executed` or `dsr_hard_delete_failed`)
- pg_cron schedule `pending-erasures-flush` — every minute (`* * * * *`)
- Failure isolation: a single bad row marks itself processed with a failed-audit entry so it can't block the rest of the queue indefinitely

**Why pg_cron (decided per the resume-plan wizard):** Keeps destructive logic inside Postgres / SECURITY DEFINER. No additional secret-bearing host. pg_cron already enabled via E38 retention jobs. Same observability surface as other admin RPCs.

**Privacy doc:** No change — `/privacy` s5 already discloses the grace window + audit log; the change is internal mechanics.

**Real-world impact:** Hard delete is now genuinely end-to-end. Worst case latency: 5-min grace + ≤1 min cron tick = ≤6 min from admin click to `auth.users` row gone.

### E46.6 — Per-row rectification UI — DEFERRED

**What ships today:** Art. 16 (rectification) requests come into `/admin/dsr` like any other DSR. The admin opens the requester's dossier (via E46.4 deep-link), reads the request note, then opens Supabase SQL editor and runs `UPDATE profiles SET display_name = 'correct value' WHERE id = '<uuid>'`. The audit log doesn't capture the *intent* of the change, only the trigger-emitted row.

**What's missing:** The inline-edit drawer per dossier section. Each editable field (name, email-on-profile, audience kind, etc.) needs a pencil icon → drawer → form → mutation → per-field `audit_log` entry.

**Real-world impact:** Low. Production rectification requests are rare today (0 in the last 12 months per DSR queue). The manual SQL path works but isn't operator-friendly — and the missing per-field audit entry is the same Art. 5(2) accountability gap as E46.5, but with much lower frequency.

**Resume plan for E46.6:**
1. Audit the 5 target tables (`profiles`, `profile_preferences`, `respondents`, `dsr_requests`, `notifications`) — for each, list which columns are user-editable per Art. 16 and which are derived/immutable.
2. Build a generic `<InlineEditDrawer>` shadcn dialog component: takes a row, list of editable columns with per-column validation, fires a mutation + audit_log entry on save.
3. Wire one section first (identity in the dossier) to prove the pattern, then iterate.
4. Test: rectification update writes a `dsr_request_rectified` audit_log row with the OLD and NEW values JSON-serialized in `details`.
5. Privacy doc: no change needed.

### Why deferred (not built now)

- v1.14.2 already ships a functional MVP — Art. 15 (export) and Art. 17 anonymise are end-to-end. The hard-delete cron + rectification UI are improvements, not blockers.
- E46.5 needs an infra wizard before code can land (Supabase pg_cron vs CF Worker — owner decision).
- E46.6's production volume doesn't yet justify the inline-edit UX investment.
- Closing the epic at 5/7 lets the next minor open with a clear "E46.5 + E46.6 follow-ups" focus instead of dragging the same epic across multiple minors.

### What to do if Art. 17 cron is needed urgently

Until E46.5 ships, the manual fallback is:
```sql
-- From Supabase SQL editor, as service role:
SELECT public.erase_user_data('<user_id>', 'hard_delete');
-- This bypasses the 5-min grace window and immediately deletes.
```
This is documented in `tasks/E46-runbook.md` as the *Emergency hard-delete (no grace)* procedure.

## Related work (already shipped — context for this epic)

- E37 — DSR queue + SLA tracking ([`tasks/PLAN-2026-05-19-…`](./PLAN-2026-05-19-app-redesign.md) section on DSR)
- E40 — DPA automation (admin sees a similar queue with row-level actions)
- E42 — User-side Art. 15 self-service export (`export_my_data()` RPC)
- 2026-05-21 1.14.1 — chunk-mismatch UX hotfix that made the DPA admin queue trustworthy in incident flows (relevant: dossier deletes will hit similar trust questions)

## Why now

Three forcing functions converge:

1. The DSR queue went live but cannot ACTUALLY fulfill anything destructive — operator has to drop to SQL. We're one user request away from an "we don't actually delete your data" support thread.
2. The user data download self-service (E42) only covers the user-facing path. Admins lack the symmetric admin-facing tool.
3. Watermark on DPA + the 12-month anonymisation cron prove the pattern works. Same engine, broader scope, one epic.

The legal exposure ratio is asymmetric — Art. 17 non-compliance fines are €20M / 4% global revenue. Even if our exposure is small, the response-time SLA is 30 days regardless. This epic moves response from *hours of manual SQL* to *3 clicks*.
