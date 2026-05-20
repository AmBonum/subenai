# E33 — Composer rebrand: `/test/zostav` → English path + UX collapse + e2e contract

**Owner:** Claude (synthesis) — senior agent, multi-lens audit
**Date opened:** 2026-05-20
**Status:** 🟡 PLAN DRAFTED — awaiting project-owner decisions D1–D9 before implementation phases start
**Surfaces in scope:**
- `/test/zostav` (composer build page) → rename + UX overhaul
- `/test/zostava/$id` + `/test/zostava/$id/vysledky` (shared / results) → rename for consistency
- All inbound links from blog MDX, marketing routes (`/schools`), composer settings copy, mega-menu
- E2E test contract for the composer flow end-to-end (build → share → respond → score → results)

---

## TL;DR

The composer is a high-value B2B surface (free custom-test builder, no signup) but currently leaks value on three axes:

1. **URL is Slovak-only** (`/test/zostav`, `/test/zostava/$id`) — breaks the otherwise English-URL convention (`/tests`, `/courses`, `/blog`, `/schools`) and creates friction for non-Slovak speakers + a confusing brand inconsistency for everyone.
2. **All 243 questions render inline** on first paint of `/test/zostav` (section 2 "Otázky"). Scrolling to section 3 "Nastavenia" takes ~5 scrolls; users get fatigued before they configure the test. The composer is functionally great but feels like a database UI, not a product.
3. **E2E coverage is thin** — 6 TC's covering build flow, but **zero coverage on the score-and-collect contract** (does an edu test actually save responses? do scores match local computation? does the results gate verify the password?). The composer is the only surface where mis-scored answers would silently corrupt B2B data.

The plan addresses all three in three phases, with **D1–D9 locked at senior judgment defaults** that the user can override.

---

## Discovery — current state

### Routing (TanStack file-based)

| File | Route | Purpose |
|---|---|---|
| `src/routes/test.zostav.tsx` | `/test/zostav` | Eager loader + head() — `validateSearch` for `?config=` |
| `src/routes/test.zostav.lazy.tsx` | `/test/zostav` | The actual ComposerPage (543 lines) |
| `src/routes/test.zostava.$id.tsx` | `/test/zostava/$id` | Eager loader — head() with `noindex` |
| `src/routes/test.zostava.$id.lazy.tsx` | `/test/zostava/$id` | ComposedTestPage (the responder view) |
| `src/routes/test.zostava.$id.index.tsx` | `/test/zostava/$id/` | Empty layout index |
| `src/routes/test.zostava.$id.index.lazy.tsx` | `/test/zostava/$id/` | (lazy companion) |
| `src/routes/test.zostava.$id.vysledky.tsx` | `/test/zostava/$id/vysledky` | Eager loader (results gate) |
| `src/routes/test.zostava.$id.vysledky.lazy.tsx` | `/test/zostava/$id/vysledky` | ResultsPage |

ROUTES registry (`src/config/routes.ts`):
```ts
zostav: "/test/zostav",
zostava: "/test/zostava/$id",
zostavaVysledky: "/test/zostava/$id/vysledky",
```

### `/test/zostav` page structure (543 LOC in lazy)

1. **Header** — h1 "Zostav vlastný test pre tím" + intro
2. **Stale notice** (only if `?config=` had drift) — dismissable
3. **Step 1** — `PackPreloadChips` (industry packs as templates)
4. **Step 2** — `QuestionPicker` rendering **all 243 questions** as a filterable list. Uses `content-visibility:auto` for native virtualization (zero-JS overhead). Search input + category chips + difficulty chips. ~88px per row → **~21,000px tall when unfiltered.**
5. **Step 3** — `ComposerSettings` (threshold, max, creator label) + `EduSettings` (collect responses + author password)
6. **Footer** — submit / Spustiť pre seba / Vyčistiť / Skopírovať draft URL

### Inbound link inventory

