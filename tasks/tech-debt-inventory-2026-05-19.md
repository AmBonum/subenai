# Tech-debt inventory — drain pass 2026-05-19

> **Purpose**: honest accounting of every code-quality suppression
> (eslint-disable, test.skip, TODO, @deprecated, etc.) **before**
> Phase 0.5 baseline measurement by the testing-coverage agent.
> A fair baseline must measure the actual surface, not the
> "suppressed-warning state".
>
> **Verdict after audit**: codebase is materially clean.
> Suppressions are minimal and individually justified. The drain
> focuses on chronic git-status noise (regenerated artifacts) and
> producing this audit as the baseline context.

## 1. Inventory (full counts)

| Category | Count | Notes |
|---|---|---|
| `eslint-disable` (any) | 6 | All annotated, all legitimate (see § 2) |
| `@ts-expect-error` / `@ts-ignore` | 0 | Clean — no type-system bypasses anywhere |
| `test.skip` / `.only` / `xit` / `xdescribe` | 8 | All have inline rationale (see § 3) |
| `/* istanbul ignore … */` | 0 | Clean |
| `@deprecated` markers | 0 | Clean |
| TODO / FIXME / HACK / XXX in src | 19 | Mostly content false-positives + 1 stable forward-ref to AH-12 schema epic (see § 4) |
| `console.log/.warn/.debug/.error` (un-DEV-guarded) | 1 | `src/lib/quiz/category-recommendations.ts:80` — intentional graceful-degradation (E17.4 senior CR finding) |
| Empty catch blocks (`catch {}`) | 0 measurable | All `catch` blocks reviewed have either a body or a documented "swallow" comment |

## 2. `eslint-disable` directives (6, all legitimate)

| File:line | Rule | Justification |
|---|---|---|
| `src/routeTree.gen.ts:1` | `/* eslint-disable */` | TanStack Router code-generated file, regenerates on file-system events. Cannot lint generated code without breaking the generator. |
| `src/components/admin/RespondentsList.tsx:57` | `react-hooks/exhaustive-deps` | Effect intentionally fires once on mount + manual refresh; deps array contains the controllable seed. |
| `src/components/quiz/results/ResultsView.tsx:145` | `react-hooks/exhaustive-deps` | Persistence-attempt effect is gated by `useRef`-tracked flag — re-fires on dep change would double-insert. |
| `src/components/quiz/flow/TestFlow.tsx:169` | `react-hooks/exhaustive-deps` | Boot effect, runs once on attempt-start. |
| `src/i18n/locale-context.tsx:19` | `react-refresh/only-export-components` | Context file legitimately exports both the Provider component and a hook — Vite Fast Refresh forbids the combo by default for HMR boundary correctness, but this module is stable. |
| `src/routes/app.digest.lazy.tsx:44` | `react-hooks/exhaustive-deps` | Lazy-route mount effect. |

**Recovery feasibility**: zero. Each suppression encodes a deliberate architectural decision.

## 3. `test.skip` markers (8)

| Spec | Test | Reason | Recoverable? |
|---|---|---|---|
| `e2e/specs/auth/verify-2fa.spec.ts:528` | TC-08: AAL2 redirect | "server-side beforeLoad — uncheckable via page.route()" | Requires request-fixture-based test, not page-fixture. New architectural approach. |
| `e2e/specs/auth/verify-2fa.spec.ts:559` | TC-09: unauth redirect | Same as TC-08 | Same |
| `e2e/specs/auth/verify-2fa.spec.ts:579` | TC-10: AAL1 no-TOTP redirect | Same | Same |
| `e2e/specs/auth/enroll-2fa.spec.ts:464` | TC-08: AAL2 redirect | Same | Same |
| `e2e/specs/auth/enroll-2fa.spec.ts:505` | TC-09: existing factor redirect | Same | Same |
| `e2e/specs/auth/enroll-2fa.spec.ts:636` | TC-11: OTP non-digit blocking | "Inline error testid never existed; needs toast-based rewrite" | Doable: add `data-testid="enroll-2fa-otp-error"` to source. Out of scope for drain. |
| `e2e/specs/admin/answer-set-editor.spec.ts:56` | empty-title inline error | Same as enroll-2fa TC-11 — assumed UX that never shipped (sonner toast is actual UI) | Doable: rewrite assertions against `toast.error` mock. Out of scope. |
| `e2e/integration/webhooks/webhook-events.spec.ts:81` | All 13 stripe-webhook tests | Conditional skip when `.dev.vars` absent (CI never has it) — local-only by design (E20 fix) | Not recoverable in CI by design — needs local wrangler dev + Stripe TEST creds. |

