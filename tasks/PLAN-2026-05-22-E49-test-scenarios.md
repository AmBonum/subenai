# E49 Phase 1c — Comprehensive test-scenario plan for `/app/tests` respondent drill-down

**Owner:** Claude — own this until every scenario below has a green test in the right layer (mock-UI / live-integration / prod-smoke). No "spustil som existujúci spec a 18 padlo" again — every TC is preconditioned, has positive + negative pair, asserts a concrete observable, and tears down its own data.
**Date opened:** 2026-05-22
**Status:** 🟡 Planning — implementation begins ONLY when this plan is committed and you approve.
**Parent epic:** E49 — `tasks/PLAN-2026-05-22-E49-tests-respondent-ops.md`
**Predecessor:** Phase 1a (`b9fc9ed`) + Phase 1b (`bf77f91`) shipped the feature surface. This Phase 1c hardens the test coverage to senior level.

## Originating feedback (verbatim, Slovak)

> "lepšie keď to otestuješ s test userom, ktorý tam bude mať už všetky potrebné dáta, ktoré si nasimuluješ … chcem to mať otestované skrz na skrz, s rôznymi scenármi a najmä nech to je e2e … dôkladne si to naplánuj a aj pozitívne a aj negatívne scenáre. Chcem to na senior úrovni!"

Translation in one line: **deterministic seeded test users + data, full positive AND negative coverage, e2e flavour, senior-level discipline.**

## TL;DR

The 19 TCs in `e2e/specs/app/test-sessions-detail.spec.ts` cover the **happy path** of the new feature but leave 80% of the realistic regression surface unprotected. This plan inventories **80+ scenarios** across 8 categories, assigns each to one of three test layers (mock-UI / live-integration / prod-smoke), defines **5 deterministic test users** with **15 deterministic data fixtures**, and prescribes an idempotent SQL seed + cascade teardown so every test run starts and ends with **zero `e2e-e49-*` rows** in production-shape Supabase.

The work is split into 4 phased PRs:
- **Phase 1c-1**: test-user + SQL seed + teardown scaffolding (no scenarios yet — pure infra).
- **Phase 1c-2**: live-Supabase playwright project + first batch of integration TCs (10 negative scenarios that the mock cannot exercise).
- **Phase 1c-3**: comprehensive expansion of `test-sessions-detail.spec.ts` from 19 → ~55 TCs (positive depth + negative breadth on the mock layer).
- **Phase 1c-4**: prod-smoke canary spec (8 TCs against `subenai.sk` proper).

## The three test layers

| Layer | Project | Where data lives | What it catches | Speed | When it runs |
|---|---|---|---|---|---|
| **A. Mock UI** | `e2e-chromium`, `e2e-mobile-chromium`, `e2e-tablet-chromium` | `e2e/seed/sessions.ts` in-memory | Component contracts, DOM test-ids, Slovak strings, A11y, mobile/tablet, IDOR via in-memory guard, XSS in render path | <1 min for full suite | every push (CI) + local |
| **B. Live integration** | `e2e-live-supabase` (NEW) | Local `supabase start` instance, seeded via `e2e/seed/sql/e49-e2e-data.sql` | RLS contracts, real PostgREST `or()` filters, real RPC behaviour, audit_log writes, rate limits, attempt-limit triggers (Phase 3 prep), CF function auth + same-origin + rate-limit | 3-5 min | `e2e:full` label + nightly |
| **C. Prod smoke** | `prod-smoke` | Production `subenai.sk` + production Supabase, seeded via `e2e/seed/sql/e49-prod-smoke.sql` | "Does this code actually work on the real CF Pages bundle with the real Supabase RLS for our deployed test users" — 1× per merge to main + manual | 30-90s | post-deploy job + on-demand |

**A rule a senior wouldn't violate**: every scenario lives at the **lowest layer that can still catch its regression**. Re-running A's IDOR test against B is duplication; running B's RLS contract against A is impossible by definition.

## Test-user matrix (deterministic, idempotent, cleaned)

