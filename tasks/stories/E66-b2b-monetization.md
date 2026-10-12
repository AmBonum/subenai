# E66 — B2B monetization: paid plans, training evidence, real-case templates

**Status:** 🚧 E66.1–E66.5 ✅ Done on `feature/E66-b2b-monetization` (lint 0/0,
Vitest 4150 green, build ✓, bundle budget ✓). Closes after the owner runs the
prod SQL, sets the Stripe keys/webhook events, and the flow is verified live.
**Author:** audit + research + implementation 2026-10-12 (autonomous mandate).

## Why

Everything a company or school needs to run awareness campaigns already
exists for free (composer, respondent links, results, CSV export). The one
thing an organisation must *prove* is missing: NBÚ decree **227/2025 Z.z.**
(in force 1 Sep 2025, Annex 1 items 5, 66, 67) obliges ~3 500–7 000 regulated
entities to keep evidence that staff were demonstrably trained, with full
compliance due **31 Dec 2026**. Incumbents charge €18–65 per user per year
(KnowBe4, SoSafe, ESET ECAT). subenai sells the evidence layer on top of the
free product at €3–6 per user per year. Research notes with sources:
`tasks/E66-research.md`.

Never claim "NIS2 compliant". Copy says *podklad / evidencia k preukázaniu
vzdelávania* — the product helps prove training, it does not certify an ISMS.

## Plans (EUR / year, prices in `src/lib/billing/plans.ts` — single source)

| Plan | Respondents in evidence per billing year | Price |
|---|---|---|
| Free | 0 (tests, results, raw CSV stay free) | €0 |
| Štart | 25 | €149 |
| Firma | 100 | €390 |
| Firma+ | 250 | €790 |
| 250+ | custom (contact form) | — |

Schools use the free plan; real-case school templates are free.

## Stories

### ~~E66.1 Plans + billing (Stripe subscription, yearly)~~ ✅
- `org_subscriptions` table (owner-scoped, RLS read-own, writes only via
  service role from the webhook). Entitlement = snapshot of `respondent_cap`
  at purchase, so price-list edits never change what someone paid for.
- `POST /api/billing/checkout` — JWT auth, plan id only (price computed on the
  server), two separate unticked consents validated server-side: terms +
  express request for immediate start with acknowledged loss of withdrawal
  right (zákon 108/2024 Z.z.). Rate-limited per IP + per user.
- Webhook routes `metadata.kind = "org_plan"` events to the billing handler;
  idempotent on `stripe_subscription_id` (unique index), donation flow untouched.
- `POST /api/billing/portal` — Stripe customer portal for invoices / cancel.
- `/cennik` public pricing page, `/app/billing` plan management.

### ~~E66.2 Training evidence ("Doklad o preškolení")~~ ✅
- `POST /api/billing/evidence` `{ testId, orgName }` — owner + active plan + in-period cap
  check; returns the report payload, writes an `evidence_reports` row
  (content SHA-256) + `audit_log`.
- `/app/tests/$testId/doklad` — report preview + generated PDF (React-PDF, Noto Sans):
  organisation, test + version, topics covered, per-respondent completion date
  and score, pass threshold, report id + verification URL; one certificate
  page per passed respondent.
- `/overenie/$reportId` — public verification (anon RPC returns only test
  title, date, respondent count, hash — no personal data).

### ~~E66.3 Real-case templates for companies and schools~~ ✅
- Fill the public `/sablony` catalogue (its 15 rows ship with empty
  `question_ids`) and add new real-case templates built from verified Slovak
  incidents, each with real questions from the bank (UUIDv5 of the bank slug).

### ~~E66.4 3D illustrations~~ ✅
- Dependency-free CSS 3D scenes (perspective + preserve-3d), honouring
  `prefers-reduced-motion`, for the pricing page, B2B landing and user docs.

### ~~E66.5 User documentation~~ ✅
- Replace the `/docs/app/*` "coming soon" stubs that cover the B2B flow with
  real guides (create a campaign from a template, invite respondents, read
  results, generate the evidence report, billing) with 3D illustrations.

### E66.6 Hardening found by the audit (separate PR `fix/security-audit-2026-10`)
- `npm audit fix` (critical `seroval` in TanStack Start runtime), idempotent
  refund handler, rate limits on unauthenticated Stripe endpoints, stale
  zákon 102/2014 reference → 108/2024, dead code.

## DoD
Lint 0/0, Vitest green, build ✓, privacy + cookies + CHANGELOG updated,
prod SQL handed to the owner, live verification after merge.

## Found and fixed along the way
- `/sablony` "Použiť šablónu" pointed at the legacy builder, which ignores
  `templateId` → now `/app/tests/new?step=1&templateId=…`.
- Template questions showed "Otázka nie je dostupná" in the wizard (questions
  RLS hides authorless published rows) → prompts filled from the static bank.
- Sign-in dropped every in-app deep link → validated `?redirect=` for regular
  users (`safeAppRedirect`).
- Public doc bodies were statically imported by a non-lazy route and sat in
  the main chunk → dynamic import (index 271 kB → 258 kB).
- Checkout consent linked to `/privacy` and no terms of sale existed → `/obchodne-podmienky`
  (seller, subject, price, yearly renewal, cancellation, consumer withdrawal with pro-rata
  payment, complaints, SOI); consents and Stripe submit text now match it.