- `src/config/routes.ts:6-8` — registry source of truth
- `src/lib/quiz/composer/index.ts` — references `/test/zostav` in encode helper
- `src/routes/schools.tsx` — links to composer from B2B landing
- `src/content/blog/kybernetika-vo-vyucbe-prakticky-navod-pre-ucitelov.mdx` — pillar blog post
- 7 route files (zostav + zostava family)
- `src/i18n/locales/sk/quiz.json` line ~75 — `url_share_hint` mentions `/test/zostav`
- `tests/components/composer/EduSuccessDialog.test.tsx` — asserts URL shape
- `tests/components/schools/*.test.tsx` — 3 schools tests assert composer link
- `tests/lib/text/linkify-paths.test.tsx` — example used `/test/zostav`
- `tests/functions/test-sets.test.ts` — API contract test
- `tests/seo/sitemap-robots.test.ts` — checks `/test/zostav/` Disallow rule (just shipped in E32)
- `tests/routes/test-zostav.test.tsx` — route test
- `e2e/specs/quiz/composer.spec.ts` — 6 TCs
- `e2e/specs/quiz/shared-set.spec.ts` — likely uses `/test/zostava/$id`
- `public/sitemap.xml` includes `/test/zostav` as a static route (priority 0.7)
- `scripts/generate-sitemap.mjs:32` hardcodes `/test/zostav`

**Total inbound references**: ~20 files. Migration is non-trivial.

### Existing e2e coverage (`e2e/specs/quiz/composer.spec.ts`, 262 LOC)

| TC | What it tests |
|---|---|
| TC-01 | Page renders 3 sections, action buttons disabled before selection |
| TC-02 | URL copy button visible ≤ 10 questions, hidden > 10 |
| TC-03 | "Spustiť pre seba" replaces composer with inline TestFlow |
| TC-04 | URL copy button shows toast after click |
| TC-05 | Submit > 10 questions → POST /api/test-sets → navigate to `/test/zostava/$id` |
| TC-06 | Stale drift notice for renamed IDs in `?config=`, dismissable |

**Coverage gaps** (basis for Phase 3 of this plan):
- No "responder takes the test and gets scored" round-trip
- No "edu test with author password gates results page" verification
- No "responses are persisted with the right test_set_id" assertion
- No "URL share without DB" (the small-pack inline base64 path) end-to-end
- No "score computation matches the bank's correct answers"
- No "two responders, two distinct results" multi-user scenario
- No "delete-edu-respondent works" (GDPR DSR contract)

---

## Phase 0 — URL rename `/test/zostav` → `/test/builder`

**Size**: ~20 file edits + 4 i18n routes + sitemap + redirects + tests.
**Risk**: medium — touches generated `routeTree.gen.ts`, server-side redirects, inbound links from external content (any blog post referencing the path).
**Value**: high — closes the brand-inconsistency leak (only Slovak path in an otherwise English URL system).

### URL design — D1 (senior default: `/test/builder`)

| Option | Pros | Cons |
|---|---|---|
| **`/test/builder`** ✓ recommended | Concise, noun, English consistent | Slight overlap with /test/$slug pattern |
| `/test/composer` | Matches internal code name exactly (TestFlow `kind: "composer"`) | Less intuitive to non-devs |
| `/test/compose` | Verb, action-oriented | Same root as composer, can read as command |
| `/test/create` | Universally understood verb | "Create" implies signup, we don't have one |
| `/test/custom` | Marketing-friendly | Less clear it's a builder |

**Senior default: `/test/builder`** (D1). Concise, English, matches the conceptual model ("you're a test builder"), distinct from `/test/$slug` (which is "you're a test taker").

Sub-routes follow:
- `/test/builder/$id` (was `/test/zostava/$id`)
- `/test/builder/$id/results` (was `/test/zostava/$id/vysledky` — also rename `vysledky` to English)

### Implementation steps
1. Rename the 7 route files. TanStack file-based routing means the file path IS the URL.
2. Update `src/config/routes.ts` registry — keep old keys (`zostav`, `zostava`, `zostavaVysledky`) as **aliases** for one release cycle, then deprecate.
3. Update all internal callers (12 files identified above) to use new ROUTES constants.
4. Add **301 redirects** in `public/_redirects`:
   ```
   /test/zostav /test/builder 301
   /test/zostava/:id /test/builder/:id 301
   /test/zostava/:id/vysledky /test/builder/:id/results 301
   ```
   Cloudflare Pages honors `_redirects`. This preserves inbound link equity from existing blog posts, social shares, bookmarks.
