# PLAN — admin-hub Integration (2026-05-17)

## Goal & Business Value

Port the `admin-hub/` Lovable prototype — a full-stack test-authoring and admin
platform — into the live subenai codebase as the `/app/*` (creator) and
`/admin/*` (platform-admin) sections of `subenai.sk`. This unlocks self-serve
custom-test creation for organizations, a platform-admin panel for content
governance, a GDPR-compliant respondent flow via share link, and a CMS for
marketing sub-pages. It transforms subenai from a read-only quiz into a hosted
testing platform with multi-tenant creator accounts.

---

## Scope

**In:**
- All `/app/*` user-app routes (dashboard, tests CRUD, wizard, library, audiences,
  teams, history, notifications, help, account, DSR)
- All `/admin/*` admin routes (users, questions, answer-sets, tests, trainings,
  categories, reports, respondents, audit, DSR, CMS pages/header/footer/navigation,
  quick-test, share-card, settings, support)
- `/t/$shareId` public respondent flow
- `/s/$slug` CMS sub-page route
- DB schema: 29 new tables + 12 Postgres enums + `has_role()` SECURITY DEFINER
  function + `on_auth_user_created` trigger + `forbid_session_score_changes` trigger
- Auth integration via existing Supabase Auth (reuse, not a new auth system)
- Design tokens merge from `admin-hub/src/styles.css` into `src/styles.css`
- i18n namespaces for all new user-facing strings under `src/i18n/locales/sk/`
- Sitemap additions for new public routes; `Disallow` for authenticated routes
- Mock-first approach: UI epics ship against a ported mock store; AH-11 wires Supabase

**Out (deferred):**
- AI question generator (external API key; skeleton ported but feature-flagged off)
- Email invitations to respondent groups
- Stripe billing for test-access gating
- Real-time presence / collaborative editing
- `/admin/settings` full persistence (UI ported, backend deferred)
- 2FA toggle on `/app/account/security` (UI ported, TOTP backend deferred)
- Data export (`admin/export.ts`, `platform/exports.ts`)
- Respondent group bulk email import / invite
- Security penetration test of public endpoints (separate security epic)

---

## Strategy Choice: B — Incremental Component Port

**Strategy B is chosen.** Copy types, components, and routes into the existing
subenai codebase file-by-file, epic-by-epic, wiring to Supabase in the final epic.

**Rationale:**
1. Single codebase, single CF Pages pipeline. Strategy A (subdomain) creates a second
   deployment target, two Tailwind token sets, and cross-origin surface. Strategy C
   (full rewrite) discards the working landing + quiz flows.
2. Mock-first sequencing maps directly to the existing epic pattern (E7–E12). Preview
   deploys ship with mock data; production wiring is one atomic epic at the end.
3. The admin-hub store (`useSyncExternalStore`) exposes the same call shapes as React
   Query hooks — the AH-11 swap is a drop-in, not a rewrite.

---

## Definition of Production-Ready

AH-11 does not merge until ALL of the following are true and verified:

1. `npm run lint` → 0 errors / 0 warnings.
2. `npm test` → all Vitest suites green; no `.skip` / `.only`.
3. `npm run build` → clean CF Pages SSR worker bundle, no errors or warnings.
4. `npm run e2e:browser` → all Playwright browser specs green (new `/app`, `/admin`,
   `/t/$shareId` flows included).
5. `npm run e2e:integration` → all Playwright HTTP integration specs green.
6. `npm run audit:bundle` runs extended grep guard (see Mock-First Sequencing) →
   no mock file path in `dist/`.
7. Every new DB table has RLS enabled; verified via `SELECT tablename FROM
   pg_tables WHERE schemaname='public'` cross-referenced with `pg_policies`.
8. `git grep VITE_SUPABASE_SERVICE` → zero matches in `src/` (service-role key
   never in client bundle).
9. `/t/$shareId` incognito smoke: completes a full respondent flow end-to-end
   without any auth cookie present.
10. `/admin` returns 403 for an unauthenticated request (role gate via `has_role()`
    server function enforced).
