# Scam-call audio · question audit · test analytics — Design

**Date:** 2026-07-01
**Status:** Approved (autonomous build-to-prod mandate)

Four independent sub-projects, each shipped as its own branch → PR → merge → CF Pages deploy → live verify. Build order **SP4 → SP3 → SP1 → SP2** (lowest-risk-first; SP2 reuses SP1's player).

---

## SP4 · Test analytics (E59) — surface already-captured data

**Insight:** per-question timing already exists. `QuestionCard.tsx` measures `responseMs`; `computeScore()` persists `answers` (each `AnswerRecord` = `{questionId, optionId, correct, severity, responseMs, category, difficulty}`) plus `total_time_ms` into `attempts`. No capture work, no migration.

**Build:**
- `src/lib/quiz/score/analytics.ts` — pure `computeAnalytics(answers: AnswerRecord[]): TestAnalytics`. Derives: `totalTimeMs`, `avgResponseMs`, `medianResponseMs`, `fastestMs`/`slowestMs` (+ their questionIds), `rushRate` (share answered <2s), accuracy + avg time **per difficulty** (easy/medium/hard), accuracy + avg time **per category**, longest correct streak, count answered vs timed-out.
- `src/components/quiz/results/TestAnalyticsPanel.tsx` — a card rendered in `ResultsView` under the existing stats grid. Compact stat tiles + per-difficulty/per-category mini-rows. All copy via `tFor("results")` new `analytics.*` keys (sk/en/cs). Every element gets a `data-testid` (`results-analytics-*`).
- Rendered from `answers` already in `ResultsView` memory — works for both live and (since `answers` is persisted) future shared-page reuse.

**Tests:** unit-test `computeAnalytics` (timing math, per-bucket aggregation, empty/timeout edge cases); RTL test that the panel renders the derived numbers. No RLS/schema change.

---

## SP3 · Question + pack audit (E60) — harder, contextual, real SK scams

**Scope (senior decision):** audit-then-targeted-upgrade, NOT a blind rewrite of all 238. Flag weak/dated/too-easy/unrealistic items, rewrite those, add new hard items, rebalance difficulty toward medium/hard.

**Realism anchor:** documented 2023–2025 Slovak scams — Slovenská pošta "doplatok" SMS, fake SLSP/ČSOB/Tatra/VÚB bank SMS+calls, "syn/dcéra v núdzi" WhatsApp, DHL/GLS/Packeta balík, Bazoš/Bazár predplatba, investičné podvody (fake celebrity/AI obchodovanie), Booking.com phishing, Microsoft/Europol/polícia výhražné hovory, QR „quishing".

**Build:**
- `src/lib/quiz/bank/questions.ts` upgrades + additions (schema unchanged).
- Optional pack adjustments in `src/content/test-packs/*.ts`.
- Audit captured in `docs/superpowers/specs/2026-07-01-question-audit.md` (which items changed + why).
- Parallelize the audit pass with subagents (delegation-matrix justified: 238 items, independent chunks).

**Tests:** `tests/lib/quiz/bank-invariants.test.ts` — every question schema-valid, unique IDs, ≥1 correct option, all wrong options carry a severity, difficulty distribution assertion, no empty prompts/explanations.

---

## SP1 · Academy audio (E61) — external embeds only

**Your choice:** link/embed official third-party recordings (NBÚ, polícia SR, awareness videos); host nothing.

**Build:**
- Extend `CourseSection` union (`src/content/courses/_schema.ts`) with `{ kind: "embed"; provider: "youtube" | "external"; url; title; sourceName; sourceUrl; description? }`.
- `:::embed` fenced directive in `BlogPostBody.tsx` for markdown articles (mirrors `#themed`).
- `src/components/academy/ScamAudioEmbed.tsx` — privacy-first **click-to-load** card: shows title + source attribution + external link; the YouTube/`<iframe>` only mounts on click (no third-party cookies until interaction). `data-testid="scam-audio-embed*"`.
- CSP (`public/_headers`): add `https://www.youtube-nocookie.com` to `frame-src`; add external media hosts to `media-src`. Update `tests/security/csp-*.test.ts`.
- Add embeds to relevant existing courses/articles.

**Tests:** card renders attribution + source link; iframe absent pre-click, present post-click; CSP artifact test green with new directives; course-schema test accepts the new kind.

---

## SP2 · Test audio (E62) — gated by a site sound toggle

**Build:**
- Migration: `profile_preferences.sounds_enabled boolean not null default false` (+ DEPLOY_SETUP.sql + types.ts). Anonymous test-takers use `localStorage["iiq-sounds-enabled"]`.
- `src/hooks/useSoundPreference.ts` — single source of truth (DB for authed, localStorage for anon), returns `{ soundsEnabled, setSoundsEnabled }`.
- Sound toggle UI: account settings + a small speaker toggle on the test intro screen.
- Questions gain optional `audio?: { provider: "youtube" | "external"; url: string; attribution: string }` (schema addition). On a `call`-kind question, when sounds enabled, render a **compact click-to-play** player (reuses `ScamAudioEmbed` compact variant). Sounds off → no audio UI at all.

**Tests:** `useSoundPreference` (DB vs localStorage paths); gating — sound off → no player, sound on → player renders; pref persists; `TestFlow` respects the gate. Migration SQL pasted to chat for prod apply.

---

## Cross-cutting

- Lint 0/0, all suites green, build ✓ before each merge.
- DB migrations (SP2 only) are code-only on the branch; SQL pasted to chat and applied to prod via Management-API script only after merge.
- `data-testid` on every asserted element; POM-only e2e locators.
- No `CONSENT_VERSION` bump (no new data surface that re-shows the banner; sound pref is a UI preference, covered by existing functional consent).
