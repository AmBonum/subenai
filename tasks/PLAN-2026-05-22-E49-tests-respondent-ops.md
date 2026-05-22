# E49 — `/app/tests` completion: respondent drill-down, session ops, extended parameters, full coverage

**Owner:** Claude — closes the loop on `/app/tests` after E45 shipped the editor. The author must be able to (1) drill into individual respondent results, (2) reset / delete / re-invite a respondent's session, (3) configure all available test parameters (expiry, max attempts, time limit, anonymization, behavioural tracking), (4) organize tests (duplicate, bulk archive, pin), and (5) every flow above must be locked down by unit + integration + security + e2e tests with seeded data + global teardown.
**Date opened:** 2026-05-22
**Status:** 🟡 Phase 1a in progress — queries + side-sheet + Results v2 + plan markdown shipped (this commit). Phase 1b (CSV export CF + Playwright spec + extended Vitest) next.

**Originating request (verbatim, Slovak — for traceability):**
> "Tu musí všetko fungovať a aj testy musia otvárať detail testov aj s respondentmi a ich výsledkami. Užívateľ musí vedieť organizovať svoje testy, musí ich vedieť editovať v detaile ako aj nastaviť heslo, zmeniť/prispôsobiť/pridať/odobrať otázky, nastaviť rôzne parametre testu a zároveň resetovať/vymazať/vyžiadať znova vyplnenie testu. Vsetko to chcem mat pokryte automation tetsami z hladiska funkcnosti, integracie, security a e2e."

E45 delivered editor + password + invites. This epic delivers **the missing post-publish surfaces**: respondent visibility, session control, and the parameters DB already supports but UI never exposed.

## TL;DR

The `/app/tests/$testId` editor is missing the post-publish surfaces an author actually needs:

- **Results tab** today shows `completed: N` and `avg: X%`. No way to drill into a specific respondent and see what they answered. Authors fly blind once a test is shared.
- **Sessions cannot be managed.** An accidental fill-in by the author themselves, a corrupted attempt, or a re-test request — author has no path to delete, reset, or re-issue the session.
- **`tests.expires_at`, `anonymize_after_days`, `allow_behavioral_tracking` exist in DB since AH-1.4 but have no UI.** Authors can't enforce expiry or anonymization without writing SQL.
- **No `max_attempts_per_respondent` and no `time_limit_minutes`** — both are routine for test platforms; we need new columns.
- **Index page** has search + status + branch filters but lacks duplicate, bulk archive, and pin/sort.

E49 closes all of these and ships them under one consistent severity-driven `ConfirmDialog` discipline (typed-confirm on irreversible destructive flows — session delete, anonymize-now). Coverage is non-negotiable: every new mutation gets a Vitest unit, a Vitest integration (live Supabase) for RLS, a security spec (IDOR + XSS in respondent display + tampering on tokens), and a Playwright e2e walking the full author → respondent → drill-down → reset round trip.

## Scope

### In

**Phase 1 — Respondent drill-down (Results tab v2)**
- New route `src/routes/app.tests.$testId.sessions.$sessionId.tsx` rendered as a side-sheet over the editor (URL-addressable, `data-testid="session-detail-sheet"`).
- Results tab gains a paginated, sortable, filterable list of sessions (status, score range, started_at range, respondent search).
- Per-session view shows: respondent identity (name/email if collected; anonymous badge otherwise), status badge, score + breakdown by question, full Q&A list with respondent's value next to the correct value, time per question, started_at / finished_at / duration, IP-hash truncated (last 6 chars) for audit reference only.
- Queries: `useTestSession(testId, sessionId)`, `useTestSessionAnswers(testId, sessionId)`, `useTestSessions(testId, { page, sort, filter })` — paginated server-side.
- CSV export of the sessions list (owner-only, audit-logged). Existing `xss-payloads.ts` + `e48-payloads.ts` reused for CSV-injection contract test.

**Phase 2 — Session ops (reset / delete / re-invite)**
- DB: migration `20260522_e49_session_ops.sql`
  - RPC `delete_test_session(p_session_id uuid)` — SECURITY DEFINER, owner-or-admin only, audit-logged, cascades to `session_answers`.
  - RPC `reset_test_session(p_session_id uuid)` — SECURITY DEFINER, owner-or-admin only, marks status `in_progress`, clears `score`, `finished_at`, deletes `session_answers`, invalidates `respondent_session_tokens`, audit-logged.
  - Table `test_session_ops_audit` (id, session_id, test_id, actor_id, op enum [delete|reset|resend_invite], reason text nullable, created_at) with RLS owner-or-admin SELECT.