11. Audit log records a PII-flagged entry when `/admin/respondents` is loaded
    (server-side `supabaseAdmin` insert, `pii_access: true`).
12. DSR round-trip: submit via `/app/legal/dsr` → row appears in `/admin/dsr` queue
    with correct `sla_due_at`.
13. Sitemap lists all new public routes; no `/app/*` or `/admin/*` path included;
    `robots.txt` has `Disallow: /app/` and `Disallow: /admin/`.
14. Privacy page (`/privacy`) has a retention row for every new PII data category:
    platform user profiles (Supabase Auth lifecycle) and respondent intake data
    (anonymized after `anonymize_after_days`).
15. CF Pages dashboard → Functions → Logs shows zero unhandled 500s after a
    5-minute smoke soak against the production URL.

---

## Epic Map

| Epic id | Name | Branch | Files approx | DB impact | CONSENT_VERSION bump | Depends-on | Effort | Order | Status | Commit SHA |
|---|---|---|---|---|---|---|---|---|---|---|
| AH-1 | DB schema foundation | `feature/AH-1-db-schema` | 3 | 29 tables, 12 enums, 3 functions/triggers, RLS, indexes, cron stubs | No | — | M | 1 | Backlog | |
| AH-2 | Design tokens + shadcn gaps | `feature/AH-2-design-tokens` | 2–4 | None | No | — | S | 2 | Backlog | |
| AH-3 | App shell + auth guard | `feature/AH-3-app-shell` | 8–10 | None (reads `user_roles`) | No | AH-1, AH-2 | M | 3 | Backlog | |
| AH-4 | Questions library + answer sets | `feature/AH-4-questions` | 12–15 | None | No | AH-1, AH-3 | L | 4 | Backlog | |
| AH-5 | Tests builder + wizard | `feature/AH-5-tests` | 12–15 | None | No | AH-4 | L | 5 | Backlog | |
| AH-6 | Categories + trainings | `feature/AH-6-categories` | 6–8 | None | No | AH-1, AH-3 | M | 4 | Backlog | |
| AH-7 | Governance: reports, respondents, audit, DSR | `feature/AH-7-governance` | 8–10 | None | Yes → 1.4.0 | AH-1, AH-3 | M | 6 | Backlog | |
| AH-8 | Public respondent flow (`/t/$shareId`) | `feature/AH-8-respondent-flow` | 6–8 | None | No | AH-1, AH-5 | M | 7 | Backlog | |
| AH-9 | CMS + site header / footer / sitemap | `feature/AH-9-cms` | 8–12 | None | No | AH-1, AH-3 | M | 6 | Backlog | |
| AH-10 | Admin panel role-gating + shell | `feature/AH-10-admin-gate` | 4–6 | None | No | AH-1, AH-3 | S | 8 | Backlog | |
| AH-11 | Mock → Supabase wiring + prod-ready verification | `feature/AH-11-supabase-wire` | 35–50 | None (schema in AH-1) | Confirm 1.4.0 already bumped in AH-7 | ALL | XL | 9 | Backlog | |

---

## Dependency Graph

```
AH-1 (DB) ──┬── AH-2 (tokens) ── AH-3 (shell) ──┬── AH-4 (questions) ── AH-5 (tests) ──┐
            │                                    ├── AH-6 (categories)                  │
            │                                    ├── AH-7 (governance)─────────────────→│
            │                                    └── AH-9 (CMS)────────────────────────→│
            │                                                                            │
            └─────────────────────────────────── AH-10 (admin gate)─────────────────────→│
                                                  AH-8 (respondent flow, after AH-5)────→│
                                                                                          ▼
                                                                                AH-11 (wire)
```

AH-4 and AH-6 can run in parallel after AH-3 is merged. AH-7, AH-8, AH-9 can run
in parallel after their respective prerequisites.

---

## Data Model Decisions

**Existing subenai tables (must not be renamed or altered):** `attempts`, `test_sets`,
`sponsors`, `donations`, `subscriptions`. Views: `public_sponsors`, `footer_sponsors`,
`attempts_anon`. Functions: `hash_test_set_password`, `verify_test_set_password`,
`purge_expired_respondent_pii`.

