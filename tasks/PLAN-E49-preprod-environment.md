# PLAN — E49 pre-prod environment (free)

## Why

E49 Phase 1c-4 surfaced that the post-merge `e49-prod-smoke` workflow auto-ran
against **production** subenai.sk + production Supabase on every push to
`main` that touched `/app/tests/**` paths. Each run:

- Burned CI minutes on the private repo (not free after the free tier).
- Mutated production data — the teardown `DELETE`s the `e2e-e49-prodsmoke-%`
  rows and the seed has to be re-applied manually each time before the next
  run. A flaky run leaves the canary in a half-purged state.

Local-first principle (CLAUDE.md): tests must not touch production. We need a
free, fully-isolated environment where the same prod-smoke suite + future
canaries can run cheaply.

## Goal

A pre-prod environment on a random subdomain under `subenai.sk` (e.g.
`preprod.subenai.sk` or a Cloudflare-managed `<branch>.preprod-subenai.pages.dev`)
that:

- Mirrors the production app shell + functions stack 1:1.
- Hits a **separate Supabase project** (free tier — 2 projects per org).
- Costs zero recurring fees beyond what the free tiers grant.
- Is reachable from local dev so the same Playwright project drives it.

## Phase A — Local-only stack (no subdomain, zero cost, available today)

Already partially scaffolded as the `e2e-live-supabase` Playwright project
(`playwright.config.ts:129-145`). Composition:

- `supabase start` — Docker-backed local Postgres + Auth + Storage on 54321.
- `vite preview` against the production build on 8080.
- `wrangler pages dev` serving CF Pages Functions on 8788.
- Seeds `supabase/scripts/seed-e49-e2e-users.sql` + per-test fixtures.

**Status**: `e2e/integration/e49/_setup.spec.ts` already boots the stack and
emits `e2e/.live-state.json`. The 38 live-Supabase specs auto-skip when this
state file is absent (so dev machines without Docker stay unaffected).

**Action**: document the developer workflow in `README.md` (one-liner:
`npm run e2e:live`) and wire a single npm script that does the project +
fixture + base-url plumbing.

**Limitation**: covers integration but not the prod-smoke canary, because the
spec hard-codes `https://subenai.sk`. Either:

1. Add a `PREPROD_BASE_URL` env var (default `http://localhost:8788`) and
   parameterise the prod-smoke POMs.
2. Keep prod-smoke pointed at the live URL and rely on Phase B for non-prod
   coverage.

## Phase B — Subdomain pre-prod (free tier, ~1 day setup)

### B1. Domain

Cloudflare Pages already manages `subenai.sk`. Add a CNAME / page rule:

- `preprod.subenai.sk` → `<preprod-project>.pages.dev`

(Or skip the custom domain entirely and use the auto-generated `pages.dev`
URL — the prod-smoke POMs accept any `baseURL`.)

### B2. Pre-prod Supabase project

- Create new project in the same Supabase organization — free tier permits
  2 projects per org (verify quota with `supabase projects list` first).
- Region: same as prod (`eu-west-1`) to keep latency parity.
- DB password: stored in a new secret `SUPABASE_DB_PASSWORD_PREPROD`.
- Service-role key: `SUPABASE_SERVICE_ROLE_KEY_PREPROD`.
- Run all `supabase/migrations/*.sql` against it on creation, then re-run
  whenever a new migration lands on `main`.
- Apply the canonical seeds:
  - `supabase/scripts/seed-e49-e2e-users.sql`
  - `supabase/scripts/seed-e49-prodsmoke-data.sql`

### B3. Cloudflare Pages preview environment

- Bind a separate Pages project (`subenai-preprod`) to the same GitHub repo.
- Configure preview env vars:
  - `VITE_SUPABASE_URL` → pre-prod URL
  - `VITE_SUPABASE_ANON_KEY` → pre-prod anon key
  - `SUPABASE_SERVICE_ROLE_KEY` → pre-prod service-role
  - any feature flags we want forced-on for canary
- Production env stays untouched. Pages now auto-deploys every branch to
  `<branch>.subenai-preprod.pages.dev`; the `main`-tracking deploy gets the
  stable `preprod.subenai.sk` CNAME.

### B4. Workflow repoint

- Update `e49-prod-smoke.yml`:
  - `baseURL` → `https://preprod.subenai.sk`
  - Teardown DSN → pre-prod pooler
  - Secrets → `_PREPROD` variants
- Restore `push: branches: [main]` trigger (now safe — no prod impact).
- Optionally add a daily `schedule:` cron once the suite is stable.

### B5. Local override

Add `PREPROD_BASE_URL` to `e2e/fixtures/base.ts` so engineers can run:

```sh
PREPROD_BASE_URL=https://preprod.subenai.sk CI_PROD_SMOKE=1 \
  npx playwright test --project=prod-smoke
```

…without ever pointing the suite at the real `subenai.sk` again. The check
hardens locally too — if the env var is absent the spec stays skipped.

## Cost ceiling

| Resource | Free tier | Estimated usage | Margin |
|---|---|---|---|
| Cloudflare Pages | 500 builds/mo, unlimited bandwidth | ~20 builds/mo | comfortable |
| Supabase project | 500 MB DB, 2 GB egress, 2 projects/org | <50 MB DB | comfortable |
| GitHub Actions | 2000 min/mo (private) | ~5 min × 30 runs ≈ 150 | comfortable |

All three remain in the free tier under expected canary cadence. Pre-prod
costs $0/mo on the projected workload.

## Out of scope (do later)

- TOTP-enrolled admin user on pre-prod (for `/admin/*` canaries).
- Custom domain `preprod.subenai.sk` (the `pages.dev` URL is enough for v1).
- Synthetic monitoring (Grafana / Better Stack) — wait until pre-prod is
  proven stable.
