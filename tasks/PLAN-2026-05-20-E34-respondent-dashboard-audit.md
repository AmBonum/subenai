# E34 — Respondent flow + author dashboard senior audit

**Owner:** Claude (synthesis) — senior agent, 4-lens audit
**Date opened:** 2026-05-20
**Status:** 🟢 DECISIONS LOCKED 2026-05-20 — owner walked D1–D11 in 3 batches; 10/11 senior defaults picked, 1 override (D3 → confidence framing for engagement). Phase 1 implementation kicks off next on `feature/E34-phase-1-drilldown-funnel`.

## Locked decisions (2026-05-20 owner sign-off)

| ID | Decision | Locked | Note |
|---|---|---|---|
| D1 | Drill-down scope | **(a) Full per-question breakdown** | Schema migration adds `answers JSONB` |
| D2 | Funnel visibility | **(a) Server-side `intake_started_at`** | Same migration as D1 |
| D3 | Landing copy direction | **(b) Confidence framing** | OVERRIDE — owner picked provocative for engagement |
| D4 | Post-score upsell | **(a)+(c) Hybrid** | `/tests` CTA + contextual `/courses` card for weakest category |
| D5 | Dashboard email | **(b) Defer + copy-link button** | No broadcast surface; surface "Pošli ďalším" copy + 1-click re-share |
| D6 | CSV GDPR caveat | **(a) Header comment in CSV** | 2-line `#` Slovak prefix at top of file |
| D7 | OG meta on share links | **(b) Personalized** | `"Test od {creator_label} — 5 minút"` via SSR head() |
| D8 | Sort persistence | **Persist across filter** | Lift sort state up; preserve through re-render |
| D9 | New `set_attempts` columns | **Both in one migration** | `answers JSONB` + `intake_started_at TIMESTAMPTZ`, both nullable |
| D10 | Shipping order | **(b) 3 sequential PRs** | Phase 1 (drill-down + funnel) → Phase 2 (marketing/copy) → Phase 3 (compliance polish + e2e) |
| D11 | Migration timing | **(a) Migration in Phase 1 PR** | User applies SQL on prod after merge, per CLAUDE.md |
**Surfaces in scope:**
- `/test/builder/$id` — respondent landing (the "should I trust this?" moment)
- `/test/builder/$id` → IntakeForm → QuizFlow → score view (the respondent take)
- `/test/builder/$id/results` — author password gate + dashboard (the B2B value-delivery surface)
- All copy / SEO / marketing surfaces that touch the respondent + author after the composer hands them a share link

---

## TL;DR

E33 closed the **build** surface (`/test/builder`). E34 closes the **consume** surfaces — what every respondent sees after the author shares a link, and what every author sees when they come back to view team progress. The composer is the iceberg's 10%; this is the 90% that decides whether a custom test actually delivers value.

Three high-leverage leaks identified across the 4 lenses:

1. **The dashboard is a leaderboard, not a teaching tool.** Author sees `{name, email, score%, passed?}` per row but **cannot click into any respondent to see which questions they got wrong**. For B2B security training — the entire reason this feature exists — that's the difference between "Anna scored 60%" (useless) and "Anna scored 60% and failed both phishing questions, retrain her there" (actionable). No per-question drill-down exists; no `answer_breakdown` column on `set_attempts`; no detail route.
2. **The respondent landing has no motivation, no time-to-complete, no brand context.** A user opens a Slack message from their colleague, clicks the link, lands on a page that says "Spustiť test →" and **nothing else**. No "5 minút", no "anonymné", no "tvoj tím sa pripravuje na phishing útoky" — no answer to "should I do this right now?". First-time visitor bounce risk is high.
3. **Drop-off is invisible to the author.** If 30 colleagues open the share link, 12 fill the intake form, 7 finish the quiz, the author only sees "7 respondentov" on the dashboard. No funnel. No way to identify who started but didn't finish. No "send reminder" affordance.

