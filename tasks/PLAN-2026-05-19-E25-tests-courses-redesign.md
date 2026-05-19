# E25 — /tests + /courses senior redesign + mega-menu image gap

**Owner:** Claude (synthesis) — senior agent, multi-lens audit
**Date opened:** 2026-05-19
**Status:** 🟡 PLAN DRAFTED — awaiting project-owner decisions D1–D8 before implementation phases start
**Surfaces in scope:** `/tests` · `/courses` · the mega-menu `featured` tile (Sady testov + Školenia dropdowns)

---

## TL;DR

Three public-facing surfaces sit at the funnel's discovery layer (header dropdown → catalog page → conversion) and are all underdressed:

1. **Mega-menu `featured` tile** renders as an empty dark card with text only. No image, no gradient, no visual differentiation between "Sady testov" and "Školenia" — kills click-through and undermines the perceived production value of the rest of the design system.
2. **`/tests` (Sady testov catalog)** is a centered h1 + intro + emoji-card grid. Zero hero visual, zero social proof, zero cross-link into the blog corpus that explains WHY these test packs matter. Page reads as a list, not a conversion surface.
3. **`/courses` (Školenia catalog)** has the same gaps and additionally has an **orphaned cross-link component** (`RelatedAcademyArticleCard`) that already exists in `src/components/courses/` but is not rendered anywhere on the index. The work to connect courses to blog corpus is already half-built and abandoned.

The cross-cutting fix: borrow the `/blog` `BlogPostCard` visual treatment (hero image with `BlogHeroFallback` gradient, category badge, title, excerpt, reading time) and apply it to test-pack + course cards, then connect both catalogs back into the blog corpus via existing `related_course_slug` field (plus a new sibling field for tests).

**Decisions awaiting project owner: D1–D8 (below). Nothing ships until those are answered.**

---

## Discovery — current state of each surface

### `/tests` (`src/routes/tests.index.tsx`)

- **Renders**: centered h1 "Otestuj svoju branžu" + intro paragraph + industry-filter pill row + 3-col `TestPackCard` grid + 2 bottom CTAs (`/test` and `/courses`).
- **Data**: `listPublishedPacks()` from `src/content/test-packs.ts` — **static TS module**, no Supabase query, no DB at runtime.
- **Hero**: pure text, no image, no gradient.
- **Cross-links to blog**: zero.
- **`TestPack` type**: no `hero_image_url` field, no `og_image_url` field, no `related_blog_slug` field. Card is `emoji + title + description`.
- **head()**: present with OG + Twitter (good — not in scope of this redesign).
- **Testids**: `tests-catalog-heading`, `tests-catalog-intro`, `tests-catalog-grid`, `tests-catalog-card-{slug}`.

### `/courses` (`src/routes/courses.index.tsx`)

- **Renders**: centered h1 "Bezplatné školenia" + intro + search bar + category-filter pills + 3-col `CourseCard` grid + bottom CTA (`/test`).
- **Data**: `COURSES` from `src/content/courses/index.ts` — **static TS module**, no DB.
- **Hero**: pure text, no image, no gradient.
- **Cross-links to blog**: zero on the index. **Orphan finding**: `src/components/courses/RelatedAcademyArticleCard.tsx` exists and DOES query `useBlogPostByRelatedCourse` (course → blog post), but is not imported by the index route. Either a v0 draft that was forgotten, or scoped for the course detail page only — needs verification before redesign (see D6 below).
- **`Course` type**: same emoji-card shape as `/tests`. No image field.
- **head()**: present (good — not in scope).

### `/blog` hero pattern (`src/routes/blog/index.lazy.tsx`)

- **Hero on the index itself**: also text-only (eyebrow chip + h1 + description + search input). **No image either.** Interesting — the user said "tu nam chyba nejaky obrazok v style ako maju hero sekcie v /blogs". The hero they're referring to is **not** the index hero — it's the per-post `BlogPostCard` image treatment that makes the GRID visually rich. The grid cards are the visual element worth borrowing.
- **`BlogPostCard`** (under `src/components/blog/`): renders `hero_image_url` as `<img>` (aspect-video for normal, aspect-2/1 for featured) with `BlogHeroFallback` gradient when null. Category badge + title + excerpt + reading time + locale-formatted date.
- **Reusable for /tests + /courses**: YES with one prerequisite — we need a way to source the hero image. Options in D1 below.

### Mega-menu `featured` tile (`src/components/layout/mega-menu/MegaMenuPanel.tsx:47–59`)

