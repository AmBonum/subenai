# Deployment — subenai

Production runs on **Cloudflare Pages** (static client + Pages Functions)
backed by **Supabase**. There is no manual deploy step.

## 1. Code → Cloudflare Pages

- GitHub repo `AmBonum/subenai` is connected to the Pages project.
- Every push to `main` builds and deploys **production** (`subenai.sk`).
  Every other branch gets a **preview** deployment.
- Build command: `npm run build` (runs the changelog/sitemap/RSS/OG
  generators, `vite build`, then extracts CSP hashes). Output directory:
  `dist/client`. Functions are picked up from `functions/`.
- Security headers (CSP, HSTS, Permissions-Policy) ship from
  `public/_headers`.

## 2. Environment variables and bindings (Cloudflare dashboard)

Pages project → **Settings → Environment variables / Bindings**. Set each
on **Production** *and* **Preview**. There is no `wrangler.toml` in this
repo on purpose: once a Pages project has one, the file becomes the source
of truth and dashboard-configured vars/bindings are overridden.

| Name | Type | Purpose |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Plain | Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | server-side writes (never in the client bundle) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | **Secret** | sponsorship checkout + webhook |
| `STRIPE_PUBLISHABLE_KEY`, `EXPECTED_LIVEMODE` | Plain | Stripe |
| `RESEND_API_KEY` | **Secret** | transactional e-mail |
| `EMAIL_FROM`, `EMAIL_REPLY_TO`, `OPS_EMAIL`, `SITE_ORIGIN` | Plain | e-mail + absolute URLs |
| `JWT_SECRET` | **Secret** | author / respondent tokens |
| `TURNSTILE_SECRET_KEY` | **Secret** | bot check on public forms |
| `ANTHROPIC_API_KEY`, `PRECHECK_*` | **Secret** / Plain | template precheck |
| `SUPPORT_RATE_LIMIT_KV` | **KV binding** | rate-limit counters for support tickets, scam-chat, admin export |
| `SCAM_CHAT_KV` (optional) | KV binding | dedicated scam-chat budget ledger; falls back to `SUPPORT_RATE_LIMIT_KV` |

The full list with descriptions is in `.dev.vars.example`.

**KV binding is required in production.** Without `SUPPORT_RATE_LIMIT_KV`
the limits in `functions/_lib/security.ts` fall back to per-isolate memory
and only log a warning (`SUPPORT_RATE_LIMIT_KV is not bound`). Create the
namespace under Workers & Pages → KV, then bind it under Settings →
Bindings with variable name `SUPPORT_RATE_LIMIT_KV` on both environments
(`tasks/E48-runbook.md` §3). Locally `npm run dev:api` binds an in-memory
namespace of the same name.

## 3. Database (Supabase)

- Schema changes are **not** applied by CI. After a migration PR is merged,
  run the new `supabase/migrations/<timestamp>_<name>.sql` in the Supabase
  SQL editor (migrations are idempotent).
- A fresh project is bootstrapped with `DEPLOY_SETUP.sql` (every migration
  is mirrored into it in order). Post-apply tasks are in the file header
  (enable TOTP, promote the first admin, set the service-role key in
  Cloudflare).
- Verify a project against the expected schema:
  `npm run db:verify:prod` / `npm run db:verify:staging` (needs an env file
  with the connection values; see `scripts/verify-supabase-migration.sh`).
- Auth: enable Email + Google providers; set Site URL `https://subenai.sk`
  and redirect URLs `/auth/callback`, `/auth/reset-password`.
- Retention/anonymisation RPCs run from `pg_cron` (see PR #216) or
  `scripts/run-retention.mjs` via `.github/workflows/retention-cron.yml`.

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

- `public/robots.txt` points to `https://subenai.sk/sitemap.xml`;
  `scripts/generate-sitemap.mjs` lists only public, indexable routes.
  Session/share routes (`/test/builder/$id`, `/thank-you/*`, `/r/*`,
  `/t/*`) stay `noindex`.
- Cloudflare must not challenge verified search crawlers: WAF custom rule
  `cf.bot_management.verified_bot and cf.verified_bot_category eq "Search
  Engine Crawler"` → Skip managed rules / Bot Fight Mode / Browser
  Integrity Check, ordered above any challenge rules.
- GA4 (`G-95QZ12WGFD`) bootstraps from `index.html` but only loads after
  analytics consent (Consent Mode v2 defaults to denied).

## 6. Pre-merge checklist

1. `npm run lint`, `npm run typecheck:all`, `npm test`, `npm run build`
   and the bundle guards are green (CI runs them on the PR).
2. New migration is mirrored into `DEPLOY_SETUP.sql` and has a note in the
   PR body that it must be applied to production after merge.
3. New public route has SEO meta, is in the sitemap generator, and is not
   behind a Cloudflare challenge.
4. Any new third-party script or cookie is reflected in `/cookies` and
   `/privacy` copy (`src/i18n/locales/*/legal.json`).