| Handle | E-mail | Role | Aim | Used by |
|---|---|---|---|---|
| **TU-A** | `e2e-e49-educator-a@subenai.test` | `user` | Primary test author. Owns 5 tests across all statuses. | A, B, C |
| **TU-B** | `e2e-e49-educator-b@subenai.test` | `user` | Foreign owner — IDOR scenarios (TU-A tries to read TU-B's sessions). | A, B |
| **TU-Anon** | (no account) | — | Anonymous respondent submitting via `/t/<shareId>`. | B (live-supabase fill flow) |
| **TU-Resp** | `e2e-e49-respondent@subenai.test` | `user` | Logged-in respondent — covers "what happens if a respondent who has an account fills out a test under their own e-mail". | B |
| **TU-Admin** | `e2e-e49-admin@subenai.test` | `admin` (via `user_roles`) | Admin viewing the same surfaces. Confirms admin's `/app/*` view is identical to owner's (the admin UI is `/admin/*`). | B, C |

**Why not `audit-bot@subenai.test`**: that account is for manual one-off browser probing per `[[audit-test-user]]` memory. Automated e2e gets its own accounts so manual audits don't fight test runs for state.

**Seed**: `supabase/scripts/seed-e49-e2e-users.sql` — idempotent `INSERT ... ON CONFLICT (id) DO UPDATE`. Encrypted password hash hardcoded for `e2e-test-password-do-not-use-anywhere-else`. Profile + consent rows + `user_roles` membership all in one transaction. Never run against prod by default — script aborts unless `E49_E2E_SEED_FORCE=1` is set, to prevent accidental staging-into-prod.

## Test-data fixtures (deterministic UUIDs, `e2e-e49-*` prefix)

All UUIDs literal so SQL teardown can prefix-match. All IDs documented inline in `e2e/seed/fixtures/e49-fixtures.ts` so tests reference symbolic constants, not magic strings.

### Tests owned by TU-A
| ID | Title | Status | Password | Questions | Sessions |
|---|---|---|---|---|---|
| `e2e-e49-test-empty-published` | "E49 — prázdny test" | `published` | none | 5 | 0 (covers "test with zero respondents" empty state) |
| `e2e-e49-test-typical-published` | "E49 — typický test" | `published` | none | 5 | 5 (named, email-only, anon, in_progress, abandoned) |
| `e2e-e49-test-pw-protected` | "E49 — chránený heslom" | `published` | yes | 5 | 1 (completed, post-password) |
| `e2e-e49-test-large-published` | "E49 — veľký test" | `published` | none | 50 | 47 (mix; covers pagination across 3 pages of 20) |
| `e2e-e49-test-archived` | "E49 — archivovaný" | `archived` | none | 5 | 12 (frozen — author can view but not edit) |
| `e2e-e49-test-draft-empty` | "E49 — koncept" | `draft` | none | 0 | 0 (covers "draft can't have sessions" + "0 questions" empty state of side-sheet) |
| `e2e-e49-test-with-xss-respondent` | "E49 — XSS-payload respondent" | `published` | none | 3 | 5 (every payload from `tests/security/e48-payloads.ts` injected into intake_data.name) |

### Tests owned by TU-B (IDOR universe)
| ID | Title | Status | Use |
|---|---|---|---|
| `e2e-e49-test-foreign-published` | "E49 — cudzí test" | `published` | TU-A tries to read this — must 404 |
| `e2e-e49-test-foreign-with-sessions` | "E49 — cudzí test so session-mi" | `published` | TU-A tries to deep-link `<foreign-test-id>/sessions/<foreign-session-id>` — must 404 |

### Sessions under `e2e-e49-test-typical-published`
| ID | Status | Intake | Score | Answers | Notes |
|---|---|---|---|---|---|
| `e2e-e49-sess-completed-named` | completed | name + email | 85 | 5 | Identity precedence — name wins |
| `e2e-e49-sess-completed-email-only` | completed | email only | 60 | 5 | Identity precedence — email |
| `e2e-e49-sess-completed-anon` | completed | empty | 40 | 5 | "Anonymný respondent" fallback |
| `e2e-e49-sess-in-progress` | in_progress | name | null | 2 of 5 (one incorrect, one correct) | Empty answers IS NOT the trigger — this has *some* answers |
| `e2e-e49-sess-abandoned` | abandoned | name | null | 0 | Empty-answers in non-in_progress state |
| `e2e-e49-sess-in-progress-zero-answers` | in_progress | empty | null | 0 | The actual "empty in-progress" copy trigger |

### Sessions under `e2e-e49-test-with-xss-respondent`
For each payload in `tests/security/e48-payloads.ts` (XSS subset), one session whose `intake_data.name` carries the payload. Used by negative scenarios N19–N21.

### Sessions under `e2e-e49-test-large-published`
47 sessions deterministic-generated: `e2e-e49-sess-large-001` … `-047`, scores cycling 10..95, statuses round-robin completed/completed/completed/in_progress.

### Sessions for CSV-formula injection
Three sessions under `e2e-e49-test-typical-published` with intake names `=cmd|'/c calc'!A1`, `+1+2`, `-2-3`, `@SUM(A1:A10)`, `\tinjected`, `\rinjected`. Used by negative scenario N22–N25.

### Sessions for "stale question" edge
One session whose `session_answers.question_id` points to a question that was later deleted. UI must render the answer with a "Otázka už neexistuje" placeholder, not crash. Used by negative scenario N30.

### Questions library (`e2e-e49-q-*`)
- 5 questions used by tests above; one with `correct` jsonb array (`["a","b"]`), one with `correct` string, one with `correct` null.
- 1 question that becomes "deleted" mid-test via teardown helper — its rows in `test_questions` are removed but a `session_answers` row referencing it survives.

## SQL seed strategy

File: `e2e/seed/sql/e49-e2e-data.sql`.

```sql
-- E49 e2e fixtures. Idempotent. Safe to re-run.
-- Cleanup: tasks/PLAN-2026-05-22-E49-test-scenarios.md § "Teardown".
begin;

-- Users (delegated to seed-e49-e2e-users.sql; this file assumes they exist).

-- Questions library
insert into public.questions (id, type, prompt, correct, status, ...)
values ('e2e-e49-q-001'::uuid, 'single_choice', 'E49 Q1', '["a"]'::jsonb, 'published', ...)
on conflict (id) do update set prompt = excluded.prompt, ...;
-- (repeat for q-002..q-005)

-- Tests
insert into public.tests (id, owner_id, slug, share_id, title, status, ...)
values ('e2e-e49-test-typical-published'::uuid, '<TU-A>', 'e2e-e49-typical', 'e2e-e49-typical', ...)
on conflict (id) do update set title = excluded.title, status = excluded.status, ...;
-- (repeat for all 9 tests)

-- test_questions linkage
insert into public.test_questions (test_id, question_id, position) values ...
on conflict (test_id, question_id) do nothing;

-- Sessions
insert into public.sessions (id, test_id, intake_data, status, score, started_at, finished_at, ...)
values ('e2e-e49-sess-completed-named'::uuid, '<test-typical>', '{"name":"Jana Tester","email":"jana@example.sk"}'::jsonb, 'completed', 85, ...)
on conflict (id) do update set status = excluded.status, score = excluded.score, ...;
-- (repeat for every session described above)

-- session_answers
insert into public.session_answers (session_id, question_id, value, is_correct, time_ms)
values ('e2e-e49-sess-completed-named'::uuid, 'e2e-e49-q-001'::uuid, 'a', true, 4200)
on conflict (session_id, question_id) do update set value = excluded.value, ...;
-- (~120 rows total across all sessions)

commit;
```

**Constraints**:
- No `service_role` SQL hidden in app code — this seed runs only from `e2e/scripts/seed-e49-data.ts` invoked by the playwright global setup, with `SUPABASE_SERVICE_ROLE_TEST_KEY` from `.env.test.local` (never committed).
- Prefixed `e2e-e49-` so `LIKE 'e2e-e49-%'` cleans everything in one DELETE.
- Wrapped in transaction so a partial seed never leaks.
- Re-running is **idempotent and safe** — `ON CONFLICT DO UPDATE` resets row state to canonical, ignoring previous test pollution.

## Teardown strategy

Lives in `e2e/global-teardown.ts` (extends the existing E48 cleanup):

```ts
// E49 cleanup — runs AFTER every test session (success or fail).
// Idempotent; safe to invoke from local dev to wipe accumulated test state.
async function cleanupE49(supabase: SupabaseClient) {
  // Order matters: children first, then parents.
  await supabase.from("session_answers").delete().like("session_id::text", "e2e-e49-%");
  await supabase.from("sessions").delete().like("id::text", "e2e-e49-%");
  await supabase.from("test_questions").delete().like("test_id::text", "e2e-e49-%");
  await supabase.from("tests").delete().like("id::text", "e2e-e49-%");
  await supabase.from("questions").delete().like("id::text", "e2e-e49-%");
  await supabase.from("audit_log").delete().eq("target_id::text", /* test ids */)
    .in("actor_id", [TU_A, TU_B, TU_RESPONDENT, TU_ADMIN]);
}
```

**Belt-and-suspenders**:
- `CI_SKIP_SEED_CLEANUP=1` skips teardown for post-mortem on failed runs.
- `E49_TEARDOWN_VERIFY=1` re-counts rows post-cleanup; non-zero → exit 1 (catches leaked references).
- For prod-smoke layer: teardown is **mandatory** (no skip), uses a **separate prefix** `e2e-e49-prodsmoke-` to never touch the live-integration data.
- Auth users persist across runs (they're cheap and re-seeding is rate-limited).

## Scenarios — complete enumeration

Each scenario has:
- **ID** (POS-NN / NEG-NN / SEC-NN / PERF-NN / EDGE-NN)
- **Layer** (A/B/C — picks the lowest viable)
- **Preconditions** (which fixtures must exist)
- **Action** (what the test does)
- **Assertion** (what observable must hold)

### POSITIVE (P) — happy paths
| ID | Layer | Description |
|---|---|---|
| POS-01 | A | `/app/tests` index lists all of TU-A's tests with correct status badges |
| POS-02 | A | Status filter "Koncept" on index narrows to draft-empty |
| POS-03 | A | Click any test → editor opens on Results tab by default |
| POS-04 | A | Editor switches between Výsledky / Analytika / Otázky / Nastavenia tabs via URL query |
| POS-05 | A | KPI total = `5` for typical-published test |
| POS-06 | A | KPI completed = `3` for typical-published |
| POS-07 | A | KPI avg score = `62%` (round of 85+60+40 / 3) |
| POS-08 | A | Status filter "Prebiehajúce" → 2 rows visible (in-progress + zero-answers) |
| POS-09 | A | Status filter "Dokončené" → 3 rows visible |
| POS-10 | A | Status filter "Opustené" → 1 row visible (abandoned) |
| POS-11 | B | Search by name "Jana" → 1 row (completed-named) — verifies real `or()` |
| POS-12 | B | Search by email "@example.sk" → all rows with email — verifies JSON-path `intake_data->>email.ilike` |
| POS-13 | B | Search mixed-case "JANA" → matches "Jana" (case-insensitive) |
| POS-14 | A | Sort "Najvyššie skóre" → completed rows reordered 85, 60, 40 |
| POS-15 | A | Sort "Najnižšie skóre" → reversed |
| POS-16 | A | Sort "Najnovšie" → most-recent started_at first |
| POS-17 | A | Pagination on large-published: page size 20, 3 pages, prev/next navigate |
| POS-18 | A | Page-size selector changes count (10/20/50) |
| POS-19 | A | Click "Otvoriť detail" → side-sheet opens with same session id in URL |
| POS-20 | A | Direct URL `/sessions/<id>` opens the sheet, editor mounts underneath |
| POS-21 | A | Identity: name + email → name renders |
| POS-22 | A | Identity: email only → email renders |
| POS-23 | A | Identity: empty intake → "Anonymný respondent" |
| POS-24 | A | Status badge correct color per status enum |
| POS-25 | A | Score color: completed renders Slovak "%" suffix, in-progress renders "—" |
| POS-26 | A | Started/finished/duration timestamps formatted in Slovak locale |
| POS-27 | A | IP audit ref: last 6 chars of `ip_hash`, prefixed "IP audit ref" label |
| POS-28 | A | Q&A list: 5 rows for completed-named; each row has correctness marker |
| POS-29 | A | Correct answer: green marker + "Správna odpoveď" sr-only |
| POS-30 | A | Wrong answer: red marker + "Nesprávna odpoveď" sr-only |
| POS-31 | A | Time per question rendered in `Xs` or `X.Ys` |
| POS-32 | A | Close button "Zavrieť" returns to `/app/tests/<id>?tab=results` |
| POS-33 | A | ESC key closes sheet |
| POS-34 | A | Focus is trapped in sheet while open (Tab cycles within) |
| POS-35 | A | Mobile viewport (`@mobile`): sheet stacks, filter bar wraps |
| POS-36 | A | Tablet viewport (`@tablet`): sheet at 60% width, filter bar inline |
| POS-37 | A | Export CSV button enabled when sessions exist |
| POS-38 | B | CSV download succeeds (200 OK + Content-Type + Content-Disposition) |
| POS-39 | B | CSV body starts with UTF-8 BOM bytes `EF BB BF` |
| POS-40 | B | CSV header row matches contract (session_id, name, email, ...) |
| POS-41 | B | CSV data row count matches session count for the test |

### NEGATIVE (N) — failure modes
| ID | Layer | Description |
|---|---|---|
| NEG-01 | A | Unauthenticated `/app/tests` redirects to `/login` |
| NEG-02 | B | TU-A loading TU-B's test id → 404 (RLS denied) |
| NEG-03 | A | TU-A loading `/app/tests/<TU-A-id>/sessions/<TU-B-session-id>` → not-found state |
| NEG-04 | A | Side-sheet URL with malformed UUID → not-found, no JS crash |
| NEG-05 | A | Side-sheet URL with random string → not-found |
| NEG-06 | A | Empty test (zero questions) → list shows session count = 0, KPI cards show 0 |
| NEG-07 | A | Empty list state (no sessions) renders "Test zatiaľ nemá respondentov." |
| NEG-08 | A | Empty filter-match renders "Žiadny respondent nezodpovedá filtru." |
| NEG-09 | A | In-progress empty-answers session renders "Respondent ešte neodoslal odpovede." |
| NEG-10 | A | Page param > total pages → clamps to last page |
| NEG-11 | A | Invalid sort param → defaults to "Najnovšie" |
| NEG-12 | A | Invalid status filter → defaults to "Všetky stavy" |
| NEG-13 | B | `GET /api/tests/export-sessions` without auth → 401 |
| NEG-14 | B | `GET /api/tests/export-sessions?testId=<TU-B-test>` as TU-A → 403 |
| NEG-15 | B | `GET /api/tests/export-sessions?testId=<unknown>` → 404 |
| NEG-16 | B | `GET /api/tests/export-sessions` with `Origin: https://evil.com` → 403 |
| NEG-17 | B | `GET /api/tests/export-sessions` with no `Origin` header → 403 (Referer fallback) |
| NEG-18 | B | CSV export 51st request in 24h from TU-A → 429 + Retry-After header |
| NEG-19 | B | CSV export 101st request in 1h from same IP → 429 |
| NEG-20 | B | Rate-limited CSV export does NOT write audit_log row |
| NEG-21 | A | CSV export network failure → toast "Chyba pri exporte" + button re-enabled |
| NEG-22 | A | Stale-question session: answer renders with placeholder, sheet doesn't crash |
| NEG-23 | A | Session with `score: null`: renders "—", not "null" / "0" |
| NEG-24 | A | Session with `finished_at: null` (in_progress): duration "—", not "Invalid Date" |
| NEG-25 | A | Very long respondent name (300 chars) truncates visually (CSS ellipsis), full text in title attribute for screen readers |
| NEG-26 | A | Very long question prompt wraps, no horizontal scroll |
| NEG-27 | A | Rapid filter changes — only last result rendered (no race) |
| NEG-28 | A | Sheet open during route navigation → unmount cleanly, no zombie portal |
| NEG-29 | A | Pagination prev/next disabled at edges |
| NEG-30 | A | Sort change resets page to 1 |

### SECURITY (SEC) — payload battery
| ID | Layer | Description |
|---|---|---|
| SEC-01 | A | XSS payload `<script>alert(1)</script>` in name → rendered as text, no `<script>` tag in DOM |
| SEC-02 | A | XSS payload `"><img src=x onerror=alert(1)>` in email → no `<img>` tag in DOM |
| SEC-03 | A | XSS payload `javascript:alert(1)` as URL → href stripped or marked safe |
| SEC-04 | A | RTL override `‮evil.com` displayed inert (CSS `unicode-bidi: isolate`) |
| SEC-05 | A | Control characters (U+0000..U+001F) in name → stripped or visualized |
| SEC-06 | A | Mixed-direction emoji + RTL — no DOM injection |
| SEC-07 | A | All payloads from `tests/security/e48-payloads.ts` (full sweep) render harmlessly |
| SEC-08 | B | CSV cell `=cmd\|'/c calc'!A1` → prefixed with `'` in download |
| SEC-09 | B | CSV cell `+1+2` → prefixed with `'` |
| SEC-10 | B | CSV cell `-2-3` → prefixed with `'` |
| SEC-11 | B | CSV cell `@SUM(A1:A10)` → prefixed with `'` |
| SEC-12 | B | CSV cell with `\t` (tab) prefix → prefixed with `'` |
| SEC-13 | B | CSV cell with `\r` (carriage return) prefix → prefixed with `'` |
| SEC-14 | B | CSV cell containing `,` → quoted |
| SEC-15 | B | CSV cell containing `"` → quoted + inner `""` |
| SEC-16 | B | CSV cell containing `\n` → quoted |
| SEC-17 | B | CSV cell containing NULL byte → sanitized to empty or replacement char |
| SEC-18 | B | CSV Content-Disposition filename: safe slug, no path traversal |
| SEC-19 | B | IDOR: TU-A direct API GET on TU-B's session → 403 (RLS) |
| SEC-20 | B | Session token tampering: respondent token from one session does NOT authorize another session (Phase 2 prep) |
| SEC-21 | A | Sheet renders 0 console errors during XSS-laden render |

### EDGE (EDGE) — data shape extremes
| ID | Layer | Description |
|---|---|---|
| EDGE-01 | B | 200-session test paginates server-side; no >50 rows in DOM at any time |
| EDGE-02 | B | Sessions with timestamps in different timezones render in Slovak locale (Europe/Bratislava) |
| EDGE-03 | A | Session with score 0 renders "0%", not "—" |
| EDGE-04 | A | Session with score 100 renders "100%", not "1.00" |
| EDGE-05 | A | Question with `correct: null` → answer marker neutral, not red/green |
| EDGE-06 | A | Question with `correct: ["a", "b"]` jsonb array → multi-choice display |
| EDGE-07 | A | Question with `correct: "a"` jsonb string → single-choice display |
| EDGE-08 | A | Duration formatting: <1s → "X.Yms", <1min → "Xs", >=1min → "Xmin Ys" |
| EDGE-09 | A | Filter + sort + search combined → all three apply correctly |
| EDGE-10 | A | URL-state survives reload (filter / sort / page persisted) |

### PERFORMANCE (PERF)
| ID | Layer | Description |
|---|---|---|
| PERF-01 | B | Sessions list with 200 rows renders first page in <500ms after data arrives |
| PERF-02 | A | Sheet open animation completes in <300ms (visible by `animationend` event timing) |
| PERF-03 | B | CSV export of 5000 rows streams in <3s |
| PERF-04 | A | DOM size at idle on Results tab <1500 nodes (catch render bloat) |

### PROD-SMOKE (PS) — layer C only
| ID | Description |
|---|---|
| PS-01 | TU-A signs in on subenai.sk |
| PS-02 | Navigates to `/app/tests` — listing renders |
| PS-03 | Opens `e2e-e49-test-typical-published` — KPI cards visible |
| PS-04 | Sessions list shows ≥1 row |
| PS-05 | Click "Otvoriť detail" — sheet opens |
| PS-06 | Close sheet — URL returns to `?tab=results` |
| PS-07 | CSV export button responds (200 from `/api/tests/export-sessions`) |
| PS-08 | Sign out cleanly |

Total: **41 positive + 30 negative + 21 security + 10 edge + 4 perf + 8 prod-smoke = 114 scenarios.**

## Layer-A spec layout (mock-UI)

- `e2e/specs/app/test-sessions-detail.spec.ts` — current spec. Expand from 19 → ~50 TCs. Reorganize by section: Happy / Negative / Security / Edge / Mobile.
- `e2e/specs/app/test-sessions-list.spec.ts` — NEW. Index page filter/sort/empty-state TCs (POS-01..POS-04).
- `e2e/specs/security/csv-injection.spec.ts` — NEW. SEC-08..SEC-18 driven from a payload table — one `test.each(...)` per family.
- `e2e/poms/app/TestSessionsDetail.ts` — extend with getters for the new test-ids surfaced by negative scenarios (loading skeleton, toast, retry button, etc.).

## Layer-B spec layout (live-Supabase integration)

New playwright project `e2e-live-supabase` in `playwright.config.ts`:
- `baseURL = http://localhost:8080` (preview against built bundle)
- `globalSetup = e2e/global-setup.live-supabase.ts` — boots `supabase start` if not running, applies migrations, seeds via `e2e/seed/sql/e49-e2e-data.sql`.
- `globalTeardown = e2e/global-teardown.live-supabase.ts` — runs `cleanupE49()`.
- `testMatch = ["e2e/integration/e49/**/*.spec.ts"]`
- Env: reads `.env.test.local` for `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_TEST_KEY`.

Specs:
- `e2e/integration/e49/sessions-rls.spec.ts` — NEG-02, NEG-14, SEC-19, SEC-20.
- `e2e/integration/e49/csv-export-api.spec.ts` — NEG-13..NEG-20, POS-38..POS-41, SEC-08..SEC-18 (server-rendered CSV).
- `e2e/integration/e49/sessions-filter.spec.ts` — POS-11..POS-13 (real `or()` + JSON-path).
- `e2e/integration/e49/sessions-pagination.spec.ts` — POS-17, POS-18, EDGE-01, PERF-01, PERF-03.
- `e2e/integration/e49/audit-log.spec.ts` — NEG-20, NEG-40 (audit row written iff request succeeded).

## Layer-C spec layout (prod-smoke)

- `e2e/specs/prod-smoke/e49-sessions.spec.ts` — 8 TCs (PS-01..PS-08). Runs against subenai.sk + the seeded `e2e-e49-prodsmoke-*` data on prod Supabase.
- Triggered manually + by post-merge workflow (NEW: `.github/workflows/e49-prod-smoke.yml`).
- **Critical**: TU-A on prod is a SEPARATE pre-seeded user (`e2e-e49-prodsmoke-educator-a@subenai.test`) with hardcoded TOTP-disabled. Never uses real customer accounts.

## Phasing

| Phase | Scope | Deliverable | Effort |
|---|---|---|---|
| **1c-1** | Test-user + SQL seed + teardown + fixture constants module | PR opens TU-A..TU-Admin seeded on prod Supabase (idempotent), `e2e/seed/sql/e49-e2e-data.sql` lands, `cleanupE49` extends global teardown, `e2e/fixtures/e49-fixtures.ts` exports symbolic IDs. **No new TCs yet.** | M (~1500 LoC) |
| **1c-2** | Live-Supabase playwright project + first 15 integration TCs | New `e2e-live-supabase` project, `supabase start` lifecycle in global setup, integration specs for NEG-02, NEG-13..NEG-20, SEC-08..SEC-18 (CSV-injection battery in real CF function), POS-11..POS-13 (real `or()` filter). | L (~2500 LoC) |
| **1c-3** | Expand mock-UI spec from 19 → ~50 TCs | New `test-sessions-detail.spec.ts` covering all POS / NEG / SEC / EDGE scenarios on Layer A. Mobile/tablet projects pick up `@mobile`/`@tablet` tags. POMs expand. | L (~2000 LoC) |
| **1c-4** | Prod-smoke spec + CI workflow | `e2e/specs/prod-smoke/e49-sessions.spec.ts` + `e49-prod-smoke.yml` triggered on merge. Production seed data (`e2e-e49-prodsmoke-*`) provisioned via Supabase dashboard SQL (which I will paste here per `[[db-migration-sql-to-chat]]`). | M (~800 LoC) |

Each phase ends in **one PR** following the established CLAUDE.md DoD: lint 0/0, all suites green, GHAS checked, auto-merge enabled per `[[pr-workflow-auto-merge-security]]`, SQL pasted to chat per `[[db-migration-sql-to-chat]]` if migrations touched.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Live Supabase locally is flaky (start-up time, port conflict) | Medium | `supabase status` check + retry; cached docker layer |
| Test-data prefix collides with real user data | Very low | `e2e-e49-` is unique; teardown only matches that prefix |
| Prod-smoke teardown leaves orphan rows after failed run | Medium | `E49_TEARDOWN_VERIFY=1` re-counts; failed run blocks next CI |
| CSV-injection payloads escape into commit history | Low | Payloads imported from `tests/security/e48-payloads.ts` (already audited) |
| Auth user seed conflicts with prod auth.users | Medium | Use `@subenai.test` TLD (not a real reachable domain); never `@gmail.com` etc. |
| 200-session pagination test slows CI | Medium | Run only on `e2e:full` label, not every PR |
| Race conditions in mock-supabase parser cause flake | Medium | All filter / sort / search scenarios that depend on PostgREST semantics live on Layer B, not A |
| TU-Admin's admin status not reflected in `/app/*` (admin uses /admin) | Low | Confirm during 1c-1; if confirmed, drop TU-Admin from /app/tests scenarios and keep only for /admin coverage in a sibling epic |

## Cross-references

- Plan: `tasks/PLAN-2026-05-22-E49-tests-respondent-ops.md` (parent epic).
- Spec markdown: `specs/app/test-sessions-detail.md` (was the contract for Phase 1b's 19 TCs — supersede or extend in 1c-3).
- Existing seed: `e2e/seed/sessions.ts` (`seedE49TestWithSessions` for Layer A — extend with full fixtures).
- E48 #156: seed prefix + global teardown pattern.
- CLAUDE.md § "Test IDs", § "POM-only locators".
- Memory: `[[pr-workflow-auto-merge-security]]`, `[[db-migration-sql-to-chat]]`, `[[done-means-verified-end-to-end]]`.

## Definition of Done for Phase 1c (entire phase)

1. All 114 scenarios have a green automated test in the right layer.
2. Local: `npx playwright test --project=e2e-chromium` and `--project=e2e-live-supabase` both green from a clean checkout in <8 min combined.
3. CI: `e2e:full` label triggers all three layers + green.
4. Prod-smoke: post-merge workflow runs 8 TCs against subenai.sk, completes <90s, green.
5. Cleanup-verified: `E49_TEARDOWN_VERIFY=1` exits 0 after every run on every layer.
6. Plan checklist marked `~~done~~ ✅` for each phase.
7. CHANGELOG entry per phase (internal-section is acceptable here — these are test additions, not user-facing changes).

## Anti-patterns explicitly forbidden in this phase

- **`page.getByTestId(...)` in spec files** — POM-only locators per CLAUDE.md.
- **Implicit waits via `page.waitForTimeout(...)`** — every wait is on a state change.
- **`it.skip` / `test.skip` of failing scenarios** — investigate root cause; if it's mock-Supabase limitation, **move to Layer B**, don't skip.
- **Hand-rolled UUIDs in specs** — pull from `e49-fixtures.ts`.
- **Slovak strings paraphrased** — quote verbatim, locked to `src/i18n/locales/sk/tests.json`.
- **Re-introducing duplicate cases that already exist at a lower layer** — flag the duplication during review.
- **Spawning a sub-agent to "implement all 4 phases in parallel"** — phases have ordering dependencies (1c-1 → 1c-2 → 1c-3 → 1c-4). Within a phase, parallelism is fine if disjoint files.
- **Claiming "done" without running `--project=e2e-live-supabase` end-to-end at least once** — Layer B is the truth layer; Layer A is necessary but not sufficient per `[[done-means-verified-end-to-end]]`.
