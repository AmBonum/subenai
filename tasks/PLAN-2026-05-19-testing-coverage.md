# PLAN — Testing Coverage Epic (Security + UI)

**Date:** 2026-05-19
**Status:** AWAITING APPROVAL
**Owner:** project owner
**Inputs:** 4 parallel senior agents (test inventory, security/RLS design, UI E2E architecture, test infrastructure)

## Locked constraints (project owner this session)
- **Test environment**: Mocked Supabase in Playwright via `page.route` (no real test Supabase project)
- **Phasing**: Auth-fixture-first; ~30 `e2e/specs/app/*` specs currently skipped on missing fixture
- **Visual regression**: Behavior-only (no snapshot diffing)
- **Sponsorship spec**: Already handled (1232-line spec exists, AH-16 URL updates applied)

---

## TL;DR

The 4 agents agree on the overall shape but the inventory + security audits surfaced **8 pre-test bugs that must land first** (Phase 0) — including 3 real RPC security holes (not test gaps): `get_peer_card` accepts arbitrary `p_user_id` without admin check; respondent RPCs rely solely on UUID secrecy; `finalize_respondent_session` doesn't bound `p_score`.

After Phase 0 cleanup, Phase 1 builds the auth fixture (`primeAuthSession` via `addInitScript`, mirroring existing `primeConsent`) + `mockSupabase` builder + seed library + Vitest helpers. This single phase **unblocks 12 currently-skipped specs** and enables ~337 new test cases across the 5 surfaces.

Phases 2-8 are mechanical coverage rollout — each phase ships ~30-90 test cases for one surface. Phase 9 wraps up security/GDPR/bundle-leak unit tests. Phase 10 (real RLS via pgTAP) is deferred as a separate epic — the mocked-Supabase constraint genuinely cannot prove real DB policy enforcement.

**Realistic scope**: ~337 test cases + ~50 POMs + ~55 spec files + infra. **~12-18 focused implementation sessions** in dependency order.

---

## Phase 0 — Pre-test cleanup (must land first)

The inventory audit + security audit each found bugs that aren't testing gaps but rather **real defects** that would corrupt test results or pose security risk. Fix before any new test lands.

### Bug list

| Bug | Source | Fix |
|---|---|---|
| **Consent version drift**: `e2e/fixtures/consent.ts:23` hardcodes `CONSENT_VERSION = "1.3.0"` with "KEEP IN SYNC" comment; actual is `1.4.0` in `src/lib/consent.ts` | Inventory §F | Update to `1.4.0`. Replace hardcoded constant with import from `src/lib/consent.ts` so they cannot drift again. |
| **`smoke.spec.ts` violates POM-only rule** (uses `page.locator("h1").first()` directly) | Inventory §F | Move to a POM getter (e.g. `HomePage.heroHeading`) or convert to a contract test under POM. |
| **`e2e/seed.spec.ts` is empty placeholder** (body just `// generate code here.`) | Inventory §F | Delete the file. Remove from `playwright.config.ts` testMatch if explicitly listed. |
| **`e2e/mocks/api/begin-edu-attempt.ts` is a dead mock** (file exists but no spec uses it) | Inventory §F | Delete; mock will be re-introduced when an edu-attempt spec is written. |
| **`get_peer_card(p_user_id)` accepts arbitrary uid** — non-admin caller can pass another user's id and get their cohort data | Security §I.1 | Add guard at top of RPC: `IF p_user_id IS NOT NULL AND p_user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;` Migration + DEPLOY_SETUP.sql update + unit test for the new behavior. |
| **Respondent RPCs rely solely on session_id UUID secrecy** — `submit_respondent_answer` + `finalize_respondent_session` have no caller-ownership check | Security §I.2 | Add a one-time `session_token` returned by `start_respondent_session` and required by submit/finalize as a second parameter. Migration alters all 3 RPCs + UI updates `TakeTestFlow` to pass token through. Backwards-compat: accept missing token for 7 days then enforce (or harder cut-over if no live in-flight respondents). |
| **`finalize_respondent_session` doesn't bound `p_score`** — anon caller could submit score=999 | Security §I.3 | Add `CHECK p_score BETWEEN 0 AND 100`; raise on out-of-bounds. Migration + unit test. |
| **No `@vitest/coverage-v8` installed** — no coverage measurement exists | Infra §F + Inventory §D | `npm install --save-dev @vitest/coverage-v8`. Add `coverage` block to `vitest.config.ts` with provider="v8", reporter=["text","lcov"], 70% threshold. Add `test:coverage` script to package.json. |

