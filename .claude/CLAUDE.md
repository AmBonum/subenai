# subenai — project instructions for Claude Code

Public repo (`AmBonum/subenai`), production at `subenai.sk`. Scam-awareness
quizzes, academy/blog, composer + edu tests for schools, Stripe sponsorship,
AI scam helper (`/pomocnik`). This file holds only what is specific to this
repo; general working rules live in the global `~/.claude/CLAUDE.md`.

## Stack
- **Frontend**: TanStack Start + Vite, React 19, TypeScript strict, Tailwind
  v4 (CSS-first config in `src/styles.css`), shadcn components. File-based
  router in `src/routes/**`; alias `@/*` → `src/*`. Shared route paths in
  `src/config/routes.ts`.
- **i18n**: namespaced JSON in `src/i18n/locales/{sk,cs,en}/*.json`, read via
  `tFor("<namespace>")` from `src/i18n/<namespace>.ts`. UI locale is locked
  to `sk`; keep `cs`/`en` keys in sync anyway (same key set per file).
- **Backend**: Cloudflare Pages Functions in `functions/api/**` (shared
  helpers in `functions/_lib/`), Supabase (Postgres + RLS + Storage),
  Stripe, Resend, Cloudflare Turnstile, Cloudflare Workers AI (scam-chat),
  Anthropic (template precheck only).
- **DB**: migrations in `supabase/migrations/<timestamp>_<name>.sql`; every
  migration is also mirrored (appended, idempotent) into `DEPLOY_SETUP.sql`.
  Supabase types in `src/integrations/supabase/types.ts` are kept in sync by
  hand in the same PR.
- **Tests**: Vitest + RTL + jsdom (`vitest.config.ts`, setup in
  `tests/setup.ts`, suites under `tests/**`), live-DB integration suite
  (`vitest.integration.config.ts`, needs `SUPABASE_*` env), Playwright
  (`e2e/**`, POMs in `e2e/poms/**`), test plans in `specs/**`.

## Commands
```bash
npm run dev            # Vite UI on :8080 (proxies /api/* to :8788)
npm run dev:api        # build + wrangler pages dev on :8788 (reads .dev.vars)
npm run lint           # eslint . — must stay at 0 errors / 0 warnings
npm run typecheck:all  # tsc for app+tests, e2e, and functions/
npm test               # vitest run (unit + component + contract)
npm run test:integration   # live Supabase RLS/RPC checks
npm run build          # changelog + sitemap + RSS + OG + vite build + CSP hashes
npm run check:bundle-no-secrets && npm run check:bundle-no-mocks && npm run audit:bundle
npm run check:bundle-budget
npm run e2e            # playwright (see playwright.config.ts projects)
```
Before claiming anything is done: run the affected suites and paste the
result. CI (`.github/workflows/ci.yml`) runs lint → typecheck:all →
vitest coverage → build → bundle guards.

## Deploy facts
- `main` = production. Every push to `main` auto-deploys to `subenai.sk` via
  Cloudflare Pages; every branch gets a preview deploy. No manual deploy.
- Schema changes are **not** deployed by CI. After a migration PR is merged,
  Lubomír applies the SQL in the Supabase dashboard (the migration file, or
  `DEPLOY_SETUP.sql` for a fresh project). Never run SQL against production
  from an agent session.
- Secrets and bindings (Stripe, Supabase service role, Resend, JWT,
  Anthropic, `SUPPORT_RATE_LIMIT_KV`) live only in the CF Pages dashboard /
  `.dev.vars` (gitignored). See `DEPLOYMENT.md` and `tasks/E48-runbook.md`.

## Repo-specific conventions
- **No admin/service-role client in the frontend.** `src/**` uses the single
  anon client `@/integrations/supabase/client`; anything needing the service
  role is a Pages Function. `npm run check:bundle-no-secrets` fails the build
  if `service_role`, `STRIPE_SECRET`, `whsec_` or `RESEND_API_KEY` land in
  `dist/`.
- **RLS is the security boundary.** Never widen a policy, never change
  `forbid_attempt_score_changes` to allow score/answer mutation. Writes that
  need validation or rate limiting go through `functions/api/*` with the
  service role, not through an anon INSERT policy.
- **POM-only e2e.** Playwright specs use locators only from
  `e2e/poms/<area>/<Component>.ts`; no `page.locator/getByTestId/getByRole`
  in specs. Every asserted element carries a `data-testid` named
  `<area>-<component>-<element>`; class/structural selectors are forbidden.
- **Dialogs**: no `window.confirm/alert/prompt` in `src/**`; use
  `ConfirmDialog` (`src/components/admin/ConfirmDialog.tsx`) with a
  `severity`, and `typedConfirm` for irreversible PII actions.
- **Consent**: bump `CONSENT_VERSION` (`src/lib/consent.ts`) at most once per
  epic; it re-shows the banner. GA4 and any non-essential script load only
  after consent (`index.html` + `GoogleAnalyticsManager`).
- **Trap popup (E4)** never persists user input anywhere.
- **Language**: Slovak only in production UI copy (locale JSON, e-mail
  templates, `CHANGELOG.md`). Code, comments, tests, specs, commits, PR
  bodies and docs are English, except the legacy Slovak files under `tasks/`.
- **Stories/plans**: `tasks/stories/E*.md`, `tasks/PLAN-*.md`, backlog in
  `tasks/BACKLOG.md`. Close a story in the same commit that ships it.
- **Specs**: `specs/README.md` explains the test-plan format; one folder per
  area (`specs/<area>/*.md`) mirrors `e2e/specs/<area>/`.

## Test accounts
- All test credentials live in **1Password** (vault entry "subenai
  audit-bot"). This repo is public: never write a password, token or key into
  any tracked file, fixture, commit message or PR body. For a local sign-in
  shortcut put `VITE_DEV_TEST_USER_EMAIL` / `VITE_DEV_TEST_USER_PASSWORD` in
  the gitignored `.env`.
- Audit bot: `audit-bot@subenai.test`, role `user` (not admin; `/admin/*`
  needs AAL2/TOTP). Re-seed with `supabase/scripts/seed-audit-test-user.sql`
  (idempotent, run from the Supabase SQL editor).

## Hooks
`.claude/settings.json` wires three hooks from `.claude/hooks/` (paths via
`$CLAUDE_PROJECT_DIR`): `pre-bash-guard.sh` blocks destructive git/SQL/rm,
`post-edit-lint.sh` runs `eslint --fix` on edited TS/TSX, `session-start.sh`
prints open stories + git status.