5. Update `scripts/generate-sitemap.mjs` and `tests/seo/sitemap-robots.test.ts` (Disallow `/test/builder/` for the per-set landing, keep `/test/builder` itself crawlable).
6. Update `public/robots.txt` accordingly (Disallow `/test/builder/`).
7. Regenerate `src/routeTree.gen.ts` (TanStack vite plugin does this on build).
8. Update blog MDX content (`kybernetika-vo-vyucbe-prakticky-navod-pre-ucitelov.mdx`).
9. Update test fixtures that hardcode the path.

### i18n — D2 (senior default: keep Slovak strings, rename URL only)

The URL rename is **not** a brand-language rename. Page heading stays *"Zostav vlastný test pre tím"* (Slovak), only the URL is English. This matches the existing pattern (`/courses` URL but "Bezplatné školenia" heading).

### Deliverables — Phase 0
- 7 renamed route files (Bash `git mv` to preserve history)
- `src/config/routes.ts` updated + alias section
- 12 caller files updated to new ROUTES constants
- `public/_redirects` — 3 new 301 rules
- `public/robots.txt` — updated Disallow
- `scripts/generate-sitemap.mjs` — updated path
- `tests/seo/sitemap-robots.test.ts` — updated assertions
- All inline tests + fixtures updated
- CHANGELOG entry under [Unreleased]

---

## Phase 1 — UX collapse "all questions" surface

**Size**: ~3 file edits (1 new component, 1 modified route, 1 i18n key block).
**Risk**: low — additive, behind a collapsed-by-default toggle. Existing inline view stays available behind one click.
**Value**: very high — closes the "5-scrolls-to-settings" complaint.

### Four-lens audit on the composer build page

#### 🎨 UX
**Pain point (user-reported)**: section 2 (QuestionPicker) renders all 243 questions inline. Scrolling to section 3 (Settings) takes ~5 viewport heights. New users who want to *configure first, pick questions later* are forced into a backwards flow.

**Senior fix — D3 (recommended: collapsed-by-default with "Pick from bank" expander)**:

```
2. Otázky                                          [3 vybraných]
   ─────────────────────────────────────────
   📋 Vybraných: 3 / 25                          [Vyčistiť]
   [→ Vybrať otázky z banky (243 otázok)] ◀── primary CTA, expands
   ─────────────────────────────────────────
   Selected questions preview (3 chips):
   [phishing: SMS Pošta ×]  [url: ...×]  [scenario: ...×]
```

Behavior:
- Section 2 renders **collapsed by default** showing only: count, selected-chips, "Vybrať z banky" CTA.
- Click "Vybrať z banky" → opens **modal / sheet / inline expander** with the full QuestionPicker (filters + 243-item list).
- Selected count badge updates live.
- Pack preloads (Step 1) still populate the selected list; user sees the selection summary even with full picker collapsed.
- Result: section 3 (Settings) is **above the fold on a normal laptop screen** even before any interaction.

#### 📢 Marketing
**Current intro**: *"Vyber otázky podľa tvojej branže a hrozieb, nastav prah úspešnosti, zdieľaj jediným linkom. Žiadna registrácia, anonymné výsledky."* — solid but generic.

**Senior copy upgrade — D4** (paste-ready Slovak):
- New eyebrow: *"PRE TÍM · 5 MINÚT"* (frames urgency + audience)
- Keep h1: *"Zostav vlastný test pre tím"* ✓
- New intro: *"Vyber zo 243 otázok podľa toho, čo tvoj tím skutočne stretáva — phishing v e-shope, vishing v call-centre, fake faktúra v účtarni. Pošli link, dostaneš anonymné výsledky podľa hodnotenia ktoré si si určil/a. Žiadna registrácia, žiadny LMS."*

