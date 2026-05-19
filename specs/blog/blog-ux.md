# Blog UX — integration test plan

**Area:** `specs/blog/`
**Component(s) under test:**
- `src/routes/blog/index.lazy.tsx` (`/blog` index)
- `src/routes/blog/$slug.lazy.tsx` (`/blog/<slug>` article)
- `src/routes/blog/kategoria/$slug.lazy.tsx` (`/blog/kategoria/<slug>` archive)
- `src/routes/blog/autor/$slug.lazy.tsx` (`/blog/autor/<slug>` profile)
- `src/components/blog/*.tsx` (cards, filter, search, share, hero fallback, TOC, callouts, related)
- `src/lib/blog/queries.ts` (TanStack Query hooks)
- `src/i18n/locales/sk/blog.json` (all visible Slovak strings)

**Routes:**
- `/blog`
- `/blog/$slug`
- `/blog/kategoria/$slug`
- `/blog/autor/$slug`

**API endpoints (mocked):**
- `GET /rest/v1/blog_posts` (Supabase PostgREST — anon select with RLS filter `status='published' AND published_at <= now()`)
- `GET /rest/v1/blog_categories`
- `GET /rest/v1/blog_authors`

**Data dependencies:** 80 published `blog_posts` seeded via `scripts/seed-blog-posts.mjs`; 15 `blog_categories` and 1 `blog_authors` row seeded by migration `20260520000000_blog_schema.sql`.

**Source stories:** E16.1–E16.4 (DB schema, queries, routes, UX redesign — see `tasks/PLAN-2026-05-19-blog-content-engine.md`).

**Last updated:** 2026-05-19

---

## Context

