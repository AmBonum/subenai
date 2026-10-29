# subenai

Scam-awareness platform for Slovakia: interactive quizzes that test how well
people spot phishing, fake e-shops, scam SMS and social engineering, an
academy with lessons and articles, a test composer for teachers and schools,
and an AI scam helper. Production: **https://subenai.sk**.

## Stack

- **Frontend** — client-rendered React 19 SPA built with Vite 7 and
  TanStack Router (file-based routes in `src/routes/**`, generated
  `src/routeTree.gen.ts`), TypeScript (strict), Tailwind v4, shadcn/ui.
- **API** — Cloudflare Pages Functions in `functions/api/**` (Stripe
  checkout/webhooks/portal, support tickets, edu attempts, scam-chat via
  Cloudflare Workers AI, template precheck via Anthropic).
  `public/_routes.json` lists which paths reach Functions; everything else
  is served statically with the `index.html` fallback.
- **Data** — Supabase (Postgres + RLS + Storage). Migrations in
  `supabase/migrations/`, mirrored into `DEPLOY_SETUP.sql`.
- **Tests** — Vitest + Testing Library (`tests/**`), live-DB integration
  suite, Playwright (`e2e/**`, page objects in `e2e/poms/**`), test plans in
  `specs/**`.

## Local development

`/api/*` only runs inside the Cloudflare runtime, so the full app needs two
terminals:

```bash
npm ci
cp .env.example .env            # Supabase URL + anon key, Turnstile site key
cp .dev.vars.example .dev.vars  # server secrets for wrangler (gitignored)

npm run dev:api   # terminal 1 — build + wrangler pages dev on :8788
npm run dev       # terminal 2 — Vite on :8080, proxies /api/* to :8788
```

UI-only work: `npm run dev` alone is enough (`/api/*` requests fail because
nothing listens on :8788).

## Verification

```bash
npm run lint             # eslint — 0 errors / 0 warnings
npm run typecheck:all    # tsc for app + tests, e2e, functions/
npm test                 # vitest
npm run build            # generators (changelog, sitemap, RSS, OG) + vite build to dist/client + CSP hashes
npm run check:bundle-no-secrets && npm run check:bundle-no-mocks && npm run audit:bundle
npm run e2e              # Playwright (see playwright.config.ts for projects)
```

Test surface as of 2026-10-30, measured on this branch: `npm test` runs
392 Vitest test files (`tests/**/*.test.{ts,tsx}` minus `tests/integration`)
with 3,980 test cases — 3,952 passed, 28 skipped
(`npx vitest run --reporter=dot`, 61 s). A further 6 files under
`tests/integration` need a live Supabase and run via
`npm run test:integration`. Playwright has 157 spec files under `e2e/`
(`find e2e -name '*.spec.ts' | wc -l`). Coverage thresholds in
`vitest.config.ts` are statements 59 / branches 53 / functions 53 / lines 62
(v8 provider over `src/**`); `npm run test:coverage` fails below them.

CI (`.github/workflows/`):

- `ci.yml` — on every pull request and push to `main`: lint →
  `typecheck:all` → Vitest with coverage → build → bundle guards (no
  secrets, no mocks, no trackers, size budget), plus a production
  schema-invariants check when the repo secrets are set.
- `e2e.yml` — the Playwright `integration` project on every PR (skip with
  the `e2e:skip` label); the chromium browser suite only with the
  `e2e:browser` / `e2e:full` labels or a manual run. `visual-regression.yml`
  (screenshot diff) and `lighthouse.yml` (non-blocking budgets) also run on
  PRs.
- Security: `codeql.yml` (PR, push to `main`, weekly), `npm-audit.yml`
  (lockfile changes + weekly), `supply-chain.yml` (SBOM + Trivy),
  `zap-baseline.yml` (weekly, against production). Weekly non-gating jobs:
  `mutation.yml`, `load-test.yml`. `retention-cron.yml` runs the daily
  data-retention RPCs.
- Jobs that install Playwright are pinned to `ubuntu-24.04`: Playwright
  1.60 has no Chromium build for Ubuntu 26.04, which `ubuntu-latest` became
  on 2026-10-29.

## Project layout

```
src/              React app — routes/, components/, hooks/, lib/, i18n/, content/
functions/        Cloudflare Pages Functions (api/**), shared _lib/, _middleware.ts
public/           static assets, _headers (CSP/HSTS), _routes.json, robots.txt
supabase/         migrations/, backfills/, scripts/ (seed SQL), config.toml
DEPLOY_SETUP.sql  every migration in order — bootstrap for a fresh Supabase project
tests/            Vitest suites (unit, components, routes, functions, security, db)
e2e/              Playwright: integration/, specs/, visual/, poms/, fixtures/
specs/            test plans per area (mirrors e2e/specs/)
scripts/          build generators, bundle guards, retention runner, perf/load
tasks/            epics, stories, plans and runbooks
docs/             legal-audit-2026-10.md, superpowers/ (plans + specs)
admin-hub/        Lovable prototype of the admin hub; not built, linted or deployed
```

## Deployment

- `main` is production. Cloudflare Pages builds and deploys every push to
  `main` to `subenai.sk`; every other branch gets a preview URL.
- Database schema is applied manually after a migration PR is merged (SQL
  editor in the Supabase dashboard). A fresh project is bootstrapped with
  [`DEPLOY_SETUP.sql`](./DEPLOY_SETUP.sql).
- Secrets and bindings live in the Cloudflare Pages dashboard — see
  [`DEPLOYMENT.md`](./DEPLOYMENT.md), which also documents the known
  failing `Workers Builds: internetiq` check on pull requests.

## Contributing

Issues and pull requests are welcome for scam scenarios, explanations and
bug reports. Please read `.claude/CLAUDE.md` for repo conventions (POM-only
e2e, no service-role client in the frontend, migrations mirrored into
`DEPLOY_SETUP.sql`).

## Support

The project is free to use and funded by donations: https://subenai.sk/support

## License

All rights reserved — see [`LICENSE`](./LICENSE). The code is public for
transparency, not open source.