Surfaces concrete number (243), 4-lens example list, anti-LMS positioning.

#### ✍️ Copywriting on the form itself
- Step 2 heading: *"Otázky"* → *"2. Vyber otázky"* (verb-led action) ✓
- Selected-count zero-state copy: when 0 questions selected, replace generic "Vybraných: 0/25" with "Začni výberom z balíkov vyššie, alebo si vyber otázky ručne →". Reduces decision paralysis.
- Honeypot tooltip ("Pomer 'vyzerá podozrivo, ale OK' otázok") needs a one-sentence "why this matters" appendix.

#### 🔍 SEO
**Current `/test/zostav` head()**:
- title: "Zostav vlastný test pre tím — subenai"
- description: solid
- robots: `index, follow` ✓
- **Missing**: og:image, og:type, twitter:card, canonical, JSON-LD

**D5 (recommended)**: bring composer head() up to the standard set by E23 (share page) — full OG/Twitter card + canonical + JSON-LD `WebApplication` schema describing the tool. The composer is a **first-of-its-kind free B2B test builder in SK** — it should rank on queries like "tvorba testov bezpečnosti", "custom phishing test online".

#### 🖼️ UI redesign
**Today**:
- Step 2 has white-on-card section with no visual hierarchy distinguishing from Step 3
- All 3 steps look identical
- Submit CTA is at the very bottom, no sticky footer on mobile