**Zero name collisions** between admin-hub tables and existing subenai tables. Key
distinctions:
- `tests` (admin-hub, platform-managed full tests) vs `test_sets` (subenai,
  composer-built quick sets). Different tables; both coexist.
- `sessions` (admin-hub, respondent sessions on `tests`) vs `attempts` (subenai,
  quiz attempts on the public IQ test). Different tables; both coexist.
- `respondents` (admin-hub, platform respondent entities) vs `attempts.respondent_*`
  columns (subenai, inline on `attempts`). No conflict.

**Single migration file for all 29 tables:** `20260517000000_admin_hub_schema.sql`.
Keeping all new schema atomic simplifies rollback (one down-migration file to drop).
No cross-migration dependencies to manage within AH-1.

**`has_role()` must be created before any RLS policy referencing it.** Place the
function definition at the top of the migration, before any `CREATE TABLE`.

**`forbid_session_score_changes` trigger:** mirrors the existing
`forbid_attempt_score_changes` trigger but guards `sessions.score` against mutation
after the session is `completed`.

**CONSENT_VERSION:** bump once, in AH-7 (new PII surface: platform user profiles
under `profiles`, respondent intake data in `sessions`). Current version is `1.3.0`
(E12.6). Bump to `1.4.0`. AH-11 makes no new data category changes.

---

## Routing Layout Decision

**English slugs for `/app/*` and `/admin/*`; Slovak slugs only for directly
user-typed or shared public URLs.**

CLAUDE.md defines "Slovak in UI content rendered to end users." The path `/app/tests/new`
is a browser-bar navigation artifact seen by authenticated creators, not a shareable
public link. Using English matches the existing admin-hub source (no rename churn) and
is consistent with the pattern of `/test/zostav`, `/test/zostava/$id` already in
subenai (a mix, but the authenticated-area prefix `/app` is English). The public
`/t/$shareId` path is opaque by design; CMS slugs at `/s/$slug` are admin-authored
and may be Slovak. No mixed scheme within a single route tree.

---

## Site Header / Footer / Sitemap Impact

**New public routes to add to sitemap** (priority 0.5, changefreq monthly):
- `/s/$slug` — only when `published_at IS NOT NULL`; admin controls publication

**Routes to exclude from sitemap** (authenticated or dynamic):
- All `/app/*` routes (authenticated)
- All `/admin/*` routes (authenticated)
- `/t/$shareId` (dynamic per share-link, not indexable)

**Robots.txt additions:**
```
Disallow: /app/
Disallow: /admin/
```

**SiteHeader changes (AH-9):**
- Add conditional nav item "Moje testy" → `/app` rendered only when the user is
  authenticated. Unauthenticated visitors see "Prihlásiť sa" CTA.

**SiteFooter changes (AH-9):**
- Add "Platforma" column: links to `/app` (for authenticated creators) and
  `/admin` (rendered only if user has admin role, client-side check).

---

## i18n Strategy

The `feature/i18n-prep` branch is mid-flight establishing the namespace-per-feature
JSON pattern at `src/i18n/locales/sk/{namespace}.json` (confirmed from git status:
`src/i18n/locales/sk/quiz.json`, `src/i18n/resources.ts`, `src/i18n/types.d.ts`).

Each admin-hub epic adds one new namespace file and registers it in `src/i18n/resources.ts`
in the same commit that introduces the first component using it:

- AH-3: `src/i18n/locales/sk/app-shell.json` (sidebar nav labels, account menu)
- AH-4: `src/i18n/locales/sk/questions.json` (question types, statuses, editor labels)
- AH-5: `src/i18n/locales/sk/tests.json` (wizard steps, share dialog, status badges)
- AH-6: `src/i18n/locales/sk/categories.json` (branch/topic names and descriptions)
- AH-7: `src/i18n/locales/sk/governance.json` (DSR types, audit actions, report reasons)
- AH-8: `src/i18n/locales/sk/respondent-flow.json` (intake fields, consent copy)
- AH-9: `src/i18n/locales/sk/cms.json` (CMS admin panel labels, block type names)
- AH-10: `src/i18n/locales/sk/admin.json` (admin panel labels, role names, KPI labels)