### Phase 0 effort estimate
~1-2 sessions. The 3 RPC fixes are the heaviest (each needs migration + types sync + caller update + test). Other items are < 30 min each.

---

## Phase 1 — Test infrastructure (the unblock)

Auth fixture + mock Supabase builder + seed library + Vitest enhancements. **Single phase, single PR** — these pieces must ship together because each test category depends on multiple.

### Deliverables

**`e2e/fixtures/auth.ts`** (new)
- `EDUCATOR_SESSION`, `ADMIN_SESSION` constants
- `primeAuthSession(context, page, session)` function — calls `context.addInitScript` to inject `sb-<project-ref>-auth-token` into `localStorage` + registers `page.route` intercepts for `/auth/v1/user`, `/auth/v1/factors`, `/auth/v1/level`
- Pattern: identical to existing `primeConsent` (called explicitly in `beforeEach`, not auto-fixture)

**`e2e/mocks/supabase/index.ts`** (new) — single builder:
```ts
mockSupabase(page, {
  profiles: [...],
  tests: [...],
  rpcs: { has_role: true, get_peer_card: {...} },
  auth: { aal: "aal2", factors: [{ id: "f1", status: "verified" }] },
  errors: { audit_log: { status: 401, code: "42501" } },
})
```
- Intercepts `**/rest/v1/<table>*` with simple `eq`/`in` filter parsing in-handler
- Intercepts `**/rest/v1/rpc/<fn>` with the `rpcs` lookup
- Intercepts `**/auth/v1/**` per the `auth` block
- Response envelope conformance (JSON array + `Content-Range` for count queries + Supabase error envelope shape)

**`e2e/seed/` directory** (new)
- `seedProfile`, `seedUserRole`, `seedTest`, `seedQuestion`, `seedSession`, `seedAudience`, `seedAnswerSet`, `seedNotification`, `seedTeam` factories
- Row shapes match `src/integrations/supabase/types.ts` exactly
- Counter-based IDs (`prof_e2e_001`, `tst_e2e_001`); `resetSeedCounters()` exported and called in `beforeEach`
- Composition helper `seedTestWithQuestions(count)` returns `{ test, questions[] }`

**Vitest helpers** (new files under `tests/utils/`)
- `auth-session-mock.ts`: `setActiveSession(session)`, `clearActiveSession()` — mutates the global stub for one test
- `rpc-mock.ts`: `stubRpc(fn, value)`, `resetRpcStubs()`
- `tests/setup.ts` extended with `afterEach(() => { clearActiveSession(); resetRpcStubs(); })`

**Mock-envelope conformance canary test** (Infra §H risk mitigation)
- `tests/lib/supabase/mock-envelope-conformance.test.ts` — asserts our mock-builder response shape matches the documented Supabase PostgREST envelope. Run on every CI build so drift fails loudly.

### Phase 1 effort: ~2-3 sessions

---

## Phase 2 — CI workflows + coverage baseline

Independent of Phase 1's E2E components; ships in parallel.

### Deliverables
- `.github/workflows/ci.yml` — Vitest + lint + build on every push/PR
- `.github/workflows/e2e.yml` — Playwright on push to main + manual dispatch + PR to main; uncomment `webServer` block in `playwright.config.ts`
- `vitest --coverage` wired with `@vitest/coverage-v8`; initial threshold 70% lines + functions, raise after Phase 3 un-skip
- Coverage artifact upload on CI runs

### Phase 2 effort: ~1 session

---

## Phase 3 — Un-skip existing specs (quick win)

12 specs under `e2e/specs/app/*` + `e2e/specs/admin/*` are currently `test.skip(true, "AH-11 fixture")`. Once Phase 1 ships, un-skip them and verify they pass against the mocked Supabase. Update existing POMs if assertions need adjustment.