The /blog section is subenai's primary content-marketing surface. It must:
- Surface 10 pillar guides + 70 cluster articles across 15 scam-awareness categories
- Convert engaged readers to the /tests funnel (the platform's main product)
- Rank in Google for SK scam-awareness queries (SSR JSON-LD, OG, canonical, sitemap)
- Work on mobile + desktop, offline-friendly skeleton, dark theme native

These integration tests treat the whole route component as one unit (route + lazy component + i18n + query hooks + visual components) with Supabase mocked. They run inside Vitest+RTL+jsdom (config: `vitest.config.ts`, setup: `tests/setup.ts`). They DO NOT exercise SSR / route loaders — that path is covered by a separate Playwright spec (out of scope here).

## Out of scope

- SSR `loader` + `head()` JSON-LD emission (Playwright)
- RLS enforcement (covered by `tests/db/blog_rls.test.ts`)
- MDX content correctness in each of the 80 articles (covered by `tests/content/blog-mdx.test.ts`)
- Admin /admin/blog CRUD UI (separate spec under `specs/admin/`)
- Sitemap / RSS generation scripts (covered by `tests/scripts/`)
- GA4 event emission (covered by `tests/lib/analytics/`)
- Search engine indexability beyond the meta tags emitted (DevTools / production audit)
- Cross-language translation (sk-only in v1 per locked decision #4)

## Conventions

- Every test mocks `@/integrations/supabase/client` so no network is hit
- Tests use real `tFor("blog.*")` resolver — Slovak strings are asserted verbatim
- Locator precedence per CLAUDE.md: `getByTestId` first; `getByRole` only when semantics are the assertion target
- Test-IDs follow the `<area>-<component>-<element>` convention already present in source

---

## Happy paths — /blog index

### TC-01: Page renders title, eyebrow, description, search

**Prerequisites**:
- Mock `useBlogPostList` to return 10 pillar posts + 5 cluster posts (mixed categories)

**When** the route component mounts
**Then** `blog-index-root` is in the document
**and** `blog-index-eyebrow` contains the verbatim text "subenai blog"
**and** `blog-index-title` shows the i18n key `blog.index.title` resolved value ("blog o internetových podvodoch")
**and** `blog-index-description` shows the resolved description text
**and** `blog-search-input` is rendered, focusable, and empty

### TC-02: Pillars section renders all pillar cards with 'sprievodca' badge

**Prerequisites**:
- Mock returns 3 posts whose slugs match `PILLAR_SLUGS`

**When** the list resolves
**Then** `blog-index-pillars-section` is visible
**and** `blog-index-pillars-heading` contains "základní sprievodcovia"
**and** for every pillar slug there is a `blog-pillar-card-<slug>`
**and** every pillar card has a `blog-post-card-pillar-badge-<slug>` reading "sprievodca"
**and** the pillar count subhead matches the visible count (e.g. "3 hĺbkových sprievodcov")

### TC-03: Cluster section renders all non-pillar cards

**Prerequisites**:
- Mock returns 5 cluster posts (slugs NOT in `PILLAR_SLUGS`)

**When** the list resolves
**Then** `blog-index-clusters-section` is visible
**and** `blog-index-list` contains exactly 5 `blog-post-card-<slug>` items
**and** none of the cluster cards has a pillar badge

### TC-04: Category filter chip narrows the cluster list

**Prerequisites**:
- Mock returns 6 cluster posts — 4 in category 'phishing-a-emaily', 2 in 'sms-a-telefon'

**When** user clicks the chip `blog-category-filter-phishing-a-emaily`
**Then** `blog-index-list` contains exactly 4 cards
**and** all are in category 'phishing-a-emaily'
**and** chip `blog-category-filter-phishing-a-emaily` has `aria-selected="true"`
**and** chip `blog-category-filter-all` has `aria-selected="false"`

### TC-05: Category filter 'all' chip restores the full list

**Prerequisites**: as TC-04

**When** user clicks chip 'phishing-a-emaily'
**and** then clicks chip 'všetko'
**Then** the cluster list shows all 6 cards
**and** chip 'všetko' has `aria-selected="true"`

### TC-06: Search input filters by title (case-insensitive, min 2 chars)

**Prerequisites**:
- Mock returns 3 cluster posts with titles "phishing 101", "scam sms 2026", "fake eshopy"

**When** user types "phish" into the search input
**Then** the cluster list shows exactly 1 card with title "phishing 101"

### TC-07: Search input filters by excerpt as well as title

**Prerequisites**:
- Mock returns 2 posts; one's excerpt contains the substring "balíkov"

**When** user types "balík" into the search
**Then** the matching post card is visible
**and** the other post card is NOT in the DOM

### TC-08: Search query persists when changing category chip

**Prerequisites**:
- Mock returns 4 posts spread across 2 categories

**When** user types a search query
**and** clicks a category chip
**Then** the search input value is preserved
**and** the visible cards match BOTH filters (intersection)

### TC-09: BlogIndex JSON-LD script is emitted when there are posts

**Prerequisites**: Mock returns ≥ 1 post

**When** the page renders
**Then** an element with `data-testid="blog-index-jsonld"` is in the DOM
**and** its `type` attribute equals `"application/ld+json"`
**and** the parsed JSON body has `@type: "Blog"` with a `blogPost` array

---

## Negative paths — /blog index

### TC-10: Loading state shows the i18n loading string

**Prerequisites**: Mock leaves `useBlogPostList()` in `isLoading` state

**Then** `blog-index-loading` is visible with text "načítavam články…"
**and** `blog-index-list` is NOT in the DOM

### TC-11: Error state shows the i18n error string with role=alert

**Prerequisites**: Mock returns `{isError: true}`

**Then** `blog-index-error` is visible
**and** it has `role="alert"`
**and** it contains text "články sa nepodarilo načítať. skús stránku obnoviť."

### TC-12: Empty state shows when no posts published

**Prerequisites**: Mock returns `[]`

**Then** `blog-index-empty` is visible
**and** contains text "zatiaľ tu nič nie je. čoskoro pridáme prvé články."

### TC-13: Category chip click on empty category shows the empty message

**Prerequisites**:
- Mock returns 3 cluster posts, all in 'phishing-a-emaily'

**When** user clicks chip for category 'ai-scamy'
**Then** `blog-index-clusters-empty` is visible
**and** contains "v tejto kategórii zatiaľ nie sú článk"

### TC-14: Search yielding no matches shows the empty message

**Prerequisites**: Mock returns 2 posts; neither title nor excerpt contains "qzqzqz"

**When** user types "qzqzqz" into the search
**Then** the empty message is visible

### TC-15: Search of 1 character is a no-op (matches everything)

**Prerequisites**: Mock returns 3 posts

**When** user types a single character "p"
**Then** all 3 posts remain visible (the filter requires ≥ 2 chars by design)

---

## Happy paths — /blog/$slug article page

### TC-16: Article renders breadcrumb, title, subtitle, meta

**Prerequisites**:
- `useBlogPost("phishing-kompletny-sprievodca")` returns a full pillar post fixture with subtitle + reading_minutes=12

**Then** `blog-post-root` is visible
**and** `blog-post-breadcrumb` contains links labelled "blog" and the category name + current title
**and** `blog-post-title` shows the fixture title
**and** `blog-post-subtitle` shows the subtitle
**and** `blog-post-meta` is visible
**and** it contains the author display name as a link to `/blog/autor/<author-slug>`
**and** it contains the date "publikované " + formatted SK date (NO leftover braces)
**and** it contains "12 min čítania" (NO leftover braces)
**and** the date value is inside a `<time>` element with `dateTime` set to the ISO `published_at`

### TC-17: Pillar article shows the 'sprievodca' badge in header

**Prerequisites**: Slug matches a `PILLAR_SLUGS` entry

**Then** `blog-post-pillar-badge` is visible
**and** contains "sprievodca"

### TC-18: Cluster article does NOT show the pillar badge

**Prerequisites**: Slug NOT in `PILLAR_SLUGS`

**Then** `blog-post-pillar-badge` is NOT in the DOM

### TC-19: Hero fallback renders when hero_image_url is null

**Prerequisites**: Fixture has `hero_image_url: null`

**Then** `blog-post-hero-fallback` is visible
**and** `blog-post-hero-image` is NOT in the DOM
**and** the fallback contains a centered category illustration matching the post category slug

### TC-20: Hero image renders when hero_image_url is set

**Prerequisites**: Fixture has `hero_image_url: "https://example.com/x.jpg"`

**Then** `blog-post-hero-image` is visible with `src` matching
**and** `blog-post-hero-fallback` is NOT in the DOM

### TC-21: Body callouts render for known bold-prefix patterns

**Prerequisites**: Fixture body contains `**plus:** rýchle nastavenie.` and `**mínus:** drahšie.`

**Then** two `blog-post-callout` elements are present
**and** the first contains "✓ plus" + "rýchle nastavenie"
**and** the second contains "✗ mínus" + "drahšie"

### TC-22: Table of contents renders for 3+ headings

**Prerequisites**: Body contains 3+ H2 sections

**Then** `blog-toc` is visible (note: hidden on small screens; assert via class, not visibility)
**and** for each H2 there is a `blog-toc-link-<slug>` whose `href` is `#<slug>`
**and** the corresponding H2 in `blog-post-body` has the matching `id`

### TC-23: Sources section renders when sources array non-empty

**Prerequisites**: Fixture has 2 valid source entries

**Then** `blog-post-sources` is visible
**and** contains 2 ordered list items
**and** each link has `rel="noopener noreferrer nofollow"` and opens in new tab

### TC-24: Share row renders and copy button writes to clipboard

**Prerequisites**: navigator.clipboard.writeText mocked

**When** user clicks `blog-share-copy`
**Then** clipboard.writeText is called with `https://subenai.sk/blog/<slug>`
**and** the button text changes to "skopírované ✓"
**and** after 2 seconds it reverts to "kopírovať odkaz"

### TC-25: ArticleCTABanner renders with link to /tests

**Then** `blog-article-cta` is visible
**and** `blog-article-cta-button` has `href="/tests"`
**and** the description contains the corrected punctuation "dozvieš sa, kde máš slabé miesto"

### TC-26: Related articles section surfaces same-category posts first, excluding self

**Prerequisites**:
- Current post in category 'sms-a-telefon'
- List query returns 5 posts: current + 2 same-category + 2 other-category

**Then** `blog-related-articles` is visible
**and** contains 3 items (RELATED_LIMIT = 3)
**and** the first 2 items are same-category
**and** the third item is from another category
**and** the current article slug is NOT in the related list

### TC-27: Reading progress bar mounts

**Then** `blog-reading-progress` is in the DOM
**and** its inner bar has `width: 0%` initially

---

## Negative paths — /blog/$slug article page

### TC-28: Slug not found renders the friendly 404

**Prerequisites**: `useBlogPost("nonexistent")` returns `null`

**Then** `blog-post-not-found-root` is visible
**and** title is "tento článok neexistuje"
**and** description is shown
**and** a back link to /blog labelled "späť na blog" is visible

### TC-29: Loading state shows i18n loading string

**Prerequisites**: query is `isLoading`

**Then** `blog-post-loading` is visible with text "načítavam článok…"

### TC-30: Error state shows i18n error string with role=alert

**Prerequisites**: query is `isError`

**Then** `blog-post-error` is visible
**and** its `<p>` has `role="alert"`
**and** text is "článok sa nepodarilo načítať. skús stránku obnoviť."

### TC-31: Post with reading_minutes=null hides the reading-time row

**Then** `blog-post-reading-time` is NOT in the DOM
**and** `blog-post-meta` still contains author + date

### TC-32: Post with no subtitle hides the subtitle line

**Then** `blog-post-subtitle` is NOT in the DOM

### TC-33: Post with empty sources array hides the sources section

**Then** `blog-post-sources` is NOT in the DOM

### TC-34: TOC returns null when fewer than 3 headings

**Then** `blog-toc` is NOT in the DOM

### TC-35: Clipboard rejection falls back to window.prompt

**Prerequisites**:
- `navigator.clipboard.writeText` mocked to reject with DOMException
- `window.prompt` mocked

**When** user clicks `blog-share-copy`
**Then** `window.prompt` is called with "skopíruj si odkaz:" and the URL

---

## Happy paths — /blog/kategoria/$slug

### TC-36: Category page renders breadcrumb + hero + badge + post grid

**Prerequisites**:
- `useBlogCategoryBySlug("sms-a-telefon")` returns the category fixture
- `useBlogPostsByCategoryId(cat.id)` returns 6 posts

**Then** `blog-category-root` is visible
**and** `blog-category-breadcrumb` contains "blog" link + current category name
**and** `blog-category-header` is visible
**and** `blog-category-hero-fallback` is rendered with the matching gradient
**and** `blog-category-badge` shows the category name and glyph
**and** `blog-category-title` matches `category.name`
**and** `blog-category-description` shows the i18n description if set
**and** `blog-category-post-count` shows "6 článkov všetky články" (pluralized)
**and** `blog-category-list` contains 6 `blog-category-post-card-<slug>` items

### TC-37: Post count uses singular form for exactly 1 article

**Prerequisites**: Category returns 1 post

**Then** `blog-category-post-count` contains the substring "1 článok"

### TC-38: Each post card uses BlogPostCard (with badges/fallback/meta)

**Then** every post card has the standard `blog-post-card-link-<slug>`, `blog-post-card-meta-<slug>`, `blog-post-card-category-<slug>` markers

---

## Negative paths — /blog/kategoria/$slug

### TC-39: Unknown category slug renders the 404 panel

**Prerequisites**: `useBlogCategoryBySlug("nonexistent")` returns `null`

**Then** `blog-category-not-found-root` is visible
**and** title is "takúto kategóriu nemáme"
**and** a back link to /blog is visible

### TC-40: Category loading state shows the i18n string

**Then** `blog-category-loading` is visible

### TC-41: Category error state shows the i18n string with role=alert

**Then** `blog-category-error` is visible
**and** the `<p>` has `role="alert"`

### TC-42: Category with no posts shows the empty state

**Prerequisites**: Category exists, posts query returns `[]`

**Then** `blog-category-empty` is visible
**and** the post-count line is NOT in the DOM (zero posts → no count)

---

## Happy paths — /blog/autor/$slug

### TC-43: Author page renders breadcrumb + initials fallback + meta

**Prerequisites**:
- `useBlogAuthorBySlug("subenai-editorial")` returns the editorial author fixture (no avatar_url)
- `useBlogPostsByAuthorId(author.id)` returns 5 posts

**Then** `blog-author-root` is visible
**and** `blog-author-breadcrumb` contains "blog" link + author display name
**and** `blog-author-avatar-fallback` is visible (no avatar URL)
**and** its content is "se" (first two display-name initials)
**and** `blog-author-eyebrow` shows "autor"
**and** `blog-author-title` shows the display name
**and** `blog-author-bio` shows the bio
**and** `blog-author-post-count` shows "5 publikovaných článkov"

### TC-44: Author with avatar_url renders the image, not the initials fallback

**Then** `blog-author-avatar` is visible with the URL
**and** `blog-author-avatar-fallback` is NOT in the DOM

### TC-45: Posts are listed using BlogPostCard

**Then** `blog-author-list` is visible
**and** contains 5 cards
**and** each is a `blog-author-post-card-<slug>` wrapping a `blog-post-card-link-<slug>`

---

## Negative paths — /blog/autor/$slug

### TC-46: Unknown author slug renders the 404 panel

**Then** `blog-author-not-found-root` is visible
**and** title is "takého autora nemáme"
**and** back link is visible

### TC-47: Author with zero published posts shows the empty state

**Then** `blog-author-empty` is visible
**and** post-count line is NOT in the DOM

### TC-48: Author loading + error states render the i18n strings

**Then** `blog-author-loading` (loading) or `blog-author-error` (error) is visible appropriately

---

## Cross-cutting integration checks

### TC-49: i18n single-brace placeholder interpolation works end-to-end

**Prerequisites**: Article with reading_minutes=8, published_at set

**Then** the rendered text contains "8 min čítania" (no curly braces visible)
**and** contains "publikované " + formatted date (no curly braces visible)

### TC-50: Slovak typographic quotes do not corrupt rendered text

**Prerequisites**: Article body contains `„text"` (Slovak open + close quotes)

**Then** the rendered HTML contains both `„` (U+201E) and `"` (U+201C) verbatim

### TC-51: Pillar slug presence drives the badge + ring across all surfaces

**Prerequisites**: Slug is "phishing-kompletny-sprievodca"

**Then** on the index, the card has the ring + 'sprievodca' badge
**and** on the article page, the header shows the pillar badge

### TC-52: Category visual identity is consistent across surfaces

**Prerequisites**: Category 'sms-a-telefon'

**Then** the badge accent color matches between /blog (filter chip) + /blog/$slug (header badge) + /blog/kategoria/$slug (hero gradient + badge)

### TC-53: All loading + error + empty + 404 paths have role=alert or sr-friendly markup

**For** every TC-{10,11,12,13,14,28,29,30,40,41,42,46,47,48} states

**Then** the visible message is announced to screen readers (role=alert or via heading hierarchy)

---

## Accessibility checks

### TC-54: Every interactive element has a discernible name

**For** every card, link, button on the 4 routes
**Then** axe-style check confirms accessible name (test-id role + text or aria-label)

### TC-55: Color contrast on category badges meets WCAG AA

**For** every category, the badge accent hex on the muted background
**Then** computed contrast ratio ≥ 4.5:1 for normal text or ≥ 3:1 for ≥18pt text

### TC-56: Breadcrumb is announced as a navigation landmark

**Then** `<nav aria-label="breadcrumb">` is the wrapping element
**and** the current page is the last `<li>` with `aria-current="page"` (RECOMMENDATION — currently missing, see UX audit)

### TC-57: Heading hierarchy on each route is correct (no skipped levels)

**For** /blog, /blog/$slug, /blog/kategoria/$slug, /blog/autor/$slug
**Then** there is exactly one `<h1>`
**and** H2 children come after the H1
**and** H3 are children of an H2 logically (no jump from H1 to H3)

---

## Performance / Web Vitals — observational

### TC-58: BlogHeroFallback renders without layout shift

**Then** the rendered fallback container has an explicit `aspect-` class (no CLS)

### TC-59: Images use loading="lazy" except above-the-fold hero

**Then** every `<img>` inside `blog-post-card-image-<slug>` has `loading="lazy"`

### TC-60: TanStack Query cache key for list shared across /blog and /blog/$slug

**Then** the same `["blog","list"]` key is used by both routes (verified via the queries.ts source — manual check, not testable in unit)

---

## Risks (from voice-guide.md + UX audit)

| Risk | Mitigation TC |
|---|---|
| Placeholder braces render literally (was bug, fixed) | TC-16, TC-49 |
| Search input over-filters on first keystroke | TC-15 |
| Pillar badge missing on cards | TC-02, TC-17 |
| Category filter doesn't persist across re-renders | TC-05 |
| Related articles include current article | TC-26 |
| Unknown slug crashes instead of friendly 404 | TC-28, TC-39, TC-46 |
| Clipboard rejection on Safari/webview crashes the button | TC-35 |
| TOC renders on articles too short to need one | TC-34 |
| Diacritics break i18n key lookups | TC-50 |
| Category visual identity drifts across pages | TC-52 |

---

## Implementation notes for the generator

- Use `vi.mock('@/integrations/supabase/client')` at the top of each spec
- Use the existing `tests/utils/createWrapper.tsx` for the QueryClientProvider + Router context (CREATE if not present)
- Fixtures live at `tests/integration/blog/fixtures.ts` (CREATE)
- Stub `IntersectionObserver` per `tests/setup.ts` if not already polyfilled (currently we guard inside the component — good enough)
- All Slovak assertions copy strings from `src/i18n/locales/sk/blog.json` exactly — no paraphrasing