---

## Auth Integration

**Do NOT port admin-hub auth routes. Reuse subenai's existing Supabase Auth.**

The admin-hub `/login`, `/register`, `/forgot-password`, `/reset-password`, and
`/admin-login` routes are mock-only and are not ported.

Implementation in AH-3:
1. Add `requireSupabaseAuth` TanStack `createServerFn` middleware (reads session
   cookie; throws 401 if missing).
2. Add `requireRole('admin')` middleware (calls `has_role()` via the anon client;
   throws 403 on mismatch).
3. `src/routes/app.tsx` layout applies `requireSupabaseAuth`.
4. `src/routes/admin.tsx` layout applies both middlewares in sequence.
5. If subenai has no existing sign-in UI, create a minimal `/prihlasit` route in
   AH-3 (Slovak slug, user-facing path).

---

## Public Respondent Flow (`/t/$shareId`) Safety

1. Server function uses `supabaseAdmin` with explicit safe-column projection:
   `id, title, description, intake_fields, gdpr_purpose, status`. Never return
   `owner_id`, `password_hash`, `segmentation`.
2. No `requireSupabaseAuth` on this route.
3. RLS on `sessions` and `session_answers`: anon role has zero direct INSERT.
   All writes go through a dedicated `createServerFn` that validates `share_id`
   exists and `status = 'published'` before writing via `supabaseAdmin`.
4. `forbid_session_score_changes` trigger (added in AH-1) prevents score mutation
   after `status = 'completed'` — mirrors the existing `attempts` pattern.
5. Rate limiting: 10 submissions / 5 min / IP via the CF Pages Function wrapper.
6. `supabaseAdmin` imported only in `*.server.ts` or `createServerFn` handlers.
   ESLint `no-restricted-imports` rule added in AH-1 to enforce this at lint time.

---

## Mock-First Sequencing

AH-2 through AH-10 ship UI against a ported in-memory mock store:

- `admin-hub/src/lib/admin/store.ts` → `src/lib/admin/mock-store.ts`
- `admin-hub/src/lib/platform/store.ts` → `src/lib/platform/mock-store.ts`
- `admin-hub/src/lib/admin-mock-data.ts` → `src/lib/admin/mock-data.ts`
- `admin-hub/src/lib/user-mock-data.ts` → `src/lib/platform/mock-user-data.ts`

All components in AH-3 through AH-10 import from these `mock-*` paths. AH-11
replaces every import with React Query hooks and deletes the mock files.

**Grep guard** (added to `npm run audit:bundle` in AH-11 — CI must run it):
```bash
grep -r "mock-store\|mock-data\|mock-user-data\|admin-mock-data\|platform/store\|platform/seed" \
  dist/ | grep -v "\.map$" \
  && echo "FAIL: mock leaked into prod bundle" && exit 1 \
  || echo "PASS: no mock in bundle"
```

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Tailwind v4 oklch token collision between subenai and admin-hub `styles.css` | Audit in AH-2; prefix admin-hub-exclusive tokens with `--ah-` if collision; strip prefix in AH-11 when unified |
| `recharts` version drift (subenai has v2.15.4; admin-hub dashboard uses recharts) | Verify admin-hub components compile against the installed version before AH-3 |
| CONSENT_VERSION banner annoys users if bumped per-story | Bump exactly once in AH-7; never per-story; banner copy must reference the new feature |
| Privilege escalation via `user_roles` + `profiles` | `has_role()` is SECURITY DEFINER; role never stored on `profiles`; AH-1 migration reviewed for RLS completeness before merge |
| `supabaseAdmin` imported in a client component | ESLint `no-restricted-imports` for `client.server` outside `*.server.ts` files, added in AH-1 |
| Bundle size from recharts admin dashboard (admin-hub has charts) | All `/admin` and `/app` route components wrapped with `React.lazy`; code-split at route boundary |
| Mock store state resets on page refresh in preview deploys | Seed mock arrays with realistic data; document in each PR that "refresh loses state; reload the seeded URL" |
| `pg_cron` extension not enabled in Supabase project | Cron SQL in migration is commented out; user activates manually post-merge; noted in AH-1 PR description |

