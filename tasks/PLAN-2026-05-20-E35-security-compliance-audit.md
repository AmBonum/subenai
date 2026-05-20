# E35 — Security & GDPR compliance audit + test coverage expansion

**Owner:** Claude (synthesis) — senior agent, 5-dimension security audit
**Date opened:** 2026-05-20
**Status:** 🟡 In progress — branch `claude/nice-khorana-68a8b9`
**Approved plan:** `/Users/lubomir/.claude/plans/tranquil-snacking-lynx.md`

## TL;DR

Three parallel recon passes (legal-page mapping, security-surface inventory,
GDPR-mechanism mapping) plus a targeted AI-attack scan produced a punch list
of concrete gaps between what the four legal pages (`/privacy`, `/cookies`,
`/manage-support`, `/about`) **declare** and what the code **actually
implements**. This epic delivers the *verification half* of that punch list:

1. One Markdown story (`E35.1`) documents every legal claim with a status
   emoji + evidence file:line + recommended follow-up.
2. Six test-coverage stories (`E35.2`–`E35.7`) add Vitest + Playwright suites
   across five dimensions: live-SQL RLS enforcement, no-leak browser
   journeys, input/XSS/prompt-injection fuzz, security headers + JSON-LD +
   SEO contract tests, AI-attack & anti-automation tests. Plus free-tier
   CI hardening (CodeQL, Dependabot, npm audit).
3. Tests that **fail today** because a declared feature is missing
   (data-portability export, age gate, retention TTL on profiles, edu
   auto-anonymisation, Turnstile on quiz routes) **stay red**. Each failing
   test name maps 1:1 to a follow-up story in E36+.

**No schema migrations. No UI changes. No `CONSENT_VERSION` bump.** This is
a tests-only epic. Implementation fixes live in follow-up epics.

## Scope

### In
- `tasks/stories/E35.1` — declaration↔implementation matrix.
- `tasks/stories/E35.2`–`E35.7` — six test-coverage stories.
- New POMs only where existing ones are missing.
- New test plans (`specs/security/**`) describing each new spec.

### Out — deferred to follow-up epics
- **E36** — GDPR Art. 20 self-service export (UI + RPC).
- **E37** — Age gate (Slovak Art. 8 cutoff 16).
- **E38** — Retention TTL on `profiles`, `respondents`, `audit_log`; edu
  auto-anonymisation cron.
- **E39** — zod boundary validation on RPCs + CSP nonce narrowing.
- **E40** — Question-bank correct-answer leak fix + Turnstile / behavioural
  defence on quiz routes (contingent on E35.6 confirming the gap).

## Story map

| ID | Title | Effort | Priority | Status |
|---|---|---|---|---|
| [E35.1](./stories/E35.1-compliance-audit.md) | Compliance audit report — declaration↔implementation matrix | `M` | `P0` | ✅ Done (49-row matrix; 6 ❌ findings flagged for E36–E40) |
| [E35.2](./stories/E35.2-rls-enforcement-tests.md) | Live-SQL RLS & SECURITY DEFINER enforcement suite | `L` | `P1` | ✅ Test infra landed (skips with marker until `supabase start` + `.env.test.local` configured) |
| [E35.3](./stories/E35.3-input-xss-fuzz-tests.md) | Input / XSS / prompt-injection boundary fuzz suite | `M` | `P1` | ✅ Done (XSS payload library, share_id constraint, prompt-injection harness — changelog renderInline test deferred, needs minor refactor) |
| [E35.4](./stories/E35.4-no-leak-journeys.md) | No-leak browser-journey suite (Playwright) | `M` | `P1` | ✅ Done (NetworkSentinel POM + 3 Playwright scenarios + storage-allowlist Vitest cross-check) |
| [E35.5](./stories/E35.5-headers-jsonld-seo-tests.md) | Security-headers + JSON-LD + SEO contract suite | `M` | `P1` | ✅ Done (CSP allowlist subset, HSTS, X-Frame-Options, JSON-LD Schema.org shape, SEO meta uniqueness) |
| [E35.6](./stories/E35.6-ai-attack-tests.md) | AI-attack & anti-automation suite | `M` | `P2` | ✅ Done (rate-limit contract, robots-contract, prompt-injection harness, headless-load + agent-detection Playwright specs) |
| [E35.7](./stories/E35.7-ci-hardening.md) | CI hardening — CodeQL, Dependabot, npm audit (free-tier) | `S` | `P2` | ✅ Files ready (`codeql.yml`, `npm-audit.yml`, `dependabot.yml` — separate from `ci.yml`); awaiting commit approval |
| [E35.8](./stories/E35.8-zap-dast.md) | OWASP ZAP DAST scanning (baseline + full, free-tier) | `S` | `P2` | ✅ Files ready (`.github/workflows/zap-*.yml` + `.zap/rules.tsv`); awaiting commit approval per CLAUDE.md `.github/**` rule |

## Decisions