- **Current JSX**: a `w-48 rounded-lg border border-border/40 bg-card/40 p-4` card containing only a `NavigationMenuLink`-wrapped `<Link>` with `panel.featured.labelKey` text.
- **Confirmed gap**: no image slot, no styled background, no gradient, no visual differentiation. Both panels (Sady testov + Školenia) reuse the same JSX — when the "Pre školy a HR" tile renders next to a rich link list it looks like a missing asset.
- **Featured tile copy** (current):
  - Sady testov: "Nové otázky tento mesiac →"
  - Školenia: "Pre školy a HR"
- **Routing**: `panel.featured.href` exists in `mega-menu.types.ts` — the tile is clickable, just visually flat.

### Blog corpus schema (`src/lib/blog/queries.ts` + `supabase/migrations/*blog*.sql`)

- Fields available per blog post that matter for cross-linking from /tests + /courses:
  - `hero_image_url` (nullable text) — visual asset
  - `related_course_slug` (nullable text) — **already wired** for blog → course
  - `category.slug` + `category.name` — taxonomy
  - `title`, `excerpt`, `reading_minutes`, `published_at`, `primary_keyword`
- **Missing for /tests cross-linking**: `related_test_slug` (or a many-to-many table) — see D4.

---

## Phase 0 — Mega-menu image gap (quick win, ship first)

**Size**: ~1 file edit + 2–4 SVG assets + 1 i18n key + 1 testid.
**Risk**: very low — additive, opt-in via `panel.featured.image` field.
**Value**: high — every header hover sees this. First impression of the design system.

### Scope

1. **Extend `MegaMenuPanel` type** (`src/components/layout/mega-menu/mega-menu.types.ts`) — add optional `image?: { src: string; alt?: string }` to the `featured` shape. Optional so panels without an asset render unchanged.
2. **Render the image** in `MegaMenuPanel.tsx:47–59`: if `panel.featured.image` is present, render `<img>` filling the top portion of the card (aspect ~3/2), with the label rendering over a gradient overlay at the bottom. Pattern matches what `BlogPostCard` does with featured posts.
3. **Author 2 SVG/PNG assets** under `public/mega-menu/`:
   - `sady-testov.svg` — abstract grid pattern hinting at "test packs by industry" (could reuse industry emoji set as iconography)
   - `skolenia.svg` — abstract education iconography (book + cursor + checkmark)
4. **Slovak strings** stay in `src/i18n/locales/sk/marketing.json` under `header.menu.<slug>.<key>` — no new keys needed for the image alt; reuse `featured.labelKey`.
5. **Test**: extend `tests/components/layout/MegaMenuPanel.test.tsx` (if exists) or create — assert `featured-image` testid renders when image provided, omitted when not.

### UX rationale
- Image in mega-menu reduces decision-time (vision processes images ~60k× faster than text — well-documented). Critical when the dropdown has 5+ links + a featured tile competing for attention in <500ms hover window.

---

## Phase 1 — `/tests` redesign

### Five-lens audit

#### 🔍 SEO
**Current**: head() present (good). But the page body has thin content — h1 + ~30-word intro + pack cards (emoji + ~15-word descriptions). Total above-the-fold text < 200 words. **Industry pages don't exist** (no `/tests/eshop`, `/tests/banky`, etc. — there's only the catalog index and `/tests/$slug` detail).
**Gap**: missing keyword surface area for high-volume queries like "test phishing pre firmy", "ako rozpoznať podvod e-shop", "kyberbezpečnostný test pre školy". Catalog page should rank for category-level queries but has no semantic depth.
**Action**:
- Add a "Prečo robiť test podľa odvetvia?" intro section (3 short paragraphs, ~250 words) above the filter row. Explains what makes a test relevant to industry X.
- Add JSON-LD `ItemList` schema listing all published packs (each pack as a `ListItem` with name, description, URL).
- Add FAQ section at page bottom (3–5 Q&As, JSON-LD `FAQPage` schema). Pulls from common queries like "Je test zadarmo?", "Koľko času zaberie?", "Pre koho je vhodný?"

#### 📢 Marketing
**Current**: no social proof, no number anchor ("Zatiaľ otestovaných X ľudí"), no urgency, no comparative framing ("Tvoji kolegovia už dopadli X %").
**Action**:
- Above the catalog grid: a "Prečo subenai?" 3-tile strip: anonymous · 5 minút · zadarmo. Each tile with icon (already have Lucide).
- Below the catalog grid: a "Sociálny dôkaz" strip — testimonial card (if real ones exist) OR aggregated stat ("Doteraz X dokončených testov · priemerné skóre Y%"). If we don't have real data yet, use a "verified" stamp (anonymous data, GDPR-clean) without the number.
- Conversion: keep the bottom CTAs but make the primary one ("Spustiť rýchly test") visually heavier than the secondary ("Pre kurzy").

