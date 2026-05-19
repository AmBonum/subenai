# E20 — Selective e2e test execution at PR level

> **Status**: PROPOSED — awaiting user approval to modify
> `.github/workflows/e2e.yml`. Per CLAUDE.md non-negotiable rules,
> the workflow file cannot be touched without explicit ask.

## 1. Goal

Make PR-level CI fast by default: only the cheap integration suite
runs automatically, the heavy chromium browser suite is OPT-IN via a
label, and the post-merge push to `main` always runs the full
browser suite as a safety net. When the browser suite IS triggered
(via label or push), selective path-filtering picks only the
relevant domain specs + cross-cutting.

Final policy after iteration on this same epic (see also § "Policy
revisions" below): default PR runs ~3 min instead of ~10 min; full
safety net runs at merge time + manually-tagged risky PRs.

## 2. Status quo + audit

The current `e2e.yml` runs `npx playwright test` as a single job with
no filtering. 32 browser specs + 2 integration specs, `workers: 1`
in CI, 2 retries per failure, ~2-minute build, Chromium startup
overhead → ~10 minutes wall-clock per PR. Free tier is 2000
minutes/month public / 500 private; a team running 5 PRs/day burns
~50 minutes/day on e2e alone. Most PRs are single-domain — a blog
content commit touches no auth or app code yet runs both suites.

## 3. Design decisions

1. **Browser tests are OPT-IN on PR.** Default PR runs only the
   integration suite (~1 min) — fast feedback. Reviewer/author
   applies `e2e:browser` (selective) or `e2e:full` (no filtering)
   when the change is UI-critical. Push to main always runs the
   full browser suite as post-merge safety net.
2. **Integration tests are always-on** (except `e2e:skip`). They
   are API-only (`request` fixture, no browser, no build) and cost
   ~1 min including npm install.
3. **`SKIP_WEBSERVER` env var** disables the Playwright global
   `webServer` config so integration jobs (which skip `npm run build`)
   don't fail with "Timed out waiting for config.webServer". Wired
   in `playwright.config.ts`.
4. **Single job with positional spec-path filtering** (when browser
   does run), not a matrix. Matrix multiplies build cost. `workers:1`
   serializes specs anyway.
5. **`dorny/paths-filter@v3.0.2` pinned to commit SHA** for
   changed-file detection. Battle-tested, no Marketplace lock-in.
6. **Cross-cutting always runs WHEN browser job runs** — smoke +
   locale-lock + site-header + site-footer. 4 specs, no opt-out.
7. **Full-suite fallback for browser** (when triggered): changes to
   `src/components/ui/**`, `src/styles.css`, `tailwind.config*`,
   `package*.json`, `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`,
   `playwright.config.ts`, `e2e/**`, `.github/workflows/**`,
   `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`.
8. **`main` push runs both jobs at full**, regardless of paths.
9. **PR labels**:
   - `e2e:browser` → run chromium with selective filtering
   - `e2e:full` → run chromium with FULL suite (no filtering)
   - `e2e:skip` → skip integration too (docs-only PRs)

## 4. Path → domain mapping

[Full table — see Section 4 of original plan above; reproduced here.]

| Domain | Spec dir | Triggering globs | Edge cases |
|---|---|---|---|
| marketing | `e2e/specs/marketing/` | `src/routes/{about,contact,index,changelog,cookies,privacy,schools,support,sponsors*,manage-support}.tsx`, `src/components/{home,layout,schools}/**`, `src/i18n/locales/sk/marketing.json`, `src/lib/seo/{faq,schools}-jsonld*` | `changelog`/`cookies` also overlap consent; both run |
| admin | `e2e/specs/admin/` | `src/routes/admin/**`, `src/components/admin/**`, `src/lib/admin/**`, `src/lib/blog/admin-queries*` | admin-queries blog-adjacent but admin-gated; triggers admin only |
| app | `e2e/specs/app/` | `src/routes/app*`, `src/lib/platform/**`, `src/lib/edu/**`, `src/components/app/**`, `src/components/composer/edu/**` | edu overlap reserved; only app runs until edu specs land |
| auth | `e2e/specs/auth/` | `src/routes/auth*`, `src/routes/forgot-password*`, `src/integrations/supabase/auth*`, `src/components/auth/**` | Supabase client → FULL via the full bucket |
| consent | `e2e/specs/consent/` | `src/hooks/useConsent*`, `src/lib/consent*`, `src/components/layout/Consent*`, `src/routes/cookies*` | cookies overlap marketing; both run |
| sponsorship | `e2e/specs/sponsorship/` | `src/routes/{support,sponsors*,manage-support,r.$shareId}.tsx`, `src/components/sponsorship/**`, `src/lib/sponsors/**` | support/sponsors overlap marketing; both run |
| composer (reserved) | `e2e/specs/composer/` | `src/routes/test.zostav*`, `src/components/composer/**` (excl. edu), `src/lib/quiz/composer*` | empty spec dir; filter wired, 0 specs until added |
| quiz (reserved) | `e2e/specs/quiz/` | `src/routes/test.*`, `src/components/quiz/**`, `src/lib/quiz/**`, `src/lib/share/**`, `src/lib/data-trap/**`, `src/i18n/quiz*`, `src/i18n/locales/sk/quiz.json` | quiz lib subsumes composer paths; both flags set |
| courses (reserved) | `e2e/specs/courses/` | `src/routes/courses*`, `src/components/courses/**`, `src/content/courses/**` | empty; wired for future use |
| blog (reserved) | `e2e/specs/blog/` | `src/routes/blog/**`, `src/components/blog/**`, `src/lib/blog/**` (excl. admin-queries), `src/content/blog/**`, `src/i18n/locales/sk/blog.json` | MDX/frontmatter included; reserved |
| test-packs (reserved) | `e2e/specs/test-packs/` | `src/routes/tests*` | distinct from `/test/**`; only public index |
| cross-cutting | `e2e/specs/cross-cutting/` | always | cannot be filtered out |

## 5. Workflow file (drop-in replacement for `.github/workflows/e2e.yml`)

See [the full YAML in the proposal section below](#proposed-workflow-yaml).

## 6. Build artifact sharing

Single job builds once + uses in same workspace. Integration runs as
separate job — no bundle needed (request fixture hits BASE_URL).
Future matrix expansion → build artifact upload + downloads (cost
analysis in original plan).

## 7. Safety guarantees

(a) cross-cutting always runs; (b) `e2e/**` or `playwright.config.ts`
change → FULL; (c) `src/components/ui/**` or `src/styles.css`
change → FULL (Tailwind v4 tokens cascade); (d) `package*.json` /
`tsconfig*.json` → FULL; (e) PR label `e2e:full` → FULL; (f) push to
main → FULL.

## 8. Validation plan

1. Replay against a content-only PR (PR #28: blog frontmatter
   only) → expect cross-cutting + blog (0 specs) only.
2. Test PR changing `src/routes/about.tsx` → expect marketing +
   cross-cutting = 11 specs.
3. Test PR changing `src/styles.css` → expect FULL = 32 specs.
4. Apply `e2e:skip` to docs-only PR → expect playwright job
   skipped, integration still runs.
5. Measure wall-clock case 1 vs. baseline (~10 min) — target < 3 min.

## 9. Risks + mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Domain path missing from filter; regression slips | Medium | Cross-cutting always runs; `full` bucket is nuclear; YAML CR required |
| `paths-filter` SHA stale post-security-update | Low | Dependabot + monthly manual pin bump |
| `pull_request.labels` not populated for first-time contributors | Low | Labels are additive opt-ins; default flow unaffected |
| Integration tests target `localhost:8080`, no server | High (currently) | Set `E2E_BASE_URL` repo variable to staging URL; document |
| `e2e:skip` left on PR that later touches auth | Medium | Future: warning workflow on label + auth-path combo |

## 10. Out of scope

- Parallel sharding across Chromium runners (separate epic)
- Browser matrix expansion (Safari, Firefox)
- Integration optimization (already < 30 s)
- Build artifact propagation infra (only needed at 3+ concurrent
  domain jobs)
- Auto-label management bot

## 11. Rollback

Single-file edit. Revert via `git revert <sha>` or restore the old
68-line YAML from PR description.

## Approval gate

Per CLAUDE.md: cannot edit `.github/workflows/**` without explicit
user ask in the current turn. **This plan ends here.** Implementation
is a single `Edit` on `.github/workflows/e2e.yml` once approved.