| ID | Decision | Locked |
|---|---|---|
| D1 | Scope of this epic | **Audit + tests only.** No schema migrations, no UI changes, no `CONSENT_VERSION` bump. |
| D2 | Test focus dimensions | All five — RLS live SQL, no-leak journeys, input/XSS fuzz, SEO + JSON-LD + headers, AI-attack & anti-automation. |
| D3 | Audit output format | Single Markdown matrix story (`E35.1`), not a separate PLAN index. |
| D4 | Cost constraint | **No paid SaaS.** GitHub-native (CodeQL, Dependabot), npm-native (audit), in-house Playwright. |
| D5 | Expected-red tests | Acceptable. Each `❌` row in the matrix becomes either a failing test (visible punch list in CI) or a deferred follow-up story. |

## Discovery — current state (from recon)

### Existing security test surface
- `tests/security/rls-shape.test.ts` — checks RLS policy *shape* (existence),
  not *enforcement*.
- `tests/security/rpc-contracts.test.ts` — RPC parameter shape.
- `tests/security/pii-redaction.test.ts` — PII redaction in some utility.
- `tests/lib/supabase/audit-log-immutable.test.ts` — audit-log immutability
  trigger shape.
- `tests/components/TrapDialog.test.tsx` — E4 trap dialog "must not persist"
  design invariant.
- `e2e/specs/consent/cookie-banner.spec.ts` — banner UX (22 test cases).

### Known gaps confirmed across all recon agents
- No live-SQL RLS enforcement tests (only shape).
- No network-interception assertion that reject-all keeps third parties out.
- `public/_headers` has zero test backing.
- JSON-LD on legal pages is hand-rolled, no validity check.
- No `npm audit` step in CI; no Dependabot config; no CodeQL.
- No rate-limit contract test on the edu-attempt endpoints.
- No `robots.txt` content test.
- No agent-detection / headless-browser test.
- Sidebar cookie set without consent gating (declared as nothing in cookies).
- `VITE_AI_GENERATOR_ENABLED` admin AI generator backend (AH-11) not yet
  wired — but the prompt-injection harness can be staged now.

### Known declaration vs. implementation mismatches (preview)
The full matrix lives in `E35.1`. Highlights uncovered during recon:

1. `/privacy` declares "anti-cheat logs 12-month retention (Art. 6(1)(f))"
   — only `attempts` has a TTL (36 months). No 12-month TTL job for
   anti-cheat logs exists.
2. `/privacy` declares "edu mode 12-month auto-anonymisation" — no
   corresponding cron job in migrations.
3. `/cookies` declares "Stripe cookies active only on /support" — needs a
   no-leak browser journey to verify.
4. `/about` declares "no AI training on test data" — implementation-side
   nothing sends test data to an LLM today (✅), but the harness in E35.3
   locks that fact so a future regression breaks CI.
5. **Data portability (Art. 20)** — declared via DSR queue but no
   self-service export. Manual admin process only.
6. **Age gate (Art. 8)** — declared nowhere explicitly, but the EU/Slovak
   default cutoff of 16 is unenforced. Future epic needs to decide whether
   the legal copy on `/privacy` needs an addition.

## Risks

| Risk | Mitigation |
|---|---|
| Local Supabase boot in CI is flaky | `continue-on-error: true` on PRs initially; flip to required after a week of green. |
| Playwright headless-load spec triggers CF Pages rate-limits | Runs against local dev server (`npm run dev`), not preview. |
| CodeQL queue times slow PRs | Separate workflow with `paths-ignore: [**/*.md]`. |
| `_headers` contract test goes red on legitimate CSP changes | That's the feature, not a bug — bump consciously in the same PR that widens CSP. |
| Curated XSS payload set is incomplete | Linked to OWASP cheat sheet; living list. Some coverage now > waiting for perfect. |

## DoD for the epic

Per `tasks/DEFINITION_OF_DONE.md` § 3 (Feature/Epic DoD). Specifically:

1. `npm run lint` → 0/0.
2. `npm test` → green (plus the documented expected-red set in `E35.1`).
3. `npm run test:integration` → green against local Supabase.
4. `npm run build` → ✓.
5. `npm run e2e -- e2e/specs/security/` → green (plus documented
   expected-red).
6. CHANGELOG.md updated with one `[Added]` line per story.
7. Privacy/cookies pages **not modified** (sanity check — tests-only epic).
8. Fresh-context code review via `general-purpose` agent on the diff.

## Execution order (recommended)

1. **E35.1** first — the matrix tells E35.2–E35.7 exactly which gaps must
   surface as failing tests.
2. **E35.7** in parallel — small, isolated, no Supabase dependency.
3. **E35.5** + **E35.3** next — no Supabase, no dev server, fast feedback.
4. **E35.4** + **E35.6** — Playwright, needs dev server.
5. **E35.2** last — requires local Supabase (`supabase start`); highest
   risk of flakiness.