#### ✍️ Copywriting
**Current**: h1 "Otestuj svoju branžu" — fine but generic. Intro is descriptive, not benefit-led.
**Slovak copy proposals** (paste-ready, in Slovak per language rule):
- **New h1** (option A, verbose): "Otestuj sa za 5 minút. Anonymne. V tvojej brandži."
- **New h1** (option B, terse): "Otestuj svoju branžu. Bez registrácie."
- **New intro** (60 words, benefit-led):
  > "Phishing v e-shope vyzerá inak ako vishing v call-centre, fake faktúra v účtarni inak ako podozrivé SMS od kuriéra. Vyber si sadu otázok, ktoré skutočne stretávaš v práci — a zisti, kde máš slepé miesta. 5 minút, žiadna registrácia, výsledok hneď."
- **Industry-filter chip kicker**: "Filter podľa odvetvia:" → "Pre koho je test:" (sounds less like a database UI, more like guidance)

#### 🎨 UX
**Current**: filter pills + grid + bottom CTAs is a solid baseline. Pain points:
- No "what now?" after a pack is selected at the catalog level — user has to click into detail to see questions.
- No sort (newest / most popular / hardest).
- The bottom CTAs are too far below the fold for users who just want "any test, now".
**Action**:
- Add a "preview" expansion on `TestPackCard` hover/focus: shows the first 2 question topics ("Phishing e-maily · Fake e-shopy · ...") so the user knows what's in it without clicking.
- Add a sticky floating "Spustiť rýchly test" button on mobile (the user might be 4 scrolls down into the catalog when they decide "actually I'll just take any test").
- Sort dropdown (default "Najnovšie") — even if all packs are launched same day, the affordance signals freshness.

#### 🖼️ UI redesign
**Current**: emoji + text card on `bg-card`. Visually flat.
**Action**:
- Adopt the `BlogPostCard` two-zone pattern: top half = visual (industry emoji at 6xl over a category-gradient background using `BlogHeroFallback`-equivalent palette mapped from `industry` field), bottom half = title + excerpt + meta (question count + difficulty).
- Add a "featured" pack treatment for the top 1–2 packs — wider card spanning 2 columns, larger visual, more excerpt copy.
- Industry filter row → switch from pills to a horizontal scrollable rail with icon + label per industry. Matches the mega-menu aesthetic.

### Phase 1 deliverables
- `src/routes/tests.index.tsx` — restructured layout (hero strip, why-strip, sort, grid, FAQ, CTA).
- New: `src/components/tests/TestPackHeroFallback.tsx` (parallels `BlogHeroFallback`).
- New: `src/components/tests/TestsFaqSection.tsx` (with JSON-LD).
- New: `src/components/tests/TestsValueStrip.tsx` (3 trust tiles).
- Modify: `src/content/test-packs.ts` add optional `hero_image_url` field on the `TestPack` type so packs CAN provide a real image, fallback to the new HeroFallback when null.
- i18n: add `tests.faq.q1` … `tests.faq.q5` keys in sk/en/cs.
- Tests: head + ItemList JSON-LD, FAQ JSON-LD, card hero fallback, sort dropdown.

---

## Phase 2 — `/courses` redesign

Largely parallel to Phase 1. Differences specific to this surface:

### Five-lens audit (deltas only — most lenses mirror Phase 1)

#### 🔍 SEO
**Specific gap**: `/courses` doesn't currently emit `Course` JSON-LD schema (the educational schema.org type). For an "Akadémia"-style site, this is high-impact — Google can render rich "Course" snippets.
**Action**: add `Course` schema per published course on the index (as `ItemList` of `Course` items), with `provider` = "subenai", `educationalCredentialAwarded` left null.

#### 📢 Marketing
**Specific opportunity**: `RelatedAcademyArticleCard` already exists as a course → blog cross-link, but it's not rendered. If we render it as a "Súvisiace články" section on each course card OR as a separate "Z blogu" strip on the index, we get free funnel depth — viewer sees a course + the 1–2 blog posts that prepare them for it, double-anchoring the topic in their memory.

#### ✍️ Copywriting — Slovak copy proposals
- **New h1**: "Bezplatné školenia v 5 témach — phishing, vishing, smishing, fake e-shopy, investičné podvody."
- **New intro** (50 words):
  > "Každé školenie je 10-minútová stránka s reálnymi príkladmi z slovenského internetu — žiadne PDF na 60 strán. Pre seba, pre kolegov, pre rodičov. Po každej téme ti odporučíme aj článok z blogu, ak chceš ísť hlbšie."