- CF Function `functions/api/tests/resend-invite.ts` — owner-only, per-author daily quota 100, per-test daily 50, per-IP per hour 50, audit-logged. Sends the existing E45 invite template re-targeted at a specific respondent_id.
- Queries: `useDeleteTestSession`, `useResetTestSession`, `useResendSessionInvite`.
- UI: each row in Results tab gains an actions menu (kebab) with: View detail, Reset, Resend invite, Delete. Confirmations use `ConfirmDialog`:
  - **Reset** → `severity="warning"` (reversible only by respondent retaking — answers are gone)
  - **Delete** → `severity="destructive"` + `typedConfirm={{ expected: <respondent_email_or_session_id>, label: ... }}`
  - **Resend invite** → `severity="info"` (no typed-confirm)

**Phase 3 — Extended test parameters**
- DB: migration `20260522_e49_test_params.sql`
  - Add `tests.max_attempts_per_respondent INT2 NULL` (default `NULL` = unlimited; range 1..50 via check).
  - Add `tests.time_limit_minutes INT2 NULL` (default `NULL` = no limit; range 5..240 via check).
  - Trigger `enforce_test_attempt_limit_on_session_insert` — counts existing non-abandoned sessions for the same respondent_id (or ip_hash if respondent_id is null) and rejects when limit reached. Returns `attempt_limit_reached` SQLSTATE for friendly UI handling.
- Settings tab gains a "Pravidlá" (Rules) card exposing:
  - Expiry (date picker → `expires_at`)
  - Max attempts per respondent (number 1..50 or unlimited)
  - Time limit per attempt (number 5..240 or unlimited)
  - Anonymize completed sessions after N days (number 1..365 or never → `anonymize_after_days`)
  - Allow behavioral tracking (switch → `allow_behavioral_tracking`)
- Respondent flow honours all parameters:
  - `expires_at` → public `/t/$shareId` shows "Test už nie je dostupný" if past.
  - `max_attempts_per_respondent` → start endpoint returns friendly error; gate UI on take page.
  - `time_limit_minutes` → countdown component in `TakeTestFlow`, auto-submit on zero (existing `start_respondent_session` already returns `started_at`).
- Cron `anonymize_completed_sessions` (extends existing E38 retention cron if present, or adds it) — strips `respondent_email`/`respondent_name`/`intake_data.name`/`intake_data.email` and replaces with hashed placeholder after the configured window.

**Phase 4 — Organization (index page)**
- Duplicate test — RPC `duplicate_test(p_test_id uuid)` returns new test_id (status `draft`, fresh `share_id`, no password, no sessions, copies question links + order mode + new params). Owner-only.
- Bulk archive — Index gains row-checkboxes + sticky action bar with "Archivovať vybrané" (uses existing `archiveTest` per id; new `bulk_archive_tests` RPC for atomicity).
- Pin/favourite — `tests.pinned_at TIMESTAMPTZ NULL`. Pinned tests sort first; pinning is an owner-only column update under existing RLS.
- Sort options: Recent activity (default), Title A→Z, Status, Created date, Most respondents (joins sessions count).

**Phase 5 — Full coverage**
- Vitest unit: every new query, every reducer in the Results-tab filter store, time-limit countdown timer, attempt-limit guard helper.
- Vitest integration (live Supabase): RPC contracts — `delete_test_session`, `reset_test_session`, `duplicate_test`, `bulk_archive_tests`, attempt-limit trigger, anonymization cron behaviour with frozen `now()`.
- Security specs:
  - IDOR — non-owner cannot read/delete/reset another owner's session via direct RPC call.
  - XSS — respondent name with `<script>`, `<img onerror>`, `javascript:` URL, control characters, RTL override, and the existing payload battery render harmlessly in the detail sheet and the CSV export.
  - CSV injection — leading `=`, `+`, `-`, `@`, tab/CR injection prefixed with `'` in exports.
  - Ownership transfer — manipulating `owner_id` via PostgREST embedded write must fail RLS.
  - Token tampering — invalidated `respondent_session_tokens` after reset must reject further answer writes.
  - Brute force — `verify_test_password` rate-limit holds across reset (re-issued share gets fresh rate window).
- E2E (Playwright):
  - **Author flow:** author seeds, publishes, opens results, drills into a session, exports CSV, resets the session, deletes another session with typed-confirm, sees audit row in `test_session_ops_audit` (via integration check in same spec).
  - **Respondent flow:** anonymous + identified respondent paths; expiry banner; max-attempts gate; time-limit auto-submit; password gate still functional.
  - **Index org:** duplicate, bulk archive, pin/sort.
