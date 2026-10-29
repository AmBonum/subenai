# Deployment — subenai

Production runs on **Cloudflare Pages** (static client + Pages Functions)
backed by **Supabase**. There is no manual deploy step.

## 1. Code → Cloudflare Pages

- GitHub repo `AmBonum/subenai` is connected to the Pages project.
- Every push to `main` builds and deploys **production** (`subenai.sk`).
  Every other branch gets a **preview** deployment.
- Build command: `npm run build` (runs the changelog/sitemap/RSS/OG
  generators, `vite build`, then extracts CSP hashes). Output directory:
  `dist/client`. Functions are picked up from `functions/`;
  `public/_routes.json` decides which paths reach them.
- Security headers (CSP, HSTS, Permissions-Policy) ship from
  `public/_headers` for static assets; `functions/_middleware.ts` adds the
  same set to every Function response.
- CI uses Node 20 (`actions/setup-node`); there is no `.nvmrc`.

### Known issue — `Workers Builds: internetiq` fails on every pull request

Besides the Pages project, a Cloudflare **Workers** project named
`internetiq` is connected to this repository through Workers Builds. Its
build has failed on every pull request since at least May 2026 (checked on
PRs #10, #30, #60, #150, #220, #222). The 2026-10-29 audit attributed it to
the non-production (branch) deploy command configured for that project. Its
build and deploy commands live only in the Cloudflare dashboard (Workers &
Pages → `internetiq` → Settings → Builds); nothing in this repo configures
it, and there is deliberately no `wrangler.toml` here. The check is not
required for merging and does not affect the Pages production or preview
deployments.
Until it is fixed or disconnected in the dashboard, treat a red
`Workers Builds: internetiq` as noise and look at the GitHub Actions checks
instead.

## 2. Environment variables and bindings (Cloudflare dashboard)

Pages project → **Settings → Environment variables / Bindings**. Set each
on **Production** _and_ **Preview**. There is no `wrangler.toml` in this
repo on purpose: once a Pages project has one, the file becomes the source
of truth and dashboard-configured vars/bindings are overridden.

| Name                                                                            | Type               | Purpose                                                                               |
| ------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY` | Plain (build-time) | baked into the client bundle by `vite build`; see `.env.example`                      |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`                                             | Plain              | Supabase project (Functions)                                                          |
| `SUPABASE_SERVICE_ROLE_KEY`                                                     | **Secret**         | server-side writes (never in the client bundle)                                       |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                                    | **Secret**         | sponsorship checkout + webhook                                                        |
| `EXPECTED_LIVEMODE`                                                             | Plain              | Stripe live/test guard                                                                |
| `RESEND_API_KEY`                                                                | **Secret**         | transactional e-mail                                                                  |
| `EMAIL_FROM`, `EMAIL_REPLY_TO`, `OPS_EMAIL`, `SITE_ORIGIN`                      | Plain              | e-mail + absolute URLs                                                                |
| `JWT_SECRET`                                                                    | **Secret**         | author / respondent tokens                                                            |
| `TURNSTILE_SECRET_KEY`                                                          | **Secret**         | bot check on public forms                                                             |
| `ANTHROPIC_API_KEY`, `PRECHECK_*`                                               | **Secret** / Plain | template precheck (model id, budgets, rate limits)                                    |
| `AI`                                                                            | Workers AI binding | scam-chat models; `SCAM_CHAT_*` plain vars tune models, budgets and limits            |
| `SUPPORT_RATE_LIMIT_KV`                                                         | **KV binding**     | rate-limit counters for support tickets, scam-chat, admin export and the other limits |
| `SCAM_CHAT_KV` (optional)                                                       | KV binding         | dedicated scam-chat budget ledger; falls back to `SUPPORT_RATE_LIMIT_KV`              |

Per-endpoint rate-limit overrides (`DPA_*`, `E45_INVITES_*`, `E49_EXPORTS_*`,
`EDU_*`, `PORTAL_LINK_*`, `SUPPORT_*`, `TEST_SETS_PER_IP_PER_MIN`) are
optional plain vars with defaults in the Functions. Server-side names are
listed in `.dev.vars.example`, client-side `VITE_*` names in `.env.example`
(both gitignored once copied).

**KV binding is required in production.** Without `SUPPORT_RATE_LIMIT_KV`
the limits in `functions/_lib/security.ts` fall back to per-isolate memory
and only log a warning (`SUPPORT_RATE_LIMIT_KV is not bound`). Create the
namespace under Workers & Pages → KV, then bind it under Settings →
Bindings with variable name `SUPPORT_RATE_LIMIT_KV` on both environments
(`tasks/E48-runbook.md` §3). Locally `npm run dev:api` passes
`--kv=SUPPORT_RATE_LIMIT_KV` to `wrangler pages dev`, which binds a local
namespace of the same name.

## 3. Database (Supabase)

- Schema changes are **not** applied by CI. After a migration PR is merged,
  run the new `supabase/migrations/<timestamp>_<name>.sql` in the Supabase
  SQL editor (migrations are written to be re-runnable:
  `IF NOT EXISTS` / `ON CONFLICT`).
- A fresh project is bootstrapped with `DEPLOY_SETUP.sql` (every migration
  is mirrored into it in order). Post-apply tasks are in the file header
  (enable TOTP, promote the first admin, set the service-role key in
  Cloudflare).
- Post-migration steps (PostgREST cache refresh, invariants, log tailing,
  rollback) are in `tasks/POST-MIGRATION-CHECKLIST.md`.
- `npm run db:verify:prod` / `npm run db:verify:staging` run the read-only
  invariant checks in `scripts/verify-supabase-migration.sh` (admin-hub
  schema) against the `DATABASE_URL` in `.env.prod` / `.env.staging`; copy
  `.env.staging.example` first.
- Auth: enable Email + Google providers; set Site URL `https://subenai.sk`
  and redirect URLs `/auth/callback`, `/auth/reset-password`.
- Retention: `.github/workflows/retention-cron.yml` runs
  `scripts/run-retention.mjs` daily at 03:00 UTC with the repo secrets
  `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, calling the purge and
  anonymisation RPCs. Migration `20260426110000_self_service_delete_and_retention.sql`
  additionally schedules the 36-month attempt purge in-database when the
  `pg_cron` extension is enabled; moving the remaining RPCs to `pg_cron` is
  proposed in PR #216 (open).

## 4. Stripe

- Account: am.bonum s. r. o. Use test keys until live mode is activated.
- Webhook endpoint `https://subenai.sk/api/stripe-webhook` with events
  `checkout.session.completed`, `invoice.paid`,
  `customer.subscription.{created,updated,deleted}`, `charge.refunded`;
  copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
- Local: `npm run dev:stripe` starts `stripe listen` and writes the
  current signing secret into `.dev.vars`.
- `npm run audit:bundle` must pass before merge — it fails on tracker SDKs
  or any secret reference in `dist/`.

## 5. Search / crawling

- `public/robots.txt` points to `https://subenai.sk/sitemap.xml` and
  disallows `/app/`, `/admin/`, `/login`, `/auth/`, `/t/`, `/r/` and
  `/test/builder/`; `scripts/generate-sitemap.mjs` lists only public,
  indexable routes. Session/share routes (`/test/builder/$id`,
  `/thank-you/*`, `/r/*`, `/t/*`) also emit `noindex`.
- Cloudflare must not challenge verified search crawlers: WAF custom rule
  `cf.bot_management.verified_bot and cf.verified_bot_category eq "Search Engine Crawler"`
  → Skip managed rules / Bot Fight Mode / Browser Integrity Check, ordered
  above any challenge rules.
- GA4 (`G-95QZ12WGFD`) bootstraps from `index.html` but only loads after
  analytics consent (Consent Mode v2 defaults to denied).

## 6. CI and scheduled jobs (`.github/workflows/`)

| Workflow                                                  | Trigger                                       | What it does                                                                                                                                                                                                                                    |
| --------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`                                                  | PR, push to `main`, manual                    | lint → `typecheck:all` → `vitest run --coverage` (thresholds in `vitest.config.ts`) → build → bundle guards (secrets, mocks, trackers, size budget); prod schema invariants when `VITE_SUPABASE_URL` + `PROD_INVARIANT_CHECK_KEY` secrets exist |
| `e2e.yml`                                                 | PR to `main`, push to `main`, manual          | `integration` Playwright project always (unless label `e2e:skip`); chromium suite only with label `e2e:browser` (path-filtered) / `e2e:full` or manual run                                                                                      |
| `visual-regression.yml`                                   | PR, manual                                    | Playwright `visual` project screenshot diff                                                                                                                                                                                                     |
| `lighthouse.yml`                                          | PR, manual                                    | Lighthouse CI budgets; non-blocking                                                                                                                                                                                                             |
| `codeql.yml`                                              | PR/push to `main` (code paths), Tue 05:00 UTC | CodeQL javascript-typescript                                                                                                                                                                                                                    |
| `npm-audit.yml`                                           | PR/push touching the lockfile, Wed 05:00 UTC  | `npm audit --omit=dev --audit-level=high`                                                                                                                                                                                                       |
| `supply-chain.yml`                                        | PR, push to `main`, Mon 06:00 UTC             | CycloneDX SBOM + Trivy scan (SARIF upload)                                                                                                                                                                                                      |
| `zap-baseline.yml`                                        | Mon 04:00 UTC, manual                         | OWASP ZAP baseline against `https://subenai.sk` (or a given URL); `zap-full-scan.yml` is manual only                                                                                                                                            |
| `mutation.yml`                                            | Mon 04:00 UTC, manual                         | Stryker on critical files, report-only                                                                                                                                                                                                          |
| `load-test.yml`                                           | Mon 05:00 UTC, manual                         | loopback load test of the production build, report-only                                                                                                                                                                                         |
| `retention-cron.yml`                                      | daily 03:00 UTC, manual                       | retention RPCs via `scripts/run-retention.mjs` (see §3)                                                                                                                                                                                         |
| `prod-smoke.yml`, `e49-prod-smoke.yml`, `e53-redteam.yml` | manual                                        | Playwright `prod-smoke` project against production; E53 adversarial probes                                                                                                                                                                      |

Jobs that run `playwright install` (`e2e.yml`, `visual-regression.yml`,
`prod-smoke.yml`, `e49-prod-smoke.yml`) are pinned to `ubuntu-24.04`:
`ubuntu-latest` moved to Ubuntu 26.04 on 2026-10-29 and Playwright 1.60
cannot install Chromium there. Every other workflow keeps `ubuntu-latest`.

## 7. Pre-merge checklist

1. `npm run lint`, `npm run typecheck:all`, `npm test`, `npm run build`
   and the bundle guards are green (CI runs them on the PR).
2. New migration is mirrored into `DEPLOY_SETUP.sql` and has a note in the
   PR body that it must be applied to production after merge.
3. New public route has SEO meta, is in the sitemap generator, and is not
   behind a Cloudflare challenge.
4. Any new third-party script or cookie is reflected in `/cookies` and
   `/privacy` copy (`src/i18n/locales/*/legal.json`).