The audit also surfaced a handful of compliance / polish issues (CSV GDPR caveat missing, no OG meta on share links, sort-doesn't-stick-across-filter). Folded into Phase 3.

---

## Discovery — current state

### Routing (TanStack file-based)

| File | Route | Component | Purpose |
|---|---|---|---|
| `src/routes/test.builder.$id.tsx` | `/test/builder/$id` | `noindex` head, `<Outlet />` layout | Pathless parent for the respondent + results subtree |
| `src/routes/test.builder.$id.index.lazy.tsx` | `/test/builder/$id/` | `BuilderSetView` | Respondent landing — hero, intake (if edu), or TestFlow |
| `src/routes/test.builder.$id.results.tsx` | `/test/builder/$id/results` | `noindex` head | Eager loader for results gate |
| `src/routes/test.builder.$id.results.lazy.tsx` | `/test/builder/$id/results` | `ResultsView` (5 phases: loading, needs_auth, ready, error, not_found) | Author password gate + dashboard |

### Component map

| Component | File | Surface | Tested? |
|---|---|---|---|
| `BuilderSetView` | `src/routes/test.builder.$id.index.lazy.tsx` | Respondent landing hero | ✅ e2e (TC-01 shared-set) |
| `RespondentIntakeForm` | `src/components/composer/edu/intake/RespondentIntakeForm.tsx` | Intake fields + GDPR | ✅ e2e (TC-01, TC-06, TC-15-17 schools-howitworks) |
| `TestFlow` / `QuestionCard` | `src/components/quiz/flow/*` | Quiz take (per-question + timer + progress) | ✅ e2e (TC-30 composer round-trip from PR #48) |
| `ResultsView` (respondent post-score) | (within TestFlow result phase) | Score + breakdown + share | ⚠️ e2e covers score render, not category breakdown |
| `AuthorPasswordGate` | (inline in results.lazy.tsx) | Password input + 5 error codes | ✅ e2e (TC-04, TC-08-11, TC-14, TC-22-23 schools-howitworks) |
| `AggregateStats` | `src/components/composer/edu/dashboard/AggregateStats.tsx` | Count/avg/median/min-max/pass-rate + 4-band histogram | ✅ e2e (TC-02, TC-03 schools-howitworks) |
| `RespondentsTable` | `src/components/composer/edu/dashboard/RespondentsTable.tsx` | Search + 3-column sort + delete | ✅ e2e (TC-13, TC-18-20 schools-howitworks) |
| **Per-respondent detail view** | **DOES NOT EXIST** | (gap) | n/a |

### Slovak copy inventory (representative)

Already-written copy is high-quality on the **structural** strings (form labels, GDPR text, error codes). Where the gap lives is in the **persuasion / framing strings** — the copy that converts a hesitant respondent into a finished respondent. Examples:

- Respondent landing heading falls back to `"Pripravený test pre teba"` if no creator_label — bland, generic.
- No `time_estimate`, `why_take_this`, `who_will_see_results`, `your_data_is_safe_short` keys at all.
- Author dashboard heading is `"Výsledky edu testu"` (functional, but doesn't celebrate progress — could be `"Tvoj tím sa učí — výsledky"`).
- Empty state is `"Zatiaľ žiadne odpovede. Pošli respondentom verejný link."` — the link isn't on the page; author has to navigate back to find it.

### Inbound entry-points to the surfaces

Once an author shares a link, the respondent comes from:
- Slack / Teams paste (most common, per persona)
- Email with the link
- QR code in physical onboarding setup
- Bookmark (rare, but the link is human-readable)

The respondent has **never seen subenai before** in 80% of cases. That's the audience the landing needs to convert.

### Existing e2e + unit coverage

| Spec | TCs | What's covered |
|---|---|---|
| `e2e/specs/edu/schools-howitworks-contract.spec.ts` | 24 | Full edu flow incl. all dashboard widgets + delete + CSV + auth gate edge cases |
| `e2e/specs/quiz/shared-set.spec.ts` | 5 | Public (non-edu) shared-set landing + start + score render |
| `e2e/specs/composer/round-trip.spec.ts` | 5 | Composer → share → respond → score → results round-trip (PR #48) |
| `e2e/specs/composer/build-ux.spec.ts` | 5 | Composer build UX (E33 Phase 1 sentinel) |
| `e2e/specs/composer/seo-jsonld.spec.ts` | 2 | WebApplication JSON-LD on /test/builder |
| `tests/routes/test-builder-routing.test.ts` | 3 | Route-tree structure sentinel (E33 hotfix) |

**Vitest coverage on respondent + dashboard components is thin**:
- ✅ `tests/functions/results-data.test.ts` — CSV gen, aggregate computation
- ✅ `tests/functions/delete-edu-respondent.test.ts` — Deletion + audit_log
- ✅ `tests/functions/begin-edu-attempt.test.ts` + `finish-edu-attempt.test.ts` — Score submission API
- ❌ **No** Vitest coverage for `IntakeForm`, `AggregateStats`, `RespondentsTable`, `AuthorPasswordGate` as components (they're only tested through e2e).

That's defensible for now — e2e drives the integration paths — but unit tests would catch a class of fast-feedback regressions (e.g., a sort comparator that breaks for Slovak diacritics).

---

## 4-lens audit findings

### Lens 1 — UX

| # | Finding | Severity | Surface |
|---|---|---|---|
| **U1** | No per-respondent detail drill-down. Table row → end of road. Author cannot see which questions Anna got wrong, only her score. | **High** (this is the B2B value prop) | Dashboard |
| **U2** | No funnel visibility. If 30 people opened the link, 12 filled intake, 7 finished, dashboard only shows "7". | **High** | Dashboard |
| **U3** | Respondent landing has no motivation, no time estimate, no brand context. Lands straight on CTA. | **High** | Respondent landing |
| **U4** | Post-score CTAs limited. Respondent sees their score + "share results" but no "take another test" / "browse packs" upsell. | **Medium** | Respondent results |
| **U5** | Sort doesn't persist across filter. Sort by score → search "Jan" → sort resets to date. | Low (paper-cut) | Dashboard table |
| **U6** | No skeleton state while dashboard loads (the `loading` phase is just a spinner). On slow 3G this looks broken. | Low | Dashboard load |
| **U7** | No "re-share test" affordance on dashboard. Author must navigate to composer to get share link again. | Medium | Dashboard |
| **U8** | Quiz progress between questions is in-card only. Between cards is a blank moment on mobile. | Low | Quiz take |
| **U9** | Delete is permanent with confirm. No undo / 30-day soft-delete. (Intentional per CLAUDE.md spirit; flagged not for change but for awareness.) | Awareness | Dashboard |

### Lens 2 — Marketing / conversion

| # | Finding | Severity |
|---|---|---|
| **M1** | Respondent landing makes no case for completing. No "5 minút", no "anonymné výsledky", no "tvoj tím sa pripravuje". | High |
| **M2** | Post-score upsell is minimal. We get a *converted* user, then drop them. | High |
| **M3** | Dashboard empty state mentions "pošli respondentom verejný link" but doesn't show the link. Author has to remember it. | Medium |
| **M4** | No social proof on respondent landing. "Tento test už dokončilo X ľudí" would be cheap and effective (when X > 3). | Medium |
| **M5** | Author dashboard doesn't surface aggregate insights as a story. "27 / 30 vyhovelo, priemerné skóre 78 %, najslabšia kategória phishing" would be 1 sentence of narrative copy a senior PM would write. | Medium |

### Lens 3 — SEO / compliance

| # | Finding | Severity |
|---|---|---|
| **S1** | Private routes (`/test/builder/$id*`) emit `noindex` ✓. No SEO bug. | OK |
| **S2** | No OG meta on `/test/builder/$id` — when respondent shares the link on Slack, preview is bare. Senior fix: emit `og:title="Pripoj sa k testu pre {creator_label}"` + `og:image=/og-shared-test.png` + `og:description="5 minút, anonymné výsledky."` | Medium |
| **S3** | CSV export has no GDPR data-retention reminder. Author downloads `{name, email, score}` and may keep it indefinitely. Slovak/EU 12-month policy says they shouldn't. Senior fix: 2-line CSV header comment in Slovak (`# subenai.sk — exportované {date}. Uchovaj max. 12 mesiacov. Po skončení zmaž súbor.`) — or a dialog confirm before download. | Medium |
| **S4** | Honeypot on intake form ✓ (visually hidden, server-validated). | OK |
| **S5** | Password gate rate-limited 5 attempts / 15 min ✓ (TC-04 schools-howitworks pins this). | OK |

### Lens 4 — Slovak copy

| # | Finding | Severity |
|---|---|---|
| **C1** | Respondent landing heading fallback `"Pripravený test pre teba"` is bland. Better: `"Tvoj tím ti poslal test bezpečnosti"` (frames the WHO + WHY in one line). | High |
| **C2** | No `time_estimate` ("Trvá ~5 minút") visible anywhere on landing. Universal conversion lever. | High |
| **C3** | No `who_will_see_results` clarification ("Tvoje meno + skóre vidí len {author_name}. Nie my, nie tvoj tím."). Builds trust. Disclosure exists in intake but is buried. | High |
| **C4** | Dashboard heading `"Výsledky edu testu"` is descriptive. Could be slightly more human: `"{creator_label} — výsledky tímu"`. | Medium |
| **C5** | Empty state mentions "pošli verejný link" — the link is not visible. Either inline it OR change copy to point to a "Skopírovať link" button (which doesn't exist yet but Phase 2 should add). | Medium |
| **C6** | Score result page Slovak is solid (E20 pass) but doesn't contextualise the score for an edu respondent ("Si lepší než 60 % ľudí" is for the public test; for an edu test the comparator should be "Si lepší než 60 % tvojho tímu" — but only if `respondentCount >= 5` to keep comparison statistically honest). | Medium |

---

## Decision tree — D1 → D11

Project owner answers; senior defaults pre-picked. Override at will.

### D1 — Per-respondent detail drill-down scope

The **single highest-leverage** feature this plan can add. Three options:

| Option | Cost | Value | Senior pick |
|---|---|---|---|
| **(a) Full per-question breakdown** — click respondent row → modal/page shows each question, the option they picked, the correct option, time spent, category | High (~3 days: schema migration to persist answers as JSONB, new component, new API endpoint, e2e) | Maximum — turns dashboard into a teaching tool | ✓ Recommended |
| (b) Summary card per respondent — modal shows total time, per-category subscores, weak categories, but NOT per-question | Medium (~1 day: API extension, component) | Medium — still useful for "Anna is weak on phishing" | Acceptable if 3-day budget unavailable |
| (c) Defer to E35 — ship E34 without drill-down | Low | Low | Not recommended — leaves the biggest leak open |

**Senior default: (a)**. The schema migration is straightforward (`set_attempts.answers JSONB` column + backfill nulls). Without (a), the dashboard remains a leaderboard.

### D2 — Funnel visibility (started / completed / abandoned)

| Option | Implementation | Trade-off |
|---|---|---|
| **(a) Server-side** — add `intake_started_at` column to `set_attempts`; row exists from intake submit, score columns nullable until quiz finish | Schema change + API change + dashboard widget | Most accurate; aligns with audit-log already on `set_attempts` |
| (b) Client-side telemetry — fire a "started" beacon to a new endpoint, store separately | New endpoint + new table or counter | Looser coupling but two-source-of-truth risk |
| (c) Skip — funnel out of scope for E34 | None | Leaves U2 open; "view team progress" is incomplete |

**Senior default: (a)**. Same schema migration that adds drill-down can also add `intake_started_at` — one migration for both.

### D3 — Respondent landing motivation copy direction

| Tone | Example heading | Best for |
|---|---|---|
| **(a) Trust framing** — "Tvoj tím ti poslal test bezpečnosti. Trvá 5 minút." | Plain, professional | B2B / formal teams |
| (b) Confidence framing — "Vieš rozpoznať phishing? Tvoj tím sa to chce dozvedieť." | Slightly provocative | Younger / casual teams |
| (c) Brand-led — "subenai · test bezpečnosti pre tvoj tím" | Brand-first | When subenai becomes recognized |

**Senior default: (a)**. Hits the conversion-blocking question ("should I do this?") in one sentence — who sent it, what it is, how long. Subordinates the brand to the use-case.

### D4 — Post-score upsell destination

After respondent finishes, the result page currently shows score + share. Add one upsell CTA — where to?

| Option | Implication |
|---|---|
| **(a) `/tests` (ready packs)** | "Pozri ďalšie testy" — generic, low-commit. Best for unauth visitors. |
| (b) `/test/builder` (build your own) | "Zostav vlastný test" — for power users; lower conversion but higher LTV |
| (c) `/courses` | "Krátke školenia" — natural follow-up after seeing weak categories |
| (d) Dynamic — pick (a/b/c) based on weakest category band | Complex but compelling |

**Senior default: (a) + (c) inline**. One subtle CTA to `/tests` ("Pozri ďalšie testy →") + a contextual "Tvoja najslabšia téma: phishing. Pozri kurz." card linking to `/courses` if a weak category surfaced. (d) is over-engineered for v1.

### D5 — Email respondents from dashboard

| Option | Cost |
|---|---|
| (a) Build it — wire to Resend/SES, template, unsubscribe token | High (~2 days) |
| **(b) Defer — surface a "Skopírovať link na test" button + "Pošli ho ďalším" copy on the dashboard** | Low — the user already has their team's emails; they paste back into Slack |
| (c) Skip — out of scope | Low |

**Senior default: (b)**. Authors already have a channel (Slack/email). Building our own broadcast is duplicative and adds a deliverability / abuse-vector surface. The minimum that moves the metric is "make re-sharing one-click from the dashboard."

### D6 — CSV GDPR caveat placement

| Option | Implementation |
|---|---|
| **(a) Header comment in the CSV** (2 lines of `# ` prefixed Slovak) | Cheap; users see it when they open the file |
| (b) Dialog modal before download | Friction; users dismiss without reading |
| (c) Both | Belt-and-suspenders; safe for B2B compliance review |

**Senior default: (a)**. The author downloaded it; they'll open it. (b) is dark-patterny if mandatory; (c) is overkill.

### D7 — OG meta for shared links

| Option | Implementation |
|---|---|
| (a) Generic OG — title "Test bezpečnosti pre tím — subenai" | Static, cheap |
| **(b) Personalized OG — title "Test od {creator_label} — 5 minút"** | Requires server-side rendering of head() with set data |
| (c) Skip — Slack/Teams previews stay bare | None |

**Senior default: (b)**. The CF Pages SSR worker already runs head() with route loaders; pulling `creator_label` from Supabase in the loader is the same pattern E25 used for blog post OG. Cost: ~1 hour.

### D8 — Sort persistence across filter

**Senior default: persist**. Current behaviour is the React paper-cut variety — re-rendering recomputes from scratch. Fix: lift sort state up; preserve across filter changes.

### D9 — New `set_attempts` columns

For D1 (drill-down) + D2 (funnel), we need:
- `answers JSONB` — array of `{questionId, picked, correct, timeMs}` (drill-down)
- `intake_started_at TIMESTAMPTZ` — first beacon when intake submits (funnel)

Both columns nullable to backfill existing rows as `null`. Migration is **code-only on the branch**; deploy SQL is gated behind merge per CLAUDE.md.

**Senior default: add both columns in one migration**.

### D10 — Shipping order

| Option | PRs | Trade-off |
|---|---|---|
| (a) One big PR — everything in E34 | 1 | Simple to review but risky to merge |
| **(b) 3 sequential PRs — Phase 1 (drill-down + funnel) → Phase 2 (marketing/copy) → Phase 3 (compliance polish + e2e)** | 3 | Each PR shippable independently; rollback granularity |
| (c) 2 PRs — Phases 1+2 together (schema + UX + copy) then 3 (polish + e2e) | 2 | Middle ground |

**Senior default: (b)**. Same pattern as E33. Phase 1 is the value PR; if user wants to stop after that, they have a much better dashboard. Phase 2 + 3 are additive polish.

### D11 — Schema migration timing

Per CLAUDE.md ("DB migrations on a branch are *code only* until merged"), the SQL doesn't apply to prod until merge. Two scenarios:

| Option | Implication |
|---|---|
| **(a) Migration in Phase 1 PR; user applies SQL to prod after merge** | Standard pattern; preview deploy of Phase 1 PR will fail until SQL applied (expected) |
| (b) Migration on its own PR first; Phase 1 PR depends | Lower preview-deploy noise; extra round-trip |

**Senior default: (a)**. Matches the E25 / E26 precedent the codebase follows.

---

## Phase 1 — Drill-down + funnel (the value PR)

**Size**: ~5 files + 1 migration + 1 backfill column + 6 TCs e2e.
**Risk**: medium — schema change touches `set_attempts`; existing rows backfill as `null` for the new columns; queries on RespondentsTable / AggregateStats unchanged.
**Value**: high — turns the dashboard from a leaderboard into a teaching tool.

### 1.1 — Schema migration

`supabase/migrations/{ts}_e34_set_attempts_drilldown.sql`:

```sql
ALTER TABLE public.set_attempts
  ADD COLUMN IF NOT EXISTS answers JSONB,
  ADD COLUMN IF NOT EXISTS intake_started_at TIMESTAMPTZ;

COMMENT ON COLUMN public.set_attempts.answers IS
  'E34: per-question breakdown. Array of {questionId, picked, correct, timeMs}. Nullable for pre-E34 rows.';
COMMENT ON COLUMN public.set_attempts.intake_started_at IS
  'E34: timestamp of intake form submission (before quiz). Used for funnel: intake_started_at IS NOT NULL AND completed_at IS NULL → "started but didn''t finish".';
```

Also land into `DEPLOY_SETUP.sql` per CLAUDE.md.

Update `src/integrations/supabase/types.ts` manually in same PR (no `supabase gen` in CI yet).

### 1.2 — API changes

**`functions/api/begin-edu-attempt.ts`**: when issuing the respondent JWT + creating the row, also set `intake_started_at = now()` server-side.

**`functions/api/finish-edu-attempt.ts`**: persist incoming `answers` array (already in payload per `e2e/seed/edu-test.ts:145` — it's currently `answers: {}` and ignored; this PR starts persisting).

**`functions/api/results-data.ts`**: include `answers` and `intake_started_at` in the response payload (existing handler reads `set_attempts` rows; just widen the SELECT).

### 1.3 — UI: drill-down

**New**: `src/components/composer/edu/dashboard/RespondentDetailModal.tsx`
- Opens on `RespondentsTable` row click
- Renders: header (name + email + score + date), per-category subscore strip, per-question list (question text, user's pick highlighted, correct answer highlighted, time spent, category badge)
- Testids: `respondent-detail-root`, `respondent-detail-header`, `respondent-detail-category-strip`, `respondent-detail-question-{id}`, `respondent-detail-close`
- Accessibility: focus-trap (Radix Dialog), Escape to close

**Modified**: `RespondentsTable.tsx`
- Row becomes a `<button>` (with delete trapped on a nested button, `stopPropagation`)
- Existing testids unchanged for back-compat

### 1.4 — UI: funnel widget

**New**: `src/components/composer/edu/dashboard/FunnelStrip.tsx`
- 3 columns: "Začalo intake" / "Dokončilo test" / "Nestihli dokončiť"
- Computed from `set_attempts` rows: `intake_started_at` non-null vs `completed_at` non-null
- Testids: `funnel-strip-root`, `funnel-strip-started`, `funnel-strip-completed`, `funnel-strip-abandoned`

**Modified**: `results.lazy.tsx` to render `<FunnelStrip>` between header meta-line and `<AggregateStats>`

### 1.5 — Tests

**Vitest** (component, not requiring dev server):
- `tests/components/composer/RespondentDetailModal.test.tsx` — renders question + pick + correct highlight; closes on ESC; category strip math
- `tests/components/composer/FunnelStrip.test.tsx` — 3-bucket math correct for various input shapes

**E2E** (in `e2e/specs/composer/round-trip.spec.ts`, extending the existing file):
- TC-35 — author clicks respondent row → detail modal opens → shows per-question breakdown
- TC-36 — author closes modal with ESC → focus returns to row
- TC-37 — funnel widget shows N-started / M-completed / (N-M)-abandoned correctly

### Deliverables — Phase 1
- 1 migration + DEPLOY_SETUP update + types regeneration
- 3 modified API endpoints (begin/finish/results-data)
- 2 new components (RespondentDetailModal, FunnelStrip)
- 1 modified component (RespondentsTable — row clickability)
- 2 new Vitest specs + 3 new e2e TCs
- Slovak copy keys added to `sk/quiz.json` under `composer.dashboard.*`

---

## Phase 2 — Marketing / copy senior pass

**Size**: 0 component-logic changes; ~12 i18n key additions/changes; 1 small new component (`RespondentLandingHero`).
**Risk**: very low — copy-only.
**Value**: high — moves the respondent-completion-rate metric.

### 2.1 — Respondent landing hero (D3 = trust framing)

**New**: `src/components/composer/edu/intake/RespondentLandingHero.tsx`
- Sits **above** `RespondentIntakeForm` (or, when `collects_responses=false`, above the start CTA)
- Renders 4 lines:
  1. Eyebrow: `"TEST BEZPEČNOSTI · 5 MINÚT"`
  2. h1: `"Tvoj tím ti poslal test bezpečnosti"` (or `"{creator_label}"` if defined)
  3. Subline: `"Spoznáš, ako rozpoznávaš phishing, podvodné stránky a falošné e-shopy."`
  4. Trust micro-line: `"Tvoje meno a skóre vidí len {author_label}. Anonymné, bez registrácie."`

Testids: `respondent-hero-root`, `respondent-hero-eyebrow`, `respondent-hero-heading`, `respondent-hero-subline`, `respondent-hero-trust`.

i18n keys (new):
```json
"respondent_landing": {
  "eyebrow": "TEST BEZPEČNOSTI · 5 MINÚT",
  "heading_default": "Tvoj tím ti poslal test bezpečnosti",
  "subline": "Spoznáš, ako rozpoznávaš phishing, podvodné stránky a falošné e-shopy.",
  "trust_line_default": "Anonymné, bez registrácie.",
  "trust_line_author": "Tvoje meno a skóre vidí len {author}. Anonymné, bez registrácie.",
  "trust_line_no_collect": "Výsledky vidíš len ty. Anonymné, bez registrácie."
}
```

### 2.2 — Empty-state inline link (C5 fix)

**Modified**: `RespondentsTable.tsx` empty state
- Change copy: `"Zatiaľ žiadne odpovede. Pošli respondentom link:"`
- Inline render the share URL (`https://subenai.sk/test/builder/{set_id}`) with a "Kopírovať" button next to it

i18n keys (new):
```json
"resp_table_empty_with_link": "Zatiaľ žiadne odpovede. Pošli respondentom link:",
"resp_table_copy_share_url": "Kopírovať link"
```

### 2.3 — Post-score upsell (D4 = (a)+(c))

**Modified**: `ResultsView` (within `TestFlow.tsx` result phase)
- Add a single subtle CTA strip below the breakdown: `"Pozri ďalšie testy →"` linking to `/tests`
- If respondent's weakest category resolved to a known band, add a contextual card: `"Tvoja najslabšia téma: {category}. Pozri kurz →"` linking to `/courses`

i18n keys (new):
```json
"post_score_more_tests": "Pozri ďalšie testy",
"post_score_weak_category_card_prefix": "Tvoja najslabšia téma:",
"post_score_weak_category_cta": "Pozri kurz"
```

### 2.4 — Score contextualisation for edu mode (C6)

**Modified**: percentile copy in `ResultsView`
- When the test came from a custom edu set (`config.edu` truthy) AND `respondentCount >= 5`, render `"Si lepší než {rate} % tvojho tímu"` instead of `"...ľudí"`
- When `respondentCount < 5`, render neutral `"Skóre: {score} / 100"` (no comparator — statistically meaningless)

### 2.5 — Slovak copy review

Existing copy is high-quality; this is a polish pass:
- C1 (landing fallback heading) — fixed by 2.1
- C2 (time estimate) — fixed by 2.1 eyebrow
- C3 (who-sees-results) — fixed by 2.1 trust micro-line + inline disclosure on intake form (already exists, just promote it)
- C4 (dashboard heading) — change `"Výsledky edu testu"` → `"{creator_label} — výsledky tímu"` with fallback to existing

### Deliverables — Phase 2
- 1 new component (RespondentLandingHero)
- 2 modified components (RespondentsTable empty state, ResultsView)
- ~12 new / changed i18n keys across `sk/quiz.json` (+ en/cs parity)
- Vitest spec for the new hero (`RespondentLandingHero.test.tsx`)
- E2E TC-38 — respondent landing hero renders with the 4 lines

---

## Phase 3 — Compliance polish + e2e contract

**Size**: ~6 files; ~8 TCs.
**Risk**: low.
**Value**: medium — compliance polish + permanent e2e regression sentinel.

### 3.1 — OG meta on share links (S2 fix)

**Modified**: `src/routes/test.builder.$id.tsx` head()
- Pull `creator_label` from set data via the loader (or pass it through if Phase 1 already widened the loader)
- Emit `og:title`, `og:description`, `og:image=/og-shared-test.png` (need to add this image asset — or reuse `/og-default.png` for v1)
- Keep `noindex` ✓

### 3.2 — CSV GDPR caveat (S3 fix)

**Modified**: `functions/api/results-data.ts` (CSV export branch)
- Prepend 2 lines of `# ` comment to the CSV output:
  ```
  # subenai.sk — exportované {ISO date}. Obsahuje osobné údaje respondentov.
  # GDPR: uchovaj max. 12 mesiacov. Po ukončení účelu spracovania súbor zmaž.
  ```
- Update the existing CSV test (`tests/functions/results-data.test.ts`) to assert the comment lines + that the UTF-8 BOM still leads

### 3.3 — Sort persistence (U5 fix)

**Modified**: `RespondentsTable.tsx`
- Lift sort state outside the filter `useMemo`; preserve `{column, direction}` across search input changes
- Update e2e TC-20 (already exists in schools-howitworks) — extend to assert sort survives a search → clear-search cycle

### 3.4 — Re-share affordance on dashboard (U7)

**Modified**: dashboard header
- Add a small "Kopírovať link na test" button next to the existing "Stiahnuť CSV" / "Odhlásiť" buttons
- Copies the respondent share URL to clipboard with toast confirmation
- Testid: `dashboard-copy-share-url`

### 3.5 — E2E contract — `e2e/specs/composer/dashboard.spec.ts` (NEW)

5 new TCs that don't fit cleanly into existing files:

- TC-40 — drill-down opens on row click, closes on ESC, focus returns
- TC-41 — funnel widget reflects N-started / M-completed / (N-M)-abandoned
- TC-42 — empty state renders the share URL inline with copy button
- TC-43 — sort by score persists across a search → clear-search cycle
- TC-44 — CSV download contains the 2-line GDPR header

### Deliverables — Phase 3
- 1 modified route (`test.builder.$id.tsx` head)
- 1 modified API (`results-data.ts` CSV branch)
- 1 modified component (`RespondentsTable` sort state + dashboard header)
- 1 new e2e spec (`dashboard.spec.ts` — 5 TCs)
- 1 updated Vitest spec (`results-data.test.ts`)

---

## Phase 4 — Deferred / out of scope

The following are deliberately NOT in E34, with rationale:

| Item | Why deferred |
|---|---|
| Email respondents from dashboard | D5 = (b); user already has Slack/email; building a broadcast surface is heavy and adds deliverability + abuse-vector concerns. Track as E36 if ever needed. |
| Soft-delete / undo respondent deletion | Audit-log already records deletion; if a B2B customer asks for recovery, restore from logs is acceptable. Not worth the complexity. |
| Real-time live updates (WebSocket) on dashboard | Polling every 30s would be simpler if needed; ship without it. |
| Per-question time-spent histogram aggregate | Useful but very nichely useful; ship drill-down first, then see if requested. |
| Mobile-first dashboard layout polish | Existing dashboard is responsive but desk-first. If B2B persona = desk + browser, this is fine. |
| Author profile / settings — "remember this test" without password | Out of scope; password-gate is the security model. |

---

## Locked decisions (will be filled in once owner confirms)

| Decision | Default | Owner choice |
|---|---|---|
| D1 — drill-down scope | (a) full per-question breakdown | _pending_ |
| D2 — funnel | (a) server-side `intake_started_at` | _pending_ |
| D3 — landing copy tone | (a) trust framing | _pending_ |
| D4 — post-score upsell | (a) `/tests` + (c) `/courses` inline | _pending_ |
| D5 — email respondents | (b) defer — surface copy-link CTA instead | _pending_ |
| D6 — CSV GDPR caveat | (a) header comment in CSV | _pending_ |
| D7 — OG meta | (b) personalized with `creator_label` | _pending_ |
| D8 — sort persistence | (a) persist across filter | _pending_ |
| D9 — schema columns | both `answers` + `intake_started_at` in one migration | _pending_ |
| D10 — shipping order | (b) 3 sequential PRs | _pending_ |
| D11 — migration timing | (a) bundled into Phase 1 PR; user applies SQL after merge | _pending_ |

---

## Verified during audit (no fixes needed)

- ✅ Author cookie `Path=/` (not `/test/builder/$id`) — verified in `functions/api/verify-author-password.ts:64`. A stale test-file comment suggested otherwise; the production code is correct.
- ✅ Private routes `noindex` — confirmed on `/test/builder/$id` and `/test/builder/$id/results`.
- ✅ Honeypot field on intake form — present, server-validated.
- ✅ Password gate rate-limit — 5 attempts / 15 min (TC-04).
- ✅ JWT signature + role check on `/api/results-data` — covered by TC-10 (role JWT rejection), TC-23 (set_mismatch), TC-14 (expired cookie).

---

## Next step

Project owner answers **D1–D11** (especially **D1**, **D2**, **D5**, **D10**). On confirmation I open the first PR (Phase 1 — drill-down + funnel + schema migration) on `feature/E34-phase-1-drilldown-funnel`, then move sequentially through Phase 2 → Phase 3. Phase 4 is deferred as documented.