- Seeding: extend `e2e/seed/tests.ts` with `seedTestWithSessions({ testCount, sessionsPerTest, completedRatio, withAnswers })`. Reuse `cleanupAllSeeds()` global-teardown pattern (E48 #156).
- SQL test-data seed: `e2e/seed/sql/e49-tests-with-sessions.sql` — deterministic UUIDs prefixed `e2e-e49-` for easy teardown (`DELETE FROM tests WHERE id::text LIKE 'e2e-e49-%'`).
- CI: new e2e label `e2e:E49` for selective triggering; full e2e on merge.

### Out — explicitly NOT done in this epic

- **Edit a completed session's answers post-hoc.** Reset is the only path to "redo"; surgical edits invite cheating accusations.
- **Free-form question types (essay grading).** Existing answer schema is multiple-choice; that constraint is structural and out of scope.
- **Real-time monitoring** (see respondent live during attempt). Polling is too expensive; this is a stretch goal for E51+.
- **Cohort comparisons** ("how does this batch compare to last month"). Analytics-only feature, separate epic.
- **Email open / click tracking** on resend invites (same boundary as E45 D-out).
- **Multi-owner editing** of the same test — owner remains single; team-sharing is read-only here as it was in E45.
- **API for third-party LMS export.** Out of scope; CSV export is the one egress.

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| D1 | **Respondent detail is a URL-addressable side-sheet, not a separate page.** Route is `/app/tests/$testId/sessions/$sessionId` but the editor stays mounted underneath. | Deep-link works (share with audit / DPO), context retained, no page-load flash. |
| D2 | **`delete_test_session` is a hard delete cascading to `session_answers`.** No soft-delete column. | Soft-delete adds RLS complexity for one user-value bit. The `test_session_ops_audit` row preserves the fact of deletion + actor for compliance. |
| D3 | **Typed-confirm on Delete uses the respondent email if present, otherwise the truncated session id (`sess_<last8>`).** | Email is the strongest "you definitely mean this person" signal; ID fallback covers anonymous attempts. Matches the senior UX rule in CLAUDE.md. |
| D4 | **`reset_test_session` invalidates the respondent token but does NOT auto-resend the invite.** Resend is an explicit follow-up action by the author. | Two-step: prevents accidental email blast when the author intent was "wipe data and start over locally". |
| D5 | **Attempt-limit trigger checks against `(respondent_id, test_id)` when respondent_id NOT NULL, else `(ip_hash, test_id)`.** Anonymous + identified attempts use different identity sources. | Anonymous attempts (no `start_respondent_session`-issued respondent row) get an IP-based limit; identified attempts get an identity-based limit. Mixing the two in the trigger keeps it one path. |
| D6 | **Time-limit countdown is client-clock only, with server-side guard on submit.** Server rejects answers older than `started_at + time_limit + 30s` grace. | Cheap to implement, hard to game (clock skew within 30s is normal). 30s grace = network/UX wiggle room without becoming exploitable. |
| D7 | **Duplicate creates a fresh `share_id` and resets `status = 'draft'`.** Password, sessions, audit logs are NOT copied. | Duplicate must be safe — copying a password without the author setting it again creates a stale credential trail. |
| D8 | **Pin column is `pinned_at TIMESTAMPTZ NULL` (not boolean).** Sort by `pinned_at DESC NULLS LAST, updated_at DESC`. | Allows multiple pins to retain a stable order. Re-pin = touch the timestamp. |
| D9 | **CSV export is server-rendered via CF function**, not client-built. Function streams the response with `text/csv; charset=utf-8` + BOM + RFC-4180 quoting + leading-quote escape for `=+-@`. | Centralizes injection-defense + RLS + audit logging in one verified path. Client builders bypass RLS audit. |
| D10 | **Anonymization is a UPDATE-only operation** that overwrites identity columns with deterministic placeholders (`anonymous_<sha256(session_id+salt)[:8]>`). It does NOT delete the session row. | Score + audit value preserved for owner-level reporting; PII removed per GDPR Art. 17. Deterministic placeholder = same anonymized name across joins. |
| D11 | **One PR per phase, sequenced.** Phase 1 ships first (read-only addition, lowest blast radius); Phase 5 (coverage) lands incrementally alongside Phases 1-4 so each phase ships green. A separate "Phase 6 — security hardening polish" PR follows only if Phase 5 surfaces hardening work. | Smaller PRs = faster review + safer revert. Coverage lands with the feature, not after. |
| D12 | **Branch: `feature/E49-tests-respondent-ops`. One branch, multiple commits, one merged PR per phase.** | Matches CLAUDE.md git workflow (epic-level branch, one PR per phase). |

## Phase map

### Phase 1 — Respondent drill-down (PR-1)
| ID | Title | Effort | Pri | Status |
|---|---|---|---|---|
| ~~E49.1 Queries: `useTestSessions(paged)`, `useTestSessionAnswers`~~ | S | P1 | ✅ Done |
| ~~E49.2 Sub-route `app.tests.$testId.sessions.$sessionId.tsx` (side-sheet)~~ | M | P1 | ✅ Done |
| ~~E49.3 Results tab v2: paginated list + filters + sort + 3 KPI cards~~ | M | P1 | ✅ Done |
| E49.4 CSV export CF function `functions/api/tests/export-sessions.ts` | S | P1 | ⏳ Next |
| ~~E49.5 i18n sk/en/cs for all new strings~~ | XS | P2 | ✅ Done |
| E49.6 Vitest: extend with CSV-injection contract + question-metadata edge cases | M | P1 | 🟡 Partial — basic queries + list component covered (16 tests); CSV contract pending |
| E49.7 Playwright spec `e2e/specs/app/test-sessions-detail.spec.ts` + POM `e2e/poms/app/TestSessionsDetail.ts` | M | P1 | 🟡 Plan markdown shipped (`specs/app/test-sessions-detail.md`), spec generation pending |
| ~~E49.8 Docs: story `tasks/stories/E49.1-respondent-drilldown.md` + CHANGELOG entry~~ | XS | P2 | ✅ Done |

### Phase 2 — Session ops (PR-2)
| ID | Title | Effort | Pri |
|---|---|---|---|
| E49.9 | Migration `20260522_e49_session_ops.sql` (RPCs + audit table + DEPLOY_SETUP mirror + types regen) | M | P1 |
| E49.10 | CF function `resend-invite.ts` + rate limits + audit | M | P1 |
| E49.11 | Queries: `useDeleteTestSession`, `useResetTestSession`, `useResendSessionInvite` | S | P1 |
| E49.12 | UI: row actions menu + ConfirmDialog wiring (warning/destructive/info) | M | P1 |
| E49.13 | Vitest: query units + ConfirmDialog severity contract + RPC integration | M | P1 |
| E49.14 | Security: IDOR + token-invalidation spec | S | P1 |
| E49.15 | Playwright e2e: full reset / delete / resend flow + audit row assertion | M | P1 |
| E49.16 | Docs: stories + CHANGELOG | XS | P2 |

### Phase 3 — Extended parameters (PR-3)
| ID | Title | Effort | Pri |
|---|---|---|---|
| E49.17 | Migration `20260522_e49_test_params.sql` (`max_attempts`, `time_limit`, trigger) | M | P1 |
| E49.18 | Settings "Pravidlá" card + form validation | M | P1 |
| E49.19 | Respondent flow: expiry / attempt-limit gate + time-limit countdown + auto-submit | M | P1 |
| E49.20 | Cron `anonymize_completed_sessions` (or extend E38 retention) | M | P1 |
| E49.21 | Vitest + integration: trigger contract, countdown, anonymization | M | P1 |
| E49.22 | Playwright e2e: expiry banner, max-attempts block, time-limit auto-submit | M | P1 |
| E49.23 | Privacy + cookies copy updates + Slovak verbatim review | S | P2 |
| E49.24 | Docs: stories + CHANGELOG | XS | P2 |

### Phase 4 — Organization (PR-4)
| ID | Title | Effort | Pri |
|---|---|---|---|
| E49.25 | RPC `duplicate_test` + `bulk_archive_tests` migration + types | S | P1 |
| E49.26 | Index UI: duplicate, bulk-select bar, pin, sort | M | P1 |
| E49.27 | Vitest + e2e for org features | M | P1 |
| E49.28 | Docs: stories + CHANGELOG | XS | P2 |

### Phase 5 — Coverage polish + senior cross-discipline review (PR-5)
| ID | Title | Effort | Pri |
|---|---|---|---|
| E49.29 | UX/UI senior review pass (design-critique skill) — drift fixes | M | P1 |
| E49.30 | Security senior review pass (engineering:code-review + security-review skills) | M | P1 |
| E49.31 | Copy senior review pass (Slovak UX-copy; SEO/marketing N/A — `/app/*` is `noindex`) | S | P2 |
| E49.32 | Final fresh-context CR + test-coverage matrix doc | M | P1 |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Respondent identity columns are sparse (anonymous attempts) — UI looks empty | High | Always show identifier hierarchy: name → email → session-id-truncated; never a blank cell. Anonymous badge for clarity. |
| Hard delete of a session loses analytics history forever | Medium | `test_session_ops_audit` row captures the fact + actor + reason. Aggregated analytics already store rolled-up metrics. |
| Time-limit countdown drifts on slow networks | Medium | 30s server-side grace (D6); show "Submitting…" overlay before timeout to mask network. |
| Anonymization cron mis-targets non-completed sessions | High | Strict `WHERE status = 'completed' AND finished_at < now() - INTERVAL '... days'`; integration test with frozen `now()` over both sides of the boundary. |
| Bulk archive race: concurrent edits to same rows | Low | RPC uses `SELECT … FOR UPDATE SKIP LOCKED`, returns the rows that successfully archived. |
| CSV export contains formulas → attacker email opens, runs in Excel | Medium | D9: server-rendered with leading-quote escape on `= + - @`. Contract test in `tests/security/`. |
| Type regen forgets to mirror new columns | Medium | CLAUDE.md rule: keep `src/integrations/supabase/types.ts` in sync in the same PR as the migration. CI build will fail on mismatched .insert / .update shape. |
| Slovak verbatim strings drift from spec | Medium | All new strings reviewed by ux-copy skill agent in Phase 5. |

## Branch + PR sequencing

- Branch: `feature/E49-tests-respondent-ops` (off `main`).
- PR-1 to PR-5 land sequentially on the branch. CF Pages preview builds after each push.
- Merge to `main` ONLY after Phase 5 closes + lint 0/0 + all suites green + privacy/cookies updates done.
- Migration SQL is **code only** on the branch — owner runs against prod Supabase after merge.

## DoD per phase

Mirrors CLAUDE.md § 2 + § 3:
1. Implementation lands in `src/**` and `supabase/migrations/**` (and `DEPLOY_SETUP.sql` mirror).
2. `src/integrations/supabase/types.ts` regenerated to match.
3. `npm run lint` → 0 errors / 0 warnings.
4. `npm test` → all green.
5. `npm run build` → ✓.
6. Story files updated to `✅ Done`.
7. CHANGELOG entry per phase.
8. Privacy / cookies updated when phase touches data surface (Phase 3 only).
9. Fresh-context CR via `general-purpose` agent ("review only, no edits") — issues triaged.
10. Plan file `~~strikethrough~~` for each `E49.x` row + status column.

## Cross-references

- E45 plan: `tasks/PLAN-2026-05-21-E45-test-detail-editor.md` (predecessor — editor + password + invites).
- E38 results evolution: `tasks/PLAN-2026-05-20-E38-results-evolution.md` (related — score / breakdown semantics).
- E48 ticketing test-infra: PR #156 (seed helpers + global teardown — reused here).
- E37 tests coverage plan: `tasks/PLAN-2026-05-20-E37-tests-coverage.md` (coverage philosophy reference).
- Existing test plans: `specs/app/tests-index.md`, `specs/app/test-editor.md` (extend, do not duplicate).
- AH-1.4: `tasks/stories/AH-1.4-test-and-session-tables.md` (canonical schema source).
- CLAUDE.md sections referenced throughout: § "Modals + confirmations", § "Test IDs", § "Git / deployment workflow", § "Style — Language rule".

## Sub-agent dispatch matrix (this epic)

| Need | Agent | Skill |
|---|---|---|
| Per-phase fresh-context code review | `general-purpose` | `engineering:code-review` |
| UX/UI critique on side-sheet + Results v2 + Settings card | `general-purpose` | `design:design-critique`, `design:accessibility-review` |
| Slovak UX copy review (every new string) | `general-purpose` (haiku — pattern-matching, no deep reasoning) | `design:ux-copy` |
| Security senior review (per phase + final) | `general-purpose` (opus — adversarial reasoning) | `security-review`, `engineering:code-review` |
| Test plan authoring for `specs/app/test-sessions-detail.md` etc. | `playwright-test-planner` | (built-in) |
| Spec implementation from plan | `playwright-test-generator` | (built-in) |
| Healing post-merge regressions | `playwright-test-healer` | (built-in) |
| Broad exploration if scope grows | `Explore` | n/a |
| Pre-flight rule: every agent gets `(repo path, paths to read, "review only, no edits or write only X")` boundary explicitly stated. | — | — |