### Phase 3 effort: ~1 session (mostly verification work)

---

## Phase 4 — Auth flow E2E (~51 cases, 7 spec files)

Per UI E2E §D. New POMs under `e2e/poms/auth/`.

| Spec file | Cases | Priority |
|---|---|---|
| `auth/login.spec.ts` | 10 | P1 (entry point) |
| `auth/signup.spec.ts` | 8 | P1 |
| `auth/forgot-password.spec.ts` | 5 | P1 |
| `auth/reset-password.spec.ts` | 5 | P1 |
| `auth/callback.spec.ts` | 5 | P1 |
| `auth/enroll-2fa.spec.ts` | 9 | P2 (admin-only flow) |
| `auth/verify-2fa.spec.ts` | 9 | P1 (AAL2 critical path) |

### Phase 4 effort: ~2-3 sessions

---

## Phase 5 — Marketing E2E (~50 cases, 10 spec files)

Per UI E2E §C. Mostly thin specs (smoke + CTAs); bundled by area.

Key wins:
- **`cross-cutting/redirects.spec.ts`** (3 TCs) — explicitly tests post-AH-16 301 redirects (`/podpora`→`/support` etc.)
- **`consent/cookie-banner.spec.ts`** (8 TCs) — Phase 0's consent-drift fix becomes regression-protected here
- **`cross-cutting/locale-lock.spec.ts`** (6 TCs) — current locale-disable state verified

### Phase 5 effort: ~2-3 sessions

---

## Phase 6 — /app surface E2E (~79 cases, 14 spec files)

Per UI E2E §E. After Phase 3 un-skips, this is the **net-new /app coverage** for routes built in /app redesign (digest, recommendations, retest, peer, onboarding).

| Spec | Cases | Notes |
|---|---|---|
| `app/onboarding.spec.ts` | 6 | New from Phase 3 of redesign |
| `app/dashboard.spec.ts` | 8 | Extend existing skipped spec |
| `app/retention-loops.spec.ts` | 12 | Digest+Recs+Retest+Peer in one file |
| `app/audiences.spec.ts` | 5 | |
| `app/library.spec.ts` | 3 | |
| ... 9 more | ~45 | |

### Phase 6 effort: ~3-4 sessions

---

## Phase 7 — /admin surface E2E (~90 cases, 16 spec files)

Per UI E2E §F. Heaviest single phase. AAL2-gated — `adminPage` fixture variant needed (Phase 1 supports).

Largest sub-specs:
- `admin/questions.spec.ts` (8) — CRUD with sk/en/cs i18n tabs
- `admin/users.spec.ts` (6) — role management
- `admin/aal2-gate.spec.ts` (3) — privilege escalation prevention
- `admin/tests.spec.ts` (6), `admin/answer-sets.spec.ts` (5)
- 11 more thin spec files (3-5 TCs each)

### Phase 7 effort: ~3-5 sessions

---

## Phase 8 — Quiz flow E2E + i18n lock (~32 cases, 6 spec files)

Per UI E2E §G + §H. Mostly anon flow — partially against real backend for static question data, partially stubbed for edge cases.

| Spec | Cases |
|---|---|
| `quiz/test-flow.spec.ts` | 10 (full happy path + trap dialog state isolation) |
| `quiz/shared-test.spec.ts` | 5 |
| `quiz/shared-result.spec.ts` | 3 |
| `quiz/slug-redirect.spec.ts` | 2 |
| `quiz/composer.spec.ts` | 6 (requires auth fixture) |
| `cross-cutting/locale-lock.spec.ts` | 6 |

### Phase 8 effort: ~2 sessions

---

## Phase 9 — Security/RLS/GDPR/Bundle-leak (Vitest)

Per Security agent §B-G. Mostly Vitest unit tests with mocked supabase — Playwright slice is small (cookie banner, DSR flow).

### Sub-phases

**9a — Auth-flow VU tests** (~30 cases)
- AUTH-LOGIN-01..06, AUTH-SIGNUP-01..04, AUTH-FORGOT-01..04, AUTH-RESET-01..04, AUTH-CB-01..04, AUTH-2FA-EN-01..04, AUTH-2FA-VR-01..04
- Mostly extend existing `tests/routes/login/*.test.tsx` files with new cases