**Net recoverable in CI right now**: 0. Six auth skips need a request-fixture architectural rewrite (separate ~2-session epic). The two "test-id needs adding" ones are doable but each ~30 min of source + spec edits and out of this drain's scope. The webhook skip is correct-by-design.

## 4. TODO / FIXME / HACK / XXX in `src/` (19 total)

**13 are forward-references to the AH-12 schema-enrichment epic** in `src/lib/admin/queries.ts` and `src/lib/platform/queries.ts`. They tag fields where the admin surface currently returns sensible defaults because the DB schema doesn't model the underlying source yet (e.g. `last_active_at`, `real event types`, `join target row`). All carry the exact same comment template: `TODO: derive when AH-12 schema enrichment lands (<specifics>)`. They are tracked debt — not noise.

**3 are content false-positives**: scam example texts in `src/lib/quiz/bank/questions.ts:1682,2305` and `src/content/courses/bec-pracovisko.ts:27` use `XXX` as a redaction in fake phone numbers / IBAN / urgency text — these are valid quiz content, not code markers. The regex picked them up by mistake.

**2 are URL examples**: `src/lib/quiz/og-image/index.ts:154` mentions "no /r/XXXX path" as a doc comment. Not a TODO.

**1 is a `TODO: AH-11.6` reference** at `src/routes/admin/answer-sets.$setId.lazy.tsx:338` — same pattern as the AH-12 cluster, forward-tracked to a separate schema epic.

**Net actionable TODOs in src**: 0. Everything is either content false-positive, doc text, or forward-tracked to a planned schema epic that isn't this batch's scope.

## 5. Chronic git-status noise — drained

Two files were modifying git status on every dev run without representing any source change. Both moved to `.gitignore` in this batch:

- **`public/blog/rss.xml`** — regenerated by `scripts/generate-blog-rss.mjs` on every `npm run build`. The `<lastBuildDate>` timestamp changes every run. Cloudflare Pages regenerates it from source on deploy; we don't need to track the build output.
- **`.claude/scheduled_tasks.lock`** — Claude Code per-worktree scheduling state. Ephemeral.

Effect: a clean `git status` after a build now actually means clean. Previously you had to mentally filter "rss.xml is fine, ignore it" forever.

## 6. Drain decisions explicitly NOT taken

These were considered and deliberately deferred:

- **`src/routeTree.gen.ts` to .gitignore**: bigger structural decision. The file IS code-generated but is checked in so that fresh clones / CI builds without `npm run dev` first have a valid route tree. Untracking it requires adding a `prebuild` script to regenerate. Out of scope.
- **Rewriting the 6 auth `test.skip` cases** to use request fixtures instead of page fixtures: legit architectural epic (~2 sessions) per the Phase 4 plan owner.
- **Adding `enroll-2fa-otp-error` testid + rewriting the 2 "needs test-id" skips**: doable in ~1h but mixes source + spec changes in a way that needs ownership from the Phase 4 author.
- **Migrating TODO comments to GitHub Issues**: would convert in-code debt into out-of-code debt without changing anything. The current AH-12 reference style is fine for an in-flight epic.

## 7. Baseline-fair surface

After this drain, the testing-coverage agent's Phase 0.5 baseline measures:

- A codebase with 0 type-system bypasses and 0 dynamic coverage suppressions.
- 6 documented eslint suppressions, all legitimate architectural decisions.
- 8 documented test skips — 6 architecturally blocked, 2 deferred to future test-id additions, 1 design-correct (local-only spec).
- 0 untracked-build-artifact noise in git status.

The baseline number that emerges from Phase 0.5 will be **representative of the actual codebase state**, not artificially inflated by suppressed warnings or artificially deflated by chronic git noise.

## Footnote

This drain pass intentionally **does not** raise the lint or coverage thresholds (`vitest.config.ts:29` stays at lines 57, functions 49). Threshold-tightening is the testing-coverage agent's call — they own the bar.
