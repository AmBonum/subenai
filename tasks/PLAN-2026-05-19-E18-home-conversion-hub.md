# PLAN-2026-05-19 — E18 Home Conversion Hub + E17 Cross-Linking

**Status:** in progress
**Owner:** SubenAI editorial + dev
**Last updated:** 2026-05-19
**Predecessor epics:** E16 (Blog content engine), E17 (Backlinks — pending)

---

## Mission

Transform the homepage from a single-CTA test-launcher into a **conversion hub** that surfaces every public-facing surface of subenai.sk in a senior-level SEO / marketing / copy / dev manner. Simultaneously close the gap identified in the test ↔ course ↔ article positioning analysis (2026-05-19) by adding explicit cross-references between the three learning surfaces.

The user is the brand-new visitor landing on `/` from Google for queries like `phishing test`, `ako rozpoznať podvod`, `internetová bezpečnosť slovensko`. They must — within ~2 viewport scrolls — understand:

1. **What they can do here** (test, learn, train)
2. **Who it's for** (themselves, family, company, school)
3. **Why trust us** (free, no paywall, no ads, transparent)
4. **What's the next step** (one clear primary CTA + escalation paths)

## Audit — current home (pre-E18)

Already on `/`:
- Hero (Test CTA, big primary button)
- How-it-works (3 stats: questions / time / result)
- Features grid (3 cards: Testy / Školenia / O projekte)
- Mission/Support panel
- Sponsors thank-you row
- Slogan SVG banner
- **BlogHomeSection** (added E16.6 — 3 featured pillars + /blog CTA)
- **HomeFaqSection** (refactored E16.7 — collapsible by default + FAQPage JSON-LD + new "Vzdelávanie a Akadémia" section)

Surfaces NOT yet linked from home (gap list):
- `/schools` — buried behind mission text only, no dedicated card
- `/contact` — only in footer
- `/changelog` — only in footer
- `/test/zostav` — composer (lectures build their own test) — not visible
- `/sponsors/all` — separate from main /sponsors
- Audience-specific entry points: parents, seniors, students, B2B — no segmented "for X" surface

## Out of scope (deferred)

- Translation surfaces (en / cs) — sk-only home in v1 per locked decision
- A/B testing infrastructure for CTA variants — separate epic
- Cookie banner placement changes — current is fine
- AppShell (admin/app) — different chrome system; explicitly out

---

## E18.1 — Audience-segmented section

**Goal:** explicit "Pre koho je subenai" card row mapping each persona to its primary entry route. Senior-marketing pattern: speak to the persona's identity FIRST, then show the action.

**Implementation:**
- New `<AudienceSection />` component under `src/components/home/`
- 4 cards in grid, each: emoji + persona heading + 1-sentence pain + primary CTA
  | Persona       | Pain                                          | Primary CTA route |
  |---------------|-----------------------------------------------|-------------------|
  | Bežný človek  | "Pošlú mi SMS, neviem či kliknúť"             | /test             |
  | Rodič, senior | "Bojím sa o rodinu — ako ich ochrániť?"       | /blog/kategoria/rodicia-a-seniori |
  | Firma a HR    | "Náš tím nepozná phishing — potrebujeme test" | /tests + /schools |
  | Lektor, škola | "Učím internetovú bezpečnosť triedu"          | /schools |
- i18n strings under `marketing.json` `home.audience.*`

**SEO:** each card carries category-specific anchor + descriptive heading → indexable as "topic landing" content.

**Tests:**
- `tests/components/home/AudienceSection.test.tsx` — renders 4 cards, each has aria-labelled heading + Link with correct `to`

---

## E18.2 — Learning Path section ("Cesta učenia")

**Goal:** make the test ↔ school ↔ academy funnel **visual and explicit**. Solves the senior-strategy gap identified in the prior analysis.

**Implementation:**
- New `<LearningPathSection />` component
- 3-step horizontal flow card (mobile: stacked):
  1. **Diagnostika** — /test (3 min) — "zisti kde si slabý"
  2. **Tréning** — /courses (5–15 min) — "precvič si rozpoznávanie"
  3. **Hĺbka** — /blog (8–15 min) — "pochop psychológiu a kontext"
- Visual: connecting line/arrow between steps (CSS, not SVG — keeps zero asset cost)
- Bottom CTA: "Začni tu →" pointing at /test

**Senior-copy rationale:** uses the "diagnose → train → understand" flow that Khan Academy / Codecademy / Duolingo all use. Anchors the value of having three different surfaces (vs. confusing the visitor about which to start).

**Tests:**
- 3 steps in correct order
- All 3 step links point at the right route
- aria-labelledby semantic structure

---

## E18.3 — For schools / B2B prominence

**Goal:** /schools is currently invisible above the fold. Add a dedicated card surfacing the B2B use-case.