**9b — RLS shape tests** (~25 cases)
- Per Security §C table, assert client-side query shape (`.eq('owner_id', uid)` present, no `select('*')` cross-tenant)
- `attempts_anon` view definition snapshot test (read migration SQL, regex-assert no `respondent_name`/`respondent_email`)

**9c — SECURITY DEFINER RPC tests** (~15 cases)
- Per RPC: input edge cases + privilege boundary at the mock layer
- Note: real privilege escalation tests deferred to Phase 10 (pgTAP)

**9d — Bundle-leak scanner** (~3 cases)
- Extend `scripts/check-bundle-no-mocks.mjs` → `scripts/check-bundle-no-secrets.mjs`
- Forbidden patterns: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, etc.
- Allowlist anon JWT prefix constant
- CI prebuild hook + Vitest test that runs the script against poisoned fixture

**9e — GDPR/cookie/PII matrix** (~12 cases)
- Cookie consent: accept/reject/mixed/version-bump (4 Vitest + 2 Playwright)
- DSR flow: educator submit, admin sees (4 cases)
- PII redaction: attempts_anon, peer-card k-anon, trap-popup state isolation (3 cases)

**9f — Rate limiting closure** (deferred to "should-have" — Phase 11 or later epic)
- Per Security §G: `start_respondent_session`, `log_audit_event`, `submit_respondent_answer` need per-IP/per-session limits added BEFORE testing them

### Phase 9 effort: ~3-4 sessions

---

## Phase 10 — Real RLS via pgTAP (DEFERRED — separate epic)

Per Security §I.4 + Infra §H.1.

**Why deferred**: The mocked-Supabase constraint cannot prove what the real database does under RLS — only what the client *expects* to do. For genuine policy enforcement coverage, we need pgTAP tests running against a Supabase branch DB with seeded fixtures.

**Recommended approach** (when this epic gets prioritized):
- Stand up Supabase branching for the project
- Create `supabase/tests/pgtap/` directory
- Write per-table `_select_policy.sql`, `_insert_policy.sql`, `_update_policy.sql` tests
- CI runs pgTAP suite against the branch
- Goal: cover the ~6 highest-value tables (sessions, session_answers, audit_log, profiles, user_roles, mfa_backup_codes) first

This is a **multi-session epic on its own**. Track separately. Don't block this epic on it.

---

## Decisions awaiting project owner

| # | Decision | My recommendation | Confirm? |
|---|---|---|---|
| **D1** | Phase 0 RPC security fixes: fix the 3 bugs (get_peer_card uid check, session_token guard, finalize score bound) before any tests? | **Yes — fix first.** They're real holes; tests of buggy behavior would lock bugs in. | ☐ |
| **D2** | Vitest coverage threshold | Start at 70% lines + functions; raise to 80% after Phase 3 un-skip lands ~30 more cases | ☐ |
| **D3** | Phase 10 pgTAP epic: defer entirely (Recommended), run parallel to this epic, or skip | **Defer.** Mocked-Supabase coverage gets us to "ship safely"; pgTAP gets us to "audit-ready" — separate question | ☐ |
| **D4** | Quiz flow E2E: against real backend (Recommended), or fully stubbed | **Real backend** — quiz questions are static, dev stack is always-on, full-stub adds maintenance burden | ☐ |
| **D5** | GitHub Actions CI: do we have GitHub Actions enabled for this repo? | If yes — Phase 2 ships standard workflows. If no — keep local-only `npm` scripts; manual CI gate | ☐ |
| **D6** | Existing `e2e/seed.spec.ts` (empty placeholder): delete (Recommended) or write content? | **Delete** — purposeless artifact | ☐ |
| **D7** | Auth fixture session_token approach for Phase 0 respondent RPC fix: 7-day backwards-compat window (Recommended), or hard cut-over | **7-day window** — accept missing token for live in-flight respondents | ☐ |

---

## Risk register