---

## Out-of-Scope / Deferred

1. AI question generator — requires `LOVABLE_API_KEY`; skeleton ported but UI hidden
   behind a feature flag until a separate AI epic is planned.
2. Email invitations to respondent groups — Resend infra exists; send-invite action
   deferred.
3. Stripe billing for test-access gating — no paid tier in this integration.
4. Real-time presence / collaborative editing — no Supabase Realtime planned.
5. `/admin/settings` full persistence — UI ported; `app_settings` CRUD backend
   deferred.
6. 2FA toggle on `/app/account/security` — UI ported; TOTP backend deferred.
7. Data export (`admin/export.ts`, `platform/exports.ts`) — JSON/CSV download
   deferred.
8. Respondent group bulk email import / invite — deferred.
9. `pg_cron` activation for `anonymize-sessions` and `dsr-sla-check` — cron SQL
   in AH-1 migration as commented stubs; manual activation by user after merge.
10. Security penetration test of `/t/*` and `/s/*` endpoints — planned as a
    separate security epic post-integration.

---

## Open Questions for the User

1. **AI generator:** Should `AiQuestionGenerator.tsx` be hidden behind a feature flag
   in AH-4, or fully excluded from the codebase until a separate AI epic is planned?
2. **Login route:** If subenai has no existing sign-in UI, should the new creator login
   live at `/prihlasit` (Slovak, user-facing), or do you prefer a different slug?
3. **Header link visibility:** Should "Moje testy" appear in the main site header for
   all visitors (with a login-gate on click) or only after the user is authenticated?
4. **Strategy B on same domain confirmed?** `/app/*` and `/admin/*` on `subenai.sk`
   (not `app.subenai.sk`) — please confirm this is final.
5. **Seed data source:** Should mock store seed data in preview deploys come from the
   existing subenai question bank (`src/lib/quiz/questions.ts`) or from the admin-hub
   fixture arrays (`admin-hub/src/lib/admin-mock-data.ts`)?
6. **`quick_test_config` coexistence:** Does the admin-hub quick-test feature replace,
   extend, or coexist with the existing subenai public `/test` (15-question IQ test)?
7. **`share_card_config` coexistence:** Admin-hub has a configurable share-card separate
   from subenai's existing share mechanism. Should these be merged or kept separate?
8. **CONSENT_VERSION bump copy:** Confirm the proposed `1.4.0` banner text:
   "Pridali sme platformu pre tvorbu vlastných testov a zdieľanie cez odkaz."
9. **`pg_cron` extension:** Can you enable the `pg_cron` extension in the Supabase
   project now, or does it wait until AH-11 is merged to production?
10. **Admin bootstrap:** After AH-1 runs in production, the first admin user is created
    via a manual `INSERT INTO public.user_roles (user_id, role) VALUES (<uuid>, 'admin')`
    in the Supabase SQL Editor. Is this acceptable, or do you need a bootstrap script?

---

## Decisions (locked 2026-05-17)

All ten open questions were answered. Decisions below supersede the question
section above. Stories affected by each decision are listed; agents implementing
those stories MUST honor the decision.

1. **AI generator** — Port the file to `src/components/admin/AiQuestionGenerator.tsx`,
   gate the UI behind env flag `VITE_AI_GENERATOR_ENABLED` (default `false`).
   _Affects: AH-4.1._
2. **Login slug** — `/login` (English). Aligns with admin-hub source paths,
   minimal rename churn.
   _Affects: AH-3.1._
3. **Header link visibility** — "Moje testy" link in `SiteHeader` only rendered
   when the user is authenticated.
   _Affects: AH-9.8._
4. **Domain** — `/app/*` and `/admin/*` live on `subenai.sk` (same domain). Strategy
   B confirmed final.
   _Affects: the master plan; no story-level change._
