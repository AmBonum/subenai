# subenai

Scam-awareness platform for Slovakia: interactive quizzes that test how well
people spot phishing, fake e-shops, scam SMS and social engineering, an
academy with lessons and articles, a test composer for teachers and schools,
and an AI scam helper. Production: **https://subenai.sk**.

## Stack

- **Frontend** — TanStack Start + Vite, React 19, TypeScript (strict),
  Tailwind v4, shadcn/ui. File-based routes in `src/routes/**`.
- **API** — Cloudflare Pages Functions in `functions/api/**` (Stripe
  checkout/webhooks/portal, support tickets, edu attempts, scam-chat via
  Cloudflare Workers AI, template precheck via Anthropic).
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

UI-only work: `npm run dev` alone is enough (`/api/*` returns 504).

## Verification

```bash
npm run lint             # eslint — 0 errors / 0 warnings
npm run typecheck:all    # tsc for app + tests, e2e, functions/
npm test                 # vitest
npm run build            # Cloudflare Pages SSR bundle
npm run check:bundle-no-secrets && npm run check:bundle-no-mocks && npm run audit:bundle
npm run e2e              # Playwright (see playwright.config.ts for projects)
```

Test surface as of 2026-10: 398 Vitest test files under `tests/`, 157
Playwright spec files under `e2e/` (`find tests -name '*.test.ts*' | wc -l`,
`find e2e -name '*.spec.ts' | wc -l`). CI (`.github/workflows/ci.yml`)
runs lint, typecheck, Vitest with coverage, build and the bundle guards on
every push and pull request.

## Deployment

- `main` is production. Cloudflare Pages builds and deploys every push to
  `main` to `subenai.sk`; every other branch gets a preview URL.
- Database schema is applied manually after a migration PR is merged (SQL
  editor in the Supabase dashboard). A fresh project is bootstrapped with
  [`DEPLOY_SETUP.sql`](./DEPLOY_SETUP.sql).
- Secrets and bindings live in the Cloudflare Pages dashboard — see
  [`DEPLOYMENT.md`](./DEPLOYMENT.md).

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