| # | Risk | Source | Mitigation |
|---|---|---|---|
| R1 | Mock drift from real Supabase API (envelope shape change) | Infra §H | Canary test in Phase 1 that imports real PostgREST fixture from Supabase SDK helpers |
| R2 | `sb-<project_ref>-auth-token` key derivation differs between dev/prod | Infra §H + UI E2E §L | Helper computes key from `VITE_SUPABASE_URL` env var at runtime; documented in `auth.ts` |
| R3 | Auth fixture must also stub `/auth/v1/factors` for MFA paths — separate from `/rest/v1/` | Infra §H + UI E2E §L.7 | Phase 1 explicitly covers; verified via network trace before merge |
| R4 | `page.route` glob specificity: most-recently-registered wins | UI E2E §L.3 | `mockSupabase` builder documents invariant; ordering preserved by Object.entries(shape) order |
| R5 | `requireRole('admin')` calls `has_role` RPC on every navigation — stub must persist across pages within a test | UI E2E §L.4 | `adminPage` fixture registers `has_role` stub at context level (persists), not per-page |
| R6 | Quiz flow specs depend on real backend running | UI E2E §L.6 | Backlog: add `stubQuizQuestions` helper for fully-offline CI runs |
| R7 | Real RLS enforcement NOT validated by mocked-Supabase tests — only query shape | Security §I.4 + Infra §H | Phase 10 pgTAP epic deferred but tracked. Phase 9b documents what VU-shape can vs cannot prove. |
| R8 | Rate limiting gaps in `start_respondent_session`/`log_audit_event` need code changes before testable | Security §G | Phase 9f tracks; ship code+tests in same PR |
| R9 | `networkidle` waits in BasePage may flake under heavy mock load | UI E2E §L.5 | Replace `networkidle` with explicit `waitForSelector` on a settled-state testid |
| R10 | CONSENT_VERSION drift again (1.3.0 vs 1.4.0 today) | Inventory §F | Phase 0 fix imports from `src/lib/consent.ts` directly; impossible to drift |

---

## Effort summary

| Phase | Sessions | Test cases | Notes |
|---|---|---|---|
| 0 — Pre-test cleanup | 1-2 | 0 (fixes only) | 3 RPC bugs + 5 hygiene fixes |
| 1 — Infrastructure | 2-3 | 0 (infra only) | Auth fixture + mockSupabase + seed + Vitest helpers + canary |
| 2 — CI workflows | 1 | 0 (infra) | Optional if no GitHub Actions |
| 3 — Un-skip existing | 1 | +12 (was 0/12) | Quick win — un-skips dashboard, shell, account-profile, account-security, help, notifications, teams, new-test-wizard, test-editor, answer-set-editor, admin-test-editor |
| 4 — Auth E2E | 2-3 | ~51 | 7 spec files + 7 POMs |
| 5 — Marketing E2E | 2-3 | ~50 | 10 spec files |
| 6 — /app E2E | 3-4 | ~79 | 14 spec files + 11 POMs |
| 7 — /admin E2E | 3-5 | ~90 | 16 spec files + 9 POMs |
| 8 — Quiz + i18n | 2 | ~32 | 6 spec files + 3 POMs |
| 9 — Security/GDPR/Bundle | 3-4 | ~85 | Mostly Vitest unit |
| **Total (Phases 0-9)** | **20-29 sessions** | **~399 cases** | |
| 10 — pgTAP (DEFERRED) | separate epic | TBD | Real RLS coverage |

**Realistic wall-clock**: 4-6 weeks of focused engineering at 1-2 sessions per workday.

---

## Followups (post-PLAN)

- **R8 peer-card emotional valence research** (from /app redesign PLAN — still open)
- **AH-12 schema enrichment** — `/app/library`, `/app/tests/new`, `/app/sets/$setId` still on mock data; tests of those routes will need stub data until schema lands
- **pg_cron activation** for digest/recs/retest jobs
- **Phase 10 pgTAP** for real RLS coverage

---

## Next step

Project owner reviews + answers D1-D7. After approval, **Phase 0 dispatches as first commit** (RPC fixes + hygiene cleanup). Phase 1 follows immediately. Each subsequent phase one at a time, with intermediate verification gates.