#### 🎨 UX
- **Search bar**: keep, but add a "Beginner-friendly" / "Pre pokročilých" difficulty toggle. The current category filter is topical (phishing vs. vishing), not pedagogical.
- **Progress signal**: if the user is logged in (app shell), surface "Dokončené 2 z 8 školení" above the grid. (Out of scope for this epic if it requires schema work — flag as D5.)

#### 🖼️ UI redesign
- Same card revamp as Phase 1: emoji → gradient + emoji hero zone + title + excerpt + meta (reading minutes + difficulty).
- Add the orphan `RelatedAcademyArticleCard` as a per-card slot: each `CourseCard` shows "Čítaj k tomu:" + 1 related blog post link (if `useBlogPostByRelatedCourse(slug)` returns one). Sub-1KB extra payload, massive conversion lift potential.

### Phase 2 deliverables
- `src/routes/courses.index.tsx` — restructured.
- Reuse `BlogHeroFallback` palette (or copy to `CourseHeroFallback`).
- Wire `RelatedAcademyArticleCard` per course card (gated on `enabled`).
- i18n: `courses.faq.*`, `courses.value.*` keys.
- JSON-LD `Course` schema per published course.
- Tests: head + Course JSON-LD, related-article rendering, gated empty state.

---

## Phase 3 — Blog cross-linking (the connective tissue)

The biggest senior-level idea: **make the three catalogs feed each other**. Today they're islands. Plan:

| From | To | Mechanism |
|---|---|---|
| `/blog/$slug` | `/courses/$slug` | Already exists via `ContinueWithCourseCard` (`related_course_slug`) ✓ |
| `/courses/$slug` | `/blog/$slug` | Component exists (`RelatedAcademyArticleCard`), needs wiring on /courses index (Phase 2) |
| `/blog/$slug` | `/tests/$slug` | **Missing** — add `related_test_slug` to `blog_posts`, render "Otestuj sa k tomuto" card in blog post body |
| `/tests/$slug` | `/blog/$slug` | **Missing** — pull "Súvisiace články" strip on the test pack detail page via reverse query on `related_test_slug` |
| `/tests/` (index) | `/blog/$slug` | **Missing** — "Učenie pred testom" strip showing 3–5 highest-traffic blog posts |
| `/courses/` (index) | `/blog/$slug` | **Missing** — "Čítaj k tomu" per course card (Phase 2) |

### Phase 3 deliverables
- **Migration**: `supabase/migrations/20260520000000_blog_related_test_slug.sql` adding `related_test_slug text references (nothing — test packs are static)` plus `DEPLOY_SETUP.sql` parity.
- New `useBlogPostsByRelatedTest(slug)` query in `src/lib/blog/queries.ts`.
- New `RelatedTestPackArticleCard` component (parallels `RelatedAcademyArticleCard`).
- Wire on `tests.index.tsx` ("Učenie pred testom" strip — picks top 4 highest-traffic posts via a future analytics signal; for now hand-pick via a `featured_for_tests` boolean column or just `published_at DESC LIMIT 4`).
- Tests for both new components + migration.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Image assets not produced in time | Med | Med | Phase 0 ships with placeholder SVG (we can author them inline as `<svg>` paths — no PNG required). |
| `TestPack` type change cascades into all detail pages | Low | Low | New field is optional. No required-field migration. |
| New migration delays Phase 3 (user has to run SQL manually per CLAUDE.md) | High | Low | Phase 3 isolated to its own branch; Phases 0–2 ship independently. |
| Adding a "featured" pack treatment forces editorial choice (which pack is featured?) | Med | Low | Default to "newest published" until editorial weight is added. |
| `RelatedAcademyArticleCard` rendering on every course card multiplies queries | Med | Med | Use a single batched query in the parent (one `useBlogPostsByRelatedCourse(allSlugs)` instead of N per-card). |
| Bumping `CONSENT_VERSION` accidentally | Low | High | None of these changes touch consent / analytics / data surface. Confirmed. |

---

## Decisions awaiting project owner (numbered)

