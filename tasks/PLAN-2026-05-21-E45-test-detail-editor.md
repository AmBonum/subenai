# E45 — Test detail editor + password protection + email invites

**Owner:** Claude — drives the user-facing editor on `/app/tests/$testId` so authors can manage questions, lock the test with a password, and send invites by email — closing the "create-test" → "share" loop after publish.
**Date opened:** 2026-05-21
**Status:** 🟢 Phase 1 + Phase 2 done (questions + order + password merged / pending merge on `feature/E45-phase-2-password`) — Phases 3-4 still pending.
**Originating request:** From the test detail page (`/app/tests/$testId?tab=results`), the author should be able to: (1) edit questions — add / remove / reorder — and choose random vs fixed order; (2) set, change, or clear a password that respondents must enter before taking the test; (3) send the test link + password to a list of email addresses, all from the same screen. All four sub-features must hold senior-level UX/UI, full coverage by unit + integration + security + functional tests.

## TL;DR

The `/app/tests/$testId` route already has three tabs (results / analytics / settings). Today none of them lets an author **modify the test after publish** — the test is frozen at the shape it had during the create-test wizard. That contradicts the marketplace value prop (templates → my test → iterate). This epic closes the loop:

- New **Questions** tab — list, add (via the QuestionPickerDialog from PR #79), remove, up/down reorder. Counter + template-source badge port across.
- Settings tab gains **Question order**: `fixed` (current behavior) | `random` (shuffle per session, seeded by session id for determinism within a single take).
- Settings tab gains **Password** card: set / change / clear. Bcrypt hash via `pgcrypto` (the same RPC family as `hash_test_set_password` used for edu test_sets).
- New **Invite by email** section — recipients composer, Slovak template, sent via existing Resend infra in `functions/_lib/email.ts`. Per-test + per-IP rate limits. Each invite written to audit log.
- Respondent take flow (`t/$shareId`) gates entry behind password if `tests.password_hash IS NOT NULL`, and shuffles questions deterministically when `question_order_mode = 'random'`.

The schema already supports most of it: `tests.password_hash` exists; `test_questions(test_id, question_id, position)` exists. Two new pieces needed: `tests.question_order_mode` enum (new column) and a verify-password endpoint adapted for the `tests` table (the existing `verify_test_set_password` RPC works on the separate `test_sets` table).

## Scope

### In (across all 4 phases)

- DB: `tests.question_order_mode` enum + index; reuse `tests.password_hash` (existing); new RPCs `hash_test_password` + `verify_test_password` mirroring the test_set RPCs but pointed at `tests`.
- Queries: `useTestQuestions(testId)`, `useUpdateTestQuestionOrder(testId)`, `useAddQuestionsToTest`, `useRemoveQuestionFromTest`, `useSetTestPassword`, `useClearTestPassword`, `useUpdateTestOrderMode`, `useSendTestInvites`.
- `/app/tests/$testId` route: new **Questions** tab; Settings tab gains Password card + Order mode toggle; Share section gains Invite-by-email composer.
- Respondent route `t.$shareId`: password gate component before TestFlow when `password_hash IS NOT NULL`; TestFlow respects `question_order_mode` with a deterministic shuffle seeded by `session_id`.
- CF Function `functions/api/tests/verify-password.ts` (rate-limited, per-IP + per-share_id) returning a short-lived `respondent_pwd_jwt` cookie so the take flow can proceed.
- CF Function `functions/api/tests/send-invites.ts` (per-author-day quota + per-test quota, audit logged, Slovak email template).
- Email template `tests-invite-email` in `functions/_lib/email-templates.ts`.
- i18n: Slovak verbatim copy + EN/CS translations across all new strings.
- Tests: unit (queries, password hashing helper, shuffle determinism), component (Questions tab editor, Password card, Order mode toggle, Invite dialog), integration (CF function for verify-password + send-invites + RLS contract), security (brute-force protection, email spam protection), e2e (full flow from author edit → respondent password-gate → take in correct order).
- Docs: 4 story files (per phase) + CHANGELOG entry + 4 planning appendices.

### Out — explicitly NOT done in this epic

- **Test versioning / history.** Edits land on the live test. (E44 D-out already lists this.)
- **Bulk recipient import from CSV.** Recipients via textarea or audience group selector only. CSV import is Phase 5+.
- **Email open / click tracking.** Out of scope; Resend has it but we'd need /privacy update.
- **2FA / magic-link auth on the password gate.** Plain password only — same level of security as edu test_sets today.
- **Custom email branding per author.** Single platform-wide Slovak template.
- **Mobile push notifications** when invite arrives. Email only.
- **Editing the original template** when modifying the test forked from it. (Templates and tests are independent after duplicate; that's E44 D5.)
- **Audit-log surface in /app/tests/$testId.** Audit rows are written; UI to view them is /admin only.

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| D1 | **`question_order_mode` is a new enum column** on `public.tests`: `fixed` / `random`. Default `fixed` (current behaviour). No data migration needed (existing rows get default). | Smallest schema change; keeps semantics explicit in DB |
| D2 | **Random order is seeded by `session.id`**, not random per request. Same respondent reloading the take page sees the same order. Different respondents see different orders. | Determinism inside a session = critical for anti-cheat (server keeps `respondent_answer` indexed by question_id, not position — order only affects UI) |
| D3 | **Password uses the existing `tests.password_hash` column + pgcrypto bcrypt** via new RPCs `hash_test_password` (SECURITY DEFINER, owner-or-admin only) and `verify_test_password` (SECURITY DEFINER, anon-callable, rate-limited at the CF function layer). | Reuses the proven E12 edu pattern. No new dependency. |
| D4 | **Brute-force protection at the CF function layer**, not at the RPC. Per-IP rate limit (5 attempts / 15 min / share_id) + global per-share_id rate limit (50 attempts / hour / share_id). | Existing `_lib/security.ts` ipRateLimit + a new sharedShareIdRateLimit |
| D5 | **`respondent_pwd_jwt` is a short-lived (30 min) HttpOnly cookie**, signed with existing `JWT_SECRET`, scoped to one `share_id`. Once issued, the take flow reads it on every request to `/t/<share_id>` and bypasses the password gate until expiry. | Avoids re-asking on every refresh. 30 min == typical test duration. |
| D6 | **Send-invites endpoint posts via Resend** using existing `functions/_lib/email.ts`. **Per-author daily quota 200, per-test daily quota 100, per-IP per hour 50.** Each invite = 1 audit row. | Anti-spam at sender side (we paid Resend); audit row supports DPO inquiries. |
| D7 | **Email body always carries the share link**; **password included verbatim only if author opts in** via a per-send checkbox ("Send password in this email" — defaults to OFF; if OFF, link only + instruction "Author will share the password separately"). | Senior-level threat model: putting both link + password in a single email body weakens password protection by removing the second factor (out-of-band password). User can override. |
| D8 | **Question editing is owner-only** (RLS already enforces this on `tests` table — the existing `test_questions` policies inherit owner via `test_id` lookup). No change to RLS. Author cannot edit questions on a test someone else owns even if they're team-shared (Phase 1 keeps owner-only). | Team-shared edit is a future iteration; today's invariant is "you edit only your tests". |
| D9 | **Random order does NOT randomize answer options** within a question (only question sequence). | Answer-option randomization is a separate anti-cheat axis with its own UX considerations (correct-answer markers, branch semantics). Out of scope for E45. |
| D10 | **Branch + PR split: one PR per phase.** Phase 1 (questions + order mode) ships independently — high value, low risk. Phase 2 (password) is a separate PR because it adds a new attack surface (verify-password endpoint) and deserves an isolated security review. Phase 3 (invites) needs Resend env vars in CF Pages and deserves its own deploy checklist. Phase 4 = e2e + docs polish. | Smaller PRs = faster review + safer revert |

## Phase map

### Phase 1 — Question editor + Random vs Fixed order (PR-1)

| ID | Title | Effort | Priority | Status |
|---|---|---|---|---|
| ~~E45.1 Migration `20260521210000_test_question_order_mode.sql` — enum + columns + DEPLOY_SETUP mirror + supabase types~~ | (closed) | `S` | `P1` | ✅ Done |
| ~~E45.2 Queries: `useAddQuestionsToTest`, `useRemoveQuestionFromTest`, `useUpdateTestQuestionOrder`, `useUpdateTestOrderMode`~~ | (closed) | `S` | `P1` | ✅ Done |
| ~~E45.3 `/app/tests/$testId` UI: new "Questions" tab + Order Mode toggle in Settings + i18n sk/en/cs~~ | (closed) | `M` | `P1` | ✅ Done |
| ~~E45.4 Respondent flow: TestFlow respects `question_order_mode` — seeded shuffle by `session_id` when `random`~~ | (closed) | `S` | `P1` | ✅ Done |
| ~~E45.5 Tests: shuffle determinism (18) + QuestionsEditor (6) + OrderModeToggle (3) + route test extensions~~ | (closed) | `M` | `P1` | ✅ Done |
| ~~E45.6 Docs: stories E45.1-4 + CHANGELOG entry~~ | (closed) | `XS` | `P2` | ✅ Done |

### Phase 2 — Password protection (PR-2)

| ID | Title | Effort | Priority | Status |
|---|---|---|---|---|
| ~~E45.7 Migration: new RPCs `hash_test_password` + `verify_test_password` + `clear_test_password` (SECURITY DEFINER + body owner check + audit) + `password_hash_version` column~~ | (closed) | `S` | `P1` | ✅ Done |
| ~~E45.8 Queries: `useSetTestPassword`, `useClearTestPassword`; `Test.has_password` + `Test.password_hash_version` exposed (raw hash never on client)~~ | (closed) | `S` | `P1` | ✅ Done |
| ~~E45.9 CF Function `functions/api/tests/verify-password.ts` (3-layer rate limits + 100ms jitter + audit row per attempt) + preflight `check-password.ts` + `signRespondentPwdToken`/`verifyRespondentPwdToken` in `_lib/jwt.ts`~~ | (closed) | `M` | `P1` | ✅ Done |
| ~~E45.10 UI: `PasswordCard` in Settings tab + `RespondentPasswordGate` at `/t/$shareId` (preflight on mount, gate iff `has_password && gated`) + i18n sk/en/cs. **zxcvbn-lite deferred to Phase 4 polish.**~~ | (closed) | `M` | `P1` | ✅ Done |
| ~~E45.11 Tests: 8 JWT roundtrip, 9 verify-password CF (rate-limit boundary, T2 oracle, cookie scope, log-bomb), 6 PasswordCard, 5 RespondentPasswordGate, 4 t-shareId route adapted~~ | (closed) | `M` | `P1` | ✅ Done |
| ~~E45.12 Docs: 4 stories E45.7-10 + CHANGELOG + PLAN flip~~ | (closed) | `S` | `P2` | ✅ Done |

### Phase 3 — Email invites (PR-3)

| ID | Title | Effort | Priority | Status |
|---|---|---|---|---|
| E45.13 | Email template `tests-invite-email` in `functions/_lib/email-templates.ts` (Slovak) | `S` | `P1` | ⏳ Blocks on PR-2 |
| E45.14 | CF Function `functions/api/tests/send-invites.ts` — per-author + per-test + per-IP rate limits; audit log per recipient | `M` | `P1` | ⏳ Blocks on PR-2 |
| E45.15 | UI: Invite dialog on test detail — recipients composer, audience group selector, "include password" opt-in checkbox | `M` | `P1` | ⏳ Blocks on PR-2 |
| E45.16 | Tests: integration tests for invite endpoint, audit assertion, rate-limit, "include password" path branches | `M` | `P2` | ⏳ Blocks on PR-2 |
| E45.17 | Docs + ops runbook (Resend env vars, deliverability monitoring) + CHANGELOG | `S` | `P2` | ⏳ Blocks on PR-2 |

### Phase 4 — E2E + polish (PR-4)

| ID | Title | Effort | Priority | Status |
|---|---|---|---|---|
| E45.18 | Playwright e2e: author edit → set password → invite → respondent password-gate → take in random order | `L` | `P2` | ⏳ Blocks on PR-3 |
| E45.19 | Security review fresh-context (RLS, JWT, rate-limits, audit) + privacy delta (invite-emails as processor data flow) | `M` | `P1` | ⏳ Blocks on PR-3 |
| E45.20 | Final CHANGELOG epic line + epic close-out in PLAN file | `XS` | `P2` | ⏳ Blocks on PR-3 |

## Open questions

| ID | Question | Phase | Default if not answered |
|---|---|---|---|
| Q1 | Does the password apply BEFORE the intake form (name+email collection) or AFTER? | 2 | **Before** — protects PII collection too |
| Q2 | When author CHANGES password, do existing respondent JWTs invalidate immediately? | 2 | Yes — incl. JWT signature checks `password_hash_version` claim, bumped on every password change |
| Q3 | Max recipients per single invite send? | 3 | **50** — keeps per-test daily quota meaningful, prevents accidental mass-send |
| Q4 | Does deleting a question with respondent answers cascade-delete those answers? | 1 | **No** — RESTRICT. Author must accept "remove only if no responses yet" or duplicate the test to a new version. Surface in UI with explicit error. |

## Risks

| ID | Risk | Mitigation |
|---|---|---|
| R1 | Question delete breaks historical session_answers FK | DB-level RESTRICT on `test_questions.question_id` (already present); UI catches the FK error and shows actionable error |
| R2 | Random order changes after respondent reloads | D2 mitigation: seed shuffle by `session.id` (PK exists from session-start time) |
| R3 | Email-as-spam — author DDOS sends thousands of invites | D6 mitigation: 3 layers of rate limits + audit log |
| R4 | Password verification timing attack | bcrypt is constant-time (variability < 1ms); CF function adds 100ms random jitter to obscure absent-hash vs failed-verify |
| R5 | Author rotates password while respondent is mid-test | D5/Q2 mitigation: `password_hash_version` claim on JWT; reissue forces re-auth, in-flight session keeps current answers (server-side state) but next "next" click 401-s → respondent prompted to re-enter |
| R6 | Resend send failure leaves orphaned audit rows | Wrap audit insert + Resend send in a try/finally; mark audit row `status='sent'` only after Resend 2xx |
| R7 | Author accidentally sends password in email body | D7 mitigation: opt-in checkbox defaults OFF + warning text ("This weakens the second-factor — author shares password separately is safer") |

## Sub-agent appendices (planning depth)

Four appendices, produced in parallel by four planning subagents with skill activations, populate `tasks/E45-appendix-*.md`:

- **Appendix A — Security audit + brute-force model + audit logging.** Spawn `engineering:code-review` + `engineering:architecture` skills. Deliverable: threat model for the verify-password endpoint, JWT claim schema, rate-limit matrix with concrete thresholds + reasoning, RPC SECURITY DEFINER scope, audit-log row schema for each new action.
- **Appendix B — Email + invite design.** Spawn `marketing:draft-content` + `engineering:documentation` skills. Deliverable: verbatim Slovak email subject + body (text and HTML), GDPR processor analysis for Resend (already disclosed per E11), Resend env var inventory, deliverability checklist (SPF/DKIM/DMARC on subenai.sk), bounce + complaint handling, rate-limit matrix.
- **Appendix C — UX/A11y for the test detail editor.** Spawn `design:design-critique` + `design:accessibility-review` skills. Deliverable: critique of the current `/app/tests/$testId` route, layout for the new Questions tab + Password card + Invite dialog, dialog ARIA contracts, mobile-first specs at 320px, keyboard map (`E` = edit, `D` = duplicate, `Del` = remove, `J/K` = reorder up/down, mirroring the templates list keyboard map from E44.3 Appendix D), test-id inventory.
- **Appendix D — Respondent flow + shuffle determinism + password-gate UX.** Spawn `design:user-research` + `engineering:system-design` skills. Deliverable: state machine for the respondent take flow with password gate + intake form + question order resolution, deterministic-shuffle algorithm (Fisher-Yates seeded by session.id hashing to a 32-bit integer), error paths (wrong password, expired JWT, in-flight session + password change), UX copy for each error state (Slovak verbatim).

Each appendix lands at `tasks/E45-appendix-{A,B,C,D}.md`. Phase implementation stories cite the appendix sections as their acceptance criteria source-of-truth.

## Branch + PR sequencing

- **PR-1** (Phase 1) — `feature/E45-phase-1-questions-order` from latest main.
- **PR-2** (Phase 2) — branches from PR-1 once merged, or layered if PR-1 is in-flight.
- **PR-3** (Phase 3) — same.
- **PR-4** (Phase 4) — final epic-close PR.

Each PR independently mergeable; CHANGELOG `[Unreleased]` accumulates bullets per phase until release cut.

## DoD per phase (mirrors CLAUDE.md § 2 + § 3)

- Lint 0/0
- All tests green (unit + component + integration + security where applicable)
- Build ✓
- Phase-specific story files marked ✅ Done
- CHANGELOG `[Unreleased]` bullet
- Post-merge smoke check on production: phase-1 = open /app/tests/$testId, new tab visible; phase-2 = curl POST /api/tests/verify-password returns 401 unauthorized for a valid share_id with wrong password; phase-3 = curl POST /api/tests/send-invites returns 401 / works for the test owner.
- Migration applied to prod Supabase before code-deploy (user-driven per CLAUDE.md DB rule).

## Cross-references

- E44 Phase A — established the templates table + ownership model; this epic edits the tests forked from templates.
- E44 Phase B — established the AI precheck pattern for user-generated content + Resend / Anthropic env var patterns; E45 Phase 3 reuses the email infrastructure.
- E12 (edu mode) — established the bcrypt password pattern for test_sets; E45 Phase 2 mirrors it on the `tests` table.
- PR #79 — `QuestionPickerDialog` component; E45 Phase 1 reuses it in the test detail editor.