**D6 (recommended)**:
- Step 2 collapsed-state gets a subtle dashed border + "+ pridať otázky" empty-state visual when zero selected
- Step 3 (Settings) gets a slight `bg-card/60` highlight (it's the "you're done, finalize" moment)
- **Sticky bottom action bar on mobile** showing: selected count + primary CTA. Already partially present in code (the action region at the bottom), make it `position: sticky bottom-0` on `< md` viewports.

### Deliverables — Phase 1
- New: `src/components/composer/build/QuestionPickerCollapsed.tsx` — the collapsed-state summary card with "Open picker" CTA
- Modified: `src/components/composer/build/QuestionPicker.tsx` — accept an `onClose?` prop for the modal/sheet shell
- Modified: `src/routes/test.builder.lazy.tsx` (post-rename) — orchestrates the collapsed/expanded state
- Modified: `src/i18n/locales/{sk,en,cs}/quiz.json` — 8 new keys under `composer.*`:
  - `step_2_zero_state_cta` → "Začni výberom z balíkov vyššie alebo si pridaj otázky →"
  - `step_2_open_picker` → "Vybrať z banky (243 otázok)"
  - `step_2_close_picker` → "Hotovo, zavri výber"
  - `step_2_picker_modal_title` → "Vyber otázky z banky"
  - `eyebrow` → "PRE TÍM · 5 MINÚT"
  - `intro_v2` → 60-word concrete intro (above)
  - `mobile_sticky_cta` → "Zdieľať s tímom"
  - `selected_chip_remove_aria` → "Odobrať {label}"
- Modified: `src/components/composer/build/ComposerSettings.tsx` — honeypot tooltip "why this matters" appendix
- Updated head(): full OG/Twitter + JSON-LD WebApplication
- Tests: +12 (collapsed render, expander toggle, count summary, modal a11y, sticky footer at mobile breakpoint, head shape)

---

## Phase 2 — E2E contract for the full composer pipeline

**Size**: ~6 new spec files in `e2e/specs/composer/` + 3 new POMs in `e2e/poms/composer/` + 2 new fixtures + 1 mock module.
**Risk**: low — pure test addition; no source changes.
**Value**: very high — composer is the only surface where bad scoring would silently corrupt B2B data. Existing 6 TCs miss the **score-and-collect contract**.

### What "100% e2e coverage" looks like for this surface

#### Build flow (existing — TC-01 → TC-06 in current spec)
- Page renders, sections present, CTAs gated
- URL copy → toast
- Inline self-run
- Submit > 10 questions → API call → navigation
- Stale drift notice handling

**Plan to add** — moved to new files under `e2e/specs/composer/`:
- `e2e/specs/composer/build.spec.ts` — Phase 1 collapsed-by-default UX
  - TC-07: section 2 collapsed by default, settings section above the fold at 1024×768
  - TC-08: clicking "open picker" reveals the 243-item list
  - TC-09: selecting chips in the picker → closing → count summary reflects
  - TC-10: pack preload + opening picker → picker shows pack questions as selected
  - TC-11: mobile (375×667) — sticky CTA bar shows selected count + Share button

#### Share-out flow (existing — partial coverage in TC-05)
- `e2e/specs/composer/share-db.spec.ts` — DB-share path for > 10 questions
  - TC-20: build → submit → API receives correct payload (questionIds, threshold, label, authorPassword)
  - TC-21: API rate-limit response (429) surfaces as typed error in UI
  - TC-22: API server-error (500) shows generic retry message
  - TC-23: edu mode toggle: when checked, API receives `authorPassword` + `collectsResponses: true`

#### Responder flow (NEW)
- `e2e/specs/composer/respond-and-score.spec.ts` — round-trip from build to result
  - TC-30: responder opens `/test/builder/$id`, sees intake form, fills name+email, starts test
  - TC-31: responder answers questions, each answer triggers correct/incorrect feedback per bank
  - TC-32: responder finishes test, sees score, score matches local compute
  - TC-33: responder's response is persisted with correct `test_set_id`, `final_score`, `answers` JSON shape
  - TC-34: two distinct responders → two distinct rows in DB, each with own share_id

#### Author / results-gate flow (NEW)
- `e2e/specs/composer/results-gate.spec.ts`
  - TC-40: author opens `/test/builder/$id/results` (renamed from `/vysledky`), sees password prompt
  - TC-41: wrong password → 401 + error toast
  - TC-42: correct password → results table with responder count, average score, per-responder breakdown
  - TC-43: GDPR DSR — author triggers "delete this respondent" → API call → row removed → table refreshes

#### URL share path (existing — partial in TC-02/TC-04)
- `e2e/specs/composer/share-url.spec.ts`
  - TC-50: ≤ 10 questions → URL copy button visible, copy → URL contains base64 config
  - TC-51: opening the copied URL in a new context → composer pre-fills selection
  - TC-52: URL with renamed bank IDs → stale drift notice shows count
  - TC-53: URL with < 5 surviving IDs → composer renders empty + notice

#### Edge cases (NEW)
- `e2e/specs/composer/edge-cases.spec.ts`
  - TC-60: max questions cap (25) — selecting 26th is blocked at picker level
  - TC-61: minimum threshold guard (5) — submitting < 5 questions blocked at form level
  - TC-62: edu mode with short password (< 8 chars) → form-level error
  - TC-63: refresh during compose → selection survives (currently doesn't — flag for D8)
  - TC-64: a11y — picker is keyboard-navigable (Tab through chips, Space to toggle)

#### Page Object Models needed
- `e2e/poms/composer/ComposerBuildPage.ts` — selectors for build page surface
- `e2e/poms/composer/ComposerRespondPage.ts` — responder view
- `e2e/poms/composer/ComposerResultsPage.ts` — author results gate + table
- `e2e/poms/composer/ShareToastPom.ts` — toast assertions

### Deliverables — Phase 2 ✅ (shipped 2026-05-20 via feature/E33-phase-2-e2e-contract)
Senior trim from the original plan (30→12 TCs, 6→3 spec files) after surveying
existing coverage — the original 30 included ~18 TCs already covered by
`e2e/specs/quiz/composer.spec.ts` and `e2e/specs/edu/schools-howitworks-contract.spec.ts`.
Phase 2 fills the gaps instead of duplicating:

- **`e2e/specs/composer/build-ux.spec.ts`** (5 TCs) — Phase 1 UX validation:
  TC-07 section 3 above fold at 1024×768; TC-08 collapsed-by-default picker;
  TC-09 eyebrow + intro_v2 verbatim Slovak; TC-10 pluralisation 1/3/5;
  TC-11 explainer callout + escape-hatch CTA to /tests.
- **`e2e/specs/composer/round-trip.spec.ts`** (5 TCs) — the critical data-
  integrity surface: TC-30 full UI round-trip (2 respondents drive intake +
  quiz UI → author dashboard reflects scores); TC-31 name/email faithfulness
  (no normalisation/escaping); TC-32 aggregate recompute after delete;
  TC-33 CSV row consistency with table (GDPR-adjacent); TC-34 10-respondent
  table scale.
- **`e2e/specs/composer/seo-jsonld.spec.ts`** (2 TCs) — TC-50 WebApplication
  block emitted at `/test/builder` (regression sentinel for someone
  removing the `<script>` from `head()`); TC-51 all fields required for
  Google's "Free Tool" rich badge (`isAccessibleForFree`, `offers.price=0`,
  provider=subenai).
- **`e2e/poms/quiz/ComposerPage.ts`** extended with Phase 1 UX getters
  (step2*, explainer*) + `expandStep2Picker()` / `expandExplainer()` helpers.
- New POMs deferred: existing `IntakeFormPage`, `ResultsGatePage`,
  `QuizFlowPage` cover the round-trip surface — no `e2e/poms/composer/`
  directory needed.
- Existing `e2e/specs/quiz/composer.spec.ts` **kept as-is** (covers the
  build-flow basics + URL-share + stale-notice — different concerns from
  the new 3 spec files, not duplicates).

**TCs deferred to a future PR** (not blocking Phase 2 close):
- Multi-tab author auth states (low-value — same user)
- Rate-limit-per-set isolation (partially covered by TC-04/TC-05 in edu spec)
- Sliding-window cookie TTL renewal (would need to fake-tick time)

---

## Phase 3 — Cross-cutting follow-ups

These don't fit Phases 0/1/2 cleanly but are uncovered during the audit:

### 3.1 — Dev-mode persistence of in-progress composer state
**Problem (TC-63 above)**: refreshing the page mid-compose loses the entire selection. Frustrating for users iterating.
**D7 (recommended)**: persist composer state (selectedIds, threshold, max, label) to `sessionStorage` under a single key; restore on mount with a "Pokračovať v poslednom drafte?" prompt. **NOT localStorage** — should die with the tab to avoid cross-session leakage.

### 3.2 — Add "Why a custom test?" inline explainer
**Problem**: First-time visitors don't know whether to use a predefined `/tests/$slug` or the composer.
**D8 (recommended)**: add a collapsible "Kedy si zostaviť vlastný test vs. použiť hotový?" callout under the h1. 3 bullets max. Surfaces the decision a visitor is silently making.

### 3.3 — JSON-LD WebApplication schema
Already mentioned in Phase 1 — emit on the composer index head():
```json
{
  "@type": "WebApplication",
  "name": "subenai test builder",
  "applicationCategory": "Tool",
  "applicationSubCategory": "Cybersecurity training",
  "operatingSystem": "Web",
  "isAccessibleForFree": true,
  "offers": { "@type": "Offer", "price": 0 }
}
```

---

## Decisions awaiting project owner (numbered)

| # | Decision | Senior default | Owner override? |
|---|---|---|---|
| **D1** | New URL slug for the build page | `/test/builder` (concise, noun, English) | Could pick `/test/composer` (matches internal naming exactly) — argues for consistency over discoverability |
| **D2** | i18n scope of the rename | URL only; SK heading + copy stays | Could go full English-page for international expansion — but no clear demand yet |
| **D3** | UX for the 243-question picker | Collapsed by default with expander button | Could use modal/dialog (more invasive but immersive) or sticky right-sidebar (desktop only) |
| **D4** | New intro copy | 60-word concrete + 4-lens example | Approve as-is, redline, or simplify to 30 words |
| **D5** | SEO scope on composer head() | Full OG + Twitter + JSON-LD WebApplication | Could defer JSON-LD if ItemList / FAQPage is preferred for the surface |
| **D6** | Sticky bottom action bar on mobile | Yes (< md viewport) | Optional polish; skip if mobile composer usage is low |
| **D7** | sessionStorage persistence of in-progress state | Yes, with "resume draft?" prompt on refresh | Could skip if it complicates testing — but very real UX win |
| **D8** | "When custom vs. hotový?" inline explainer | Yes, collapsible under h1 | Trivial to defer |
| **D9** | Shipping order | (a) Phase 0 alone (URL rename, foundational) → (b) Phase 1 (UX) → (c) Phase 2 (e2e). 3 PRs sequential | Could bundle 0+1 if URL rename is urgent; e2e in its own PR regardless |

---

## Phasing recap

| Phase | Scope | Files touched (est.) | New tests (est.) | DB / migration? | Ships independently? |
|---|---|---|---|---|---|
| **0** | URL rename `/test/zostav` → `/test/builder` | ~20 (7 routes + 12 callers + sitemap + redirects) | ~4 (route shape) | No | ✅ Yes (foundational; everything after assumes new path) |
| **1** | UX collapse + copy + SEO upgrade | ~6 (1 new comp + 3 modified + i18n × 3) | ~12 | No | ✅ Yes (depends on Phase 0 path) |
| **2** | E2E contract (~30 TCs) | ~12 (6 specs + 4 POMs + 2 fixtures) | ~30 e2e cases (already counted) | No | ✅ Yes (test-only) |
| **3** | Cross-cutting follow-ups (sessionStorage, explainer, schema) | ~3 | ~6 | No | Can fold into Phase 1 if scoping allows |

**Total**: 20–25 source files, ~52 new tests (12 unit + ~40 e2e), no DB migration, no schema change.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 301 redirects miss an inbound link path | Med | Med | Codebase grep + sitemap sweep before merge; add an integration test that fetches `/test/zostav` and asserts redirect → `/test/builder` |
| TanStack routeTree.gen.ts regeneration breaks on rename | Low | High | Run `npm run build` first, regenerate, commit the gen file with code in the same commit |
| E2E spec migration breaks existing CI label `e2e:browser` selection | Low | Low | Keep the file structure but rename `e2e/specs/quiz/composer.spec.ts` → split; CI selector pattern is `e2e/specs/**` glob, unaffected |
| Collapsed-by-default UX confuses returning users who muscle-memory'd the inline list | Low | Med | Keep selection state visible (count + chips). Animation on first paint hints expandability |
| Blog MDX `/test/zostav` references break for blog post readers (pillar article) | Med | Low | 301 redirect handles it; the displayed link text doesn't change |
| Renaming `vysledky` → `results` orphans bookmarks held by edu authors | Med | Med | 301 redirect preserves access; CHANGELOG entry alerts authors |

---

## Slovak Copy Appendix (paste-ready)

### New `composer.eyebrow`
> "PRE TÍM · 5 MINÚT"

### New `composer.intro_v2`
> "Vyber zo 243 otázok podľa toho, čo tvoj tím skutočne stretáva — phishing v e-shope, vishing v call-centre, fake faktúra v účtarni. Pošli link, dostaneš anonymné výsledky podľa hodnotenia ktoré si si určil/a. Žiadna registrácia, žiadny LMS."

### New `composer.step_2_zero_state_cta`
> "Začni výberom z balíkov vyššie alebo si pridaj otázky →"

### New `composer.step_2_open_picker`
> "Vybrať z banky (243 otázok)"

### New `composer.step_2_close_picker`
> "Hotovo, zavri výber"

### New `composer.step_2_picker_modal_title`
> "Vyber otázky z banky"

### New `composer.mobile_sticky_cta`
> "Zdieľať s tímom"

### Renames
- ROUTES key `zostav` → `builder`
- ROUTES key `zostava` → `builderSet`
- ROUTES key `zostavaVysledky` → `builderResults`

---

## Next step

Project owner answers **D1–D9** (especially **D1**, **D3**, **D9**). On confirmation I open the first PR (Phase 0 — URL rename) on `feature/E33-phase-0-url-rename`, then move sequentially through Phase 1 → Phase 2. Phase 3 folds into Phase 1 if D7/D8 approved together.

No code ships before D-answers. The plan is the contract.