5. **Seed data** — Mock store in preview deploys uses `admin-hub/src/lib/admin-mock-data.ts`
   arrays as TEST data ONLY. Production DB preserves all existing subenai data
   (`attempts`, `test_sets`, `sponsors`, `donations`, `subscriptions`). Where an
   admin-hub entity has a subenai equivalent that should be reused (not duplicated),
   the mapping lives in `tasks/DATA-REUSE-MAP-admin-hub.md`. AH-1 stays purely
   structural; data migrations live in their owning feature epic (e.g. AH-9.5
   migrates the hardcoded IQ questions).
   _Affects: AH-1.*, AH-9.5, AH-11.*; new doc `tasks/DATA-REUSE-MAP-admin-hub.md`._
6. **`quick_test_config` — Extend** — `/admin/quick-test` is the ADMIN CONFIG for
   the existing subenai public `/test` route. The page stays at `/test`. Its
   content (questions, title, time limit, pass %, difficulty, visibility toggle)
   is now driven by `quick_test_config` table joined with `questions` via a link
   table. AH-9.5 grows to include: data migration of the 15 hardcoded questions
   from `src/lib/quiz/questions.ts` to `questions` table, refactor of `/test`
   route to read config from DB, "Zobrazovať na webe" toggle drives 404 when off,
   e2e coverage of toggle on/off. Existing `attempts` table is preserved — new
   schema reads but does not overwrite.
   _Affects: AH-1.4 (extra link table), AH-9.5 (major scope grow), existing
   `src/lib/quiz/questions.ts`, existing `src/routes/test*.tsx`._
7. **`share_card_config` — Coexist** — admin-hub share-card config governs ONLY
   the new `/app/tests/*` share flow (`/t/$shareId`). Existing subenai share
   mechanisms (`/podakovanie`, `/test/zostav`) keep their current code path. No
   merge attempted.
   _Affects: AH-9.6._
8. **CONSENT_VERSION 1.4.0 banner copy** — "Pridali sme platformu pre tvorbu
   vlastných testov a zdieľanie cez odkaz."
   _Affects: AH-7.1._
9. **`pg_cron`** — Cron SQL in `supabase/migrations/20260517000000_admin_hub_schema.sql`
   stays COMMENTED OUT. After AH-1 merges to `main` and the user runs the migration
   against production, the user enables the `pg_cron` extension in Supabase
   Dashboard and uncomments the cron rows manually. AH-1.8 documents this.
   _Affects: AH-1.8._
10. **Admin bootstrap** — Manual `INSERT INTO public.user_roles (user_id, role)
    VALUES ('<uuid>', 'admin')` via Supabase SQL Editor after AH-1 merges. The
    bootstrap comment block goes at the top of `DEPLOY_SETUP.sql` per AH-11.8.
    Subsequent admins are promoted via `/admin/users` UI once the first admin is
    in place.
    _Affects: AH-11.8._

---

## Data Reuse Strategy (Q5 follow-up)

The full mapping lives in `tasks/DATA-REUSE-MAP-admin-hub.md`. Three principles
that govern every AH-* story:

- **Real subenai data is preserved.** No `DROP TABLE` on `attempts`, `test_sets`,
  `sponsors`, `donations`, `subscriptions`, or any view that reads from them.
  AH-1 only adds new tables; it never alters existing ones.
- **Reuse over duplicate.** Where an admin-hub entity overlaps semantically with a
  subenai entity, the data-reuse map says which is canonical. Example: the 15
  hardcoded IQ questions are MIGRATED (not duplicated) to the `questions` table,
  and `quick_test_config` points at them. The hardcoded array in
  `src/lib/quiz/questions.ts` is deleted in AH-9.5.
- **Mock-only seed in preview, never in production.** `admin-hub/src/lib/admin-mock-data.ts`
  arrays are ported as a mock store and feed UI in preview deploys (AH-3..AH-10).
  AH-11.6 deletes the mock files. Production Supabase receives ONLY: the AH-1
  schema, the AH-9.5 question migration, and rows the admin creates via the UI.
  No fixture data is seeded into production.