**Implementation:**
- New `<SchoolsHomeCard />` component (separate from features grid — it's a higher-stakes click)
- Renders below the Akadémia section, before Mission/Support
- Content: "Učíš o internetovej bezpečnosti? Použi subenai v triede." + CTA to /schools
- Visual differentiation: lime/green accent (distinguishes B2B from B2C primary blue)

**Tests:** render + correct destination link

---

## E18.4 — What's new / Changelog teaser

**Goal:** subtle but present link to /changelog so returning users see we update regularly. Builds trust + reduces "is this maintained?" bounce.

**Implementation:**
- Small bordered row above Footer: "🆕 Najnovšie zmeny: <release name> →" linking to /changelog
- Source data: hardcoded i18n string for the latest release name (manually updated per release — better than parsing /changelog at runtime for v1)

**Tests:** renders + correct destination

---

## E18.5 — Home page wiring + SEO refresh

**Goal:** weave E18.1–E18.4 into `routes/index.tsx` in the correct narrative order; refresh meta + JSON-LD where the new sections add Q&A or structured content.

**Order proposed (top → bottom):**
1. Hero (existing)
2. How-it-works stats (existing)
3. **NEW** AudienceSection (E18.1)
4. **NEW** LearningPathSection (E18.2)
5. Features grid (existing, 3 cards) — keep, complements E18.2
6. **NEW** SchoolsHomeCard (E18.3)
7. Mission/Support panel (existing)
8. Sponsors thank-you (existing)
9. Slogan banner (existing)
10. BlogHomeSection (existing E16.6)
11. HomeFaqSection (existing E16.7)
12. **NEW** Changelog teaser (E18.4)

**SEO:**
- Update meta description to reflect the new home reach: not just "test", but "test + školenia + akadémia"
- FAQPage JSON-LD already covers Q&A; no change needed
- Add `WebSite` JSON-LD with `potentialAction: SearchAction` pointing at `/blog?q=` (or `/blog` — currently no URL search) — defer to later if not implementable cleanly
- Consider adding `Organization` JSON-LD with `sameAs` social links (defer — depends on E17 backlinks rollout)

---

## E17 — Cross-link test ↔ course ↔ article (deferred to follow E18)

**Goal:** explicit semantic + data relationships between the three learning surfaces — addresses the strategic ambiguity from the 2026-05-19 user analysis.

### E17.1 — DB schema migration

Add `blog_posts.related_course_slug TEXT NULL` (FK-less for now — courses live in TS modules, not DB). Sitemap + RSS regenerate unchanged.

### E17.2 — Article → course cross-link UI

On every /blog/$slug article whose `related_course_slug` is set, render a `ContinueWithCourseCard` below the body (above the related-articles section): "Chceš si toto precvičiť? → Kurz [name] (X min)".

### E17.3 — Course → article cross-link UI

On every /courses/$slug whose pillar article exists in `PILLAR_SLUGS` registry: render "Chceš tomu rozumieť do hĺbky? → Sprievodca [name]" near the end of the course.

### E17.4 — Test result → recommendations

`/test/zostava/$id/vysledky` end card already shows "spustiť znova". Add:
- For each weak category in the result: 1 recommended course + 1 recommended pillar
- Logic: hardcoded category → (course_slug, pillar_slug) map for v1

### E17.5 — Topic content map audit

Spreadsheet exercise (not code): for every of 15 blog categories, identify: pillar slug, related course slug, top 3 cluster slugs. Output: `tasks/topic-content-map.md` for editorial reference. Fixes duplicates flagged in earlier analysis (e.g. "SMS phishing" article + course overlap).

---

## Risks

| Risk | Mitigation |
|---|---|
| New sections push hero CTA below the fold on mobile | Audience + Learning Path sections stay compact; CTA visible at ~110vh on smallest viewport |
| Too many CTAs dilute the primary "spustit test" intent | Test CTA stays in hero (single, large); E18.1–E18.4 CTAs are secondary chips/buttons |
| FAQPage JSON-LD adds Q&A that conflict with Schema.org rules | Plain-text answer flattening already in place (no markup) |
| Hero+stats stat count fetch slows LCP | Existing `useEffect` over Supabase RPC — unchanged |
| Tests for home break on every new section | Existing about.test.tsx + index tests are minimal; add per-component tests rather than a god-test for home |
| Adding /schools card increases marketing CTA count | Acceptable — /schools is the highest-LTV conversion |

## Done definition

- All E18 components have unit tests (≥ 4 cases each)
- Lint 0/0, build ✓, all existing tests still pass
- routes/index.tsx is < 600 lines (decompose if longer)
- Home page screenshot in dark mode verified at 360px / 768px / 1280px (manual)
- Cloudflare Pages preview confirms no LCP regression
- This PLAN file gets a closing `~~strikethrough~~` per completed story

## Story tracker

- [ ] E18.1 Audience-segmented section
- [ ] E18.2 Learning Path section
- [ ] E18.3 Schools home card
- [ ] E18.4 Changelog teaser
- [ ] E18.5 Wiring + SEO refresh
- [ ] E17.1 DB migration `related_course_slug`
- [ ] E17.2 Article → course UI
- [ ] E17.3 Course → article UI
- [x] E17.4 Test result recommendations ✅
- [ ] E17.5 Topic content map audit doc