| # | Decision | Options | Recommended |
|---|---|---|---|
| **D1** | Mega-menu image source | (a) hand-drawn SVGs in `public/mega-menu/`; (b) Lucide icons composed over a gradient; (c) photographic stock | **(b)** — Lucide icons match existing design system, no asset-pipeline overhead, no licensing. |
| **D2** | Industry hero treatment for `TestPackCard` | (a) industry emoji at 6xl over palette gradient; (b) per-industry SVG icon; (c) real photography | **(a)** — emoji corpus already exists per pack, gradient palette can be derived from industry. Zero new assets. |
| **D3** | `/tests` FAQ content | I can draft 5 Slovak Q&As inline | Approve list-of-questions first; I draft the answers; you redline. |
| **D4** | Add `related_test_slug` to `blog_posts` for Phase 3 cross-linking | (a) yes, new migration; (b) defer — use a join table; (c) skip — only courses get cross-links | **(a)** — symmetric with `related_course_slug`, simplest schema, fastest ship. |
| **D5** | "Dokončené X z Y školení" progress on `/courses` index | (a) ship now (requires logged-in user query); (b) defer to a later epic | **(b)** — out of scope; needs profile schema work. Park for a future "user progress" epic. |
| **D6** | Orphan `RelatedAcademyArticleCard` scope | (a) wire on `/courses` index per card; (b) wire on `/courses/$slug` detail only; (c) wire on both | **(c)** — both. Same component, same query, more conversion surface. |
| **D7** | Featured pack on `/tests` (1–2 packs get the spotlight card) | (a) editorial flag in `test-packs.ts`; (b) algorithmic ("newest"); (c) skip — uniform grid | **(b)** for v1, **(a)** as a follow-up. Algorithmic ships now, editorial flag added when we have data to choose. |
| **D8** | Shipping order | (a) Phase 0 alone first (quick win); (b) Phase 0 + 1 together; (c) all three phases as one PR; (d) one PR per phase | **(d)** — one PR per phase. Phase 0 lands tomorrow, Phases 1+2 land independently, Phase 3 waits for SQL apply. |

---

## Phasing recap

| Phase | Scope | Files touched (est.) | New tests (est.) | DB migration? | Ships independently? |
|---|---|---|---|---|---|
| **0** | Mega-menu featured tile image | 2 (MegaMenuPanel + type) | 1–2 | No | ✅ Yes |
| **1** | `/tests` redesign | 6–8 | 6–10 | No | ✅ Yes |
| **2** | `/courses` redesign | 6–8 | 6–10 | No | ✅ Yes |
| **3** | Blog cross-linking | 5 + 1 SQL | 4–6 | Yes (1) | ❌ Needs user SQL apply |

**Total estimated**: 20–25 files, 17–28 new tests, 1 migration. Coverage threshold currently `lines: 57, functions: 49` — new code raises both; floor pin in `vitest.config.ts` stays unchanged.

---

## Slovak Copy Appendix (paste-ready)

### `/tests`
- **h1 (option B picked)**: "Otestuj svoju branžu. Bez registrácie."
- **intro**:
  > "Phishing v e-shope vyzerá inak ako vishing v call-centre, fake faktúra v účtarni inak ako podozrivé SMS od kuriéra. Vyber si sadu otázok, ktoré skutočne stretávaš v práci — a zisti, kde máš slepé miesta. 5 minút, žiadna registrácia, výsledok hneď."
- **value strip**: "Anonymne · 5 minút · Zadarmo"
- **filter kicker**: "Pre koho je test:"
- **sort label**: "Zoradiť:" with options "Najnovšie", "Najťažšie", "Najobľúbenejšie" (last only when we have analytics)
- **FAQ headings** (draft — answers pending D3):
  1. "Je test zadarmo?"
  2. "Koľko času zaberie?"
  3. "Pre koho je test vhodný?"
  4. "Aké údaje zbierate?"
  5. "Môžem test poslať kolegom?"

### `/courses`
- **h1**: "Bezplatné školenia v 5 témach — phishing, vishing, smishing, fake e-shopy, investičné podvody."
- **intro**:
  > "Každé školenie je 10-minútová stránka s reálnymi príkladmi zo slovenského internetu — žiadne PDF na 60 strán. Pre seba, pre kolegov, pre rodičov. Po každej téme ti odporučíme aj článok z blogu, ak chceš ísť hlbšie."
- **value strip**: "10 minút · Reálne príklady · Bezplatné"
- **related-article slot label**: "Čítaj k tomu:"

### Mega-menu featured tile
- **Sady testov** featured label stays: "Nové otázky tento mesiac →"
- **Školenia** featured label stays: "Pre školy a HR"
- (Both unchanged — only the image renders new.)

---

## Next step

Project owner answers **D1–D8** (especially D8 — shipping order). On confirmation I'll create the first PR (Phase 0 mega-menu fix per D8 recommendation), then move sequentially through Phases 1 → 2 → 3.

No code ships before D-answers. The plan is the contract.
