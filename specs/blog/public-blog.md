# Public blog — Playwright e2e test plan

**Area:** `specs/blog/`
**Component(s) under test:**
- `src/routes/blog/index.tsx` + `src/routes/blog/index.lazy.tsx` (`/blog` index)
- `src/routes/blog/$slug.tsx` + `src/routes/blog/$slug.lazy.tsx` (`/blog/<slug>` article)
- `src/components/blog/BlogPostCard.tsx`, `BlogScopeBar.tsx`, `CategoryFilter.tsx`, `BlogPostBody.tsx`
- `src/lib/blog/queries.ts` (`useBlogPostList`, `useBlogPost`)

**Routes:** `/blog`, `/blog/$slug`
**API endpoints (mocked):** `GET /rest/v1/blog_posts` (anon PostgREST select with
`status=eq.published` + `published_at=lte.<now>`; embedded
`blog_categories!inner` / `blog_authors!inner` objects ship on the seed rows)
**Data dependencies:** `blog_posts` seed rows from `e2e/seed/blog.ts`
(`seedBlogCategory`, `seedBlogAuthor`, `seedBlogPost`)
**Source stories:** E16.2–E16.4 (blog content engine); browser-level gap closed 2026-06-11
**Last updated:** 2026-06-11

---

## Context

The public blog ("akadémia") had ZERO browser specs — only the admin
editor (`e2e/specs/admin/blog.spec.ts`) was covered. These specs drive
the real routes in Chromium with Supabase fully mocked:

- **Index** (`/blog`): fetches the published list once, derives category
  chips client-side from the rows, and filters the cluster grid
  **client-side** (the chip writes `?cat=<slug>` to the URL via TanStack
  search params; no second network request is made).
- **Detail** (`/blog/$slug`): the route loader fetches by slug with
  `status=published AND published_at <= now()` and `maybeSingle()`.
  Unknown slug → loader returns `null` → `head()` emits
  `noindex, nofollow` and the lazy component renders its own Slovak
  not-found UI (no router-level 404).
- **Markdown body**: `BlogPostBody` renders via react-markdown WITHOUT
  `rehype-raw`, so raw HTML in `body_mdx` must never execute.

### Mock note (date-aware `lte`)

The shared PostgREST mock (`e2e/mocks/supabase/envelope.ts`) implements
`lte`/`gte` with `Number(...)` coercion — correct for numeric columns,
but ISO-8601 timestamps coerce to `NaN`, so `published_at=lte.<now>`
would filter out every row. These specs therefore layer a blog-specific
route override (`e2e/specs/blog/public-blog-setup.ts`) on top of
`mockSupabase` that compares timestamp filters lexicographically
(valid for ISO-8601). Remove it once the shared envelope handles
non-numeric `lte`/`gte`.

## Out of scope

- `/blog/kategoria/$slug` and `/blog/autor/$slug` archives (own routes;
  unit-covered via `specs/blog/blog-ux.md`)
- Pillar hero section + search box behaviour (unit-covered; seeded
  slugs here are deliberately non-pillar)
- JSON-LD payload contents (covered by `tests/seo/**` unit suite)
- GA4 events (covered by `tests/lib/analytics/blog-events.test.ts`)
- RLS enforcement (the mock replays what RLS would return; DB-level
  filtering is covered by the pgTAP/db suite)
- RSS/sitemap generation

---

## `e2e/specs/blog/index.spec.ts`

### TC-01: Published posts render as cards; draft + scheduled posts are hidden

**Prerequisites:**
- Seed: 1 published post (past `published_at`), 1 `status='draft'`
  post, 1 `status='published'` post with FUTURE `published_at`.

**When** the visitor opens `/blog`
**Then** the published post's card is visible with title, excerpt and
published date (`blog-post-card-title/-excerpt/-date-<slug>`)
**and** the draft post's card is NOT in the DOM
**and** the future-scheduled post's card is NOT in the DOM

### TC-02: Category chip filters the cluster grid client-side

**Prerequisites:**
- Seed: 2 published posts in category `phishing`, 1 in `eshopy`.

**When** the visitor clicks the `eshopy` chip
(`blog-category-filter-eshopy`)
**Then** the chip reports `aria-pressed="true"`
**and** the URL carries `?cat=eshopy`
**and** only the `eshopy` card remains in the grid (both `phishing`
cards are gone)
**When** the visitor clicks the "všetko" chip
**Then** all three cards are visible again

### TC-03: Empty state when zero published posts exist

**Prerequisites:**
- Seed: `blog_posts: []`.

**When** the visitor opens `/blog`
**Then** `blog-index-empty` is visible with the verbatim Slovak copy
"zatiaľ tu nič nie je. čoskoro pridáme prvé články."
**and** the scope bar (search + chips) is not rendered

---

## `e2e/specs/blog/post-detail.spec.ts`

### TC-04: Published article renders title, markdown body, date and canonical

**Prerequisites:**
- Seed: 1 published post whose `body_mdx` contains an intro paragraph
  and an `## Ako útok prebieha` H2 section.

**When** the visitor opens `/blog/<slug>` directly
**Then** the `<h1>` (`blog-post-title`) shows the seeded title
**and** the seeded paragraph text is visible inside `blog-post-body`
**and** the seeded H2 renders as a real heading element
**and** `blog-post-published-value` is a `<time>` whose `datetime`
equals the seeded ISO `published_at` and whose text shows the year
**and** `<link rel="canonical">` points at
`https://subenai.sk/blog/<slug>` (via the shared `DocumentHead` POM)

### TC-05: Unknown slug shows the SPA not-found UI + noindex robots meta

**Prerequisites:**
- Seed: blog table without the requested slug.

**When** the visitor opens `/blog/neexistujuci-clanok`
**Then** the not-found UI renders verbatim:
- title "tento článok neexistuje"
- description "možno bol presunutý alebo zmazaný. skús sa pozrieť na zoznam článkov."
- back link "späť na blog" with `href="/blog"`
**and** `<meta name="robots">` content is "noindex, nofollow"

### TC-06: Raw `<script>` in markdown body is neutralised, not executed

**Prerequisites:**
- Seed: published post whose `body_mdx` contains a literal
  `<script>alert(1)</script>` block between normal paragraphs.

**When** the visitor opens the article
**Then** no `script` element exists inside `blog-post-body`
**and** no `script` element anywhere in the document contains `alert(1)`
**and** no browser dialog fires during the page lifetime
**and** the surrounding markdown still renders normally
