# E37 DB-backed catalog, detail, and composer — test plan

**Area:** `specs/test-packs/`
**Component(s) under test:**
- `src/routes/tests.index.tsx`
- `src/routes/tests.$slug.tsx`
- `src/routes/test.builder.tsx` (composer, G3 read-path)
- `src/components/test-packs/TestPackCard.tsx`
- `src/components/test-packs/RelatedTestPacks.tsx`
- `src/lib/platform/pack-queries.ts`
**Routes:** `/tests`, `/tests/$slug`, `/test/builder`
**API endpoints:**
- `public.get_platform_packs()` RPC (anon-safe, catalog list)
- `public.get_pack_with_questions(p_slug text)` RPC (anon-safe, detail payload)
- `public.get_platform_pack_question_ids()` RPC (anon-safe, composer expansion)
**Data dependencies:**
- `public.tests` (status='published' rows owned by `platform@subenai.sk`)
- `public.platform_pack_metadata` (1:1 join on test_id, RLS anon-read)
- `public.test_questions` + `public.questions` (position-ordered, status='published')
- Migration `20260521280000_e37_platform_packs_unified.sql` applied
- `platform@subenai.sk` user created in Supabase Dashboard (Phase B' prerequisite)
**Source stories:** `tasks/PLAN-2026-05-20-E37-tests-coverage.md` (master plan — see Phases F, I, J for the AC rows this plan covers; no separate `tasks/stories/E37.*.md` story file exists yet)
**Last updated:** 2026-05-21

---

## Context

E37 unified the read path for the `/tests` catalog and `/tests/$slug` detail pages — both now call Supabase RPCs at SSR time rather than importing static TypeScript manifests. Fifteen industry-themed cybersecurity quiz packs (9 migrated, 6 new) live in `public.tests` + `public.platform_pack_metadata`. The `/test/builder` composer was also migrated to expand pack chips via `get_platform_pack_question_ids()`. This plan covers the browser-observable contracts that unit tests and DB contract tests cannot: filter state, sort order, ARIA semantics, touch targets, start-flow boot, 404 gate, related-pack selection, SEO JSON-LD, sitemap URLs, and composer pack-chip toggle behaviour.

## Out of scope

- Full quiz playthrough after "Spustiť pack →" — E2E coverage of `<TestFlow>` is a separate epic.
- Admin UI flows (`/admin/tests/*`).
- Full responsive matrix beyond the touch-target sanity check — a dedicated responsive plan is planned separately.
- Edu-mode composer toggle (covered under `specs/edu/`).
- Stripe, consent, auth flows.
- DB migration SQL contract tests — already covered by `tests/db/e37_platform_packs.test.ts` and `tests/db/e37_pack_question_ids_rpc.test.ts`.
- Vitest unit tests for loader + component isolation — already covered by `tests/routes/tests-index.test.tsx` and `tests/routes/tests-slug.test.tsx`.
- `public.platform_pack_metadata` admin write path (admin-role gate — out of scope per plan).
- Language picker switcher (i18n is admin-only; no user-facing locale toggle exists on the catalog page).
- Static TS pack files (`src/content/test-packs/*.ts`) — deleted in Phase G; post-Phase-G regression is covered by this same plan once the files are gone.

---

## Happy paths

### TC-01: Catalog renders all 15 packs from DB and count badge matches

**Prerequisites**:
- Browser at `http://localhost:8080/tests`.
- No industry filter active (page freshly loaded, no query params).
- Phase B' migration applied; `platform@subenai.sk` user exists; all 15 packs have `status='published'`.
- Viewport 1280×800.
- Consent banner dismissed (or accepted — either state is fine; tests run with analytics disabled).

**When** the page finishes loading
**Then** the element `data-testid="tests-catalog-grid"` is visible and contains exactly 15 child `<li>` elements (one featured tile + 14 standard cards, or 0 featured + 15 standard if sorted so no pack is at position 0)
**and** the element `data-testid="tests-catalog-result-count"` shows the text "15 testov"
**and** the element `data-testid="tests-catalog-heading"` contains the text "Otestuj svoju branžu. Bez registrácie."

### TC-02: Clicking a pack card navigates to the correct detail page

**Prerequisites**:
- `/tests` is loaded with all 15 packs visible (no filter active).
- The pack with slug `heslo-2fa` is in the grid.

**When** the user clicks the element `data-testid="tests-catalog-card-heslo-2fa"`
**Then** the browser navigates to `/tests/heslo-2fa`
**and** the element `data-testid="test-pack-heading"` is visible and non-empty
**and** the HTTP response for `/tests/heslo-2fa` returns status 200

### TC-03: Detail page renders hero, meta pills, and enabled start button

**Prerequisites**:
- Browser at `http://localhost:8080/tests/heslo-2fa`.
- Phase B' migration applied; `heslo-2fa` has at least 7 published questions.
- Viewport 1280×800.

**When** the page finishes loading
**Then** the element `data-testid="test-pack-heading"` is visible and non-empty
**and** the element `data-testid="test-pack-tagline"` is visible and non-empty
**and** the element `data-testid="test-pack-meta-questions"` is visible and contains the text "otázok"
**and** the element `data-testid="test-pack-start-button"` is visible and not disabled
**and** at least one `<a>` inside the sources section (`aria-labelledby="pack-sources-h"`) is present and has a non-empty `href`

### TC-04: Clicking the start button boots the TestFlow pack kind

**Prerequisites**:
- Browser at `http://localhost:8080/tests/heslo-2fa`.
- The page has finished loading and `data-testid="test-pack-start-button"` is not disabled.
- Viewport 1280×800.

**When** the user clicks the element `data-testid="test-pack-start-button"` labelled "Spustiť pack →"
**Then** the `<TestFlow>` component mounts and the first question prompt becomes visible on screen (any non-empty text element inside the quiz flow region)
**and** the detail-page hero (`data-testid="test-pack-hero"`) is no longer in the DOM

---

## Negative scenarios

### TC-05: Navigating to a non-existent slug renders the 404 page

**Prerequisites**:
- Browser navigates to `http://localhost:8080/tests/nonexistent-slug`.
- Phase B' migration applied (so the RPC is live and returns null for unknown slugs).

**When** the page finishes loading
**Then** the HTTP response status is 404
**and** the page shows the platform's not-found content (the element handled by TanStack Router's `notFound()` throw — typically `data-testid="not-found-page"` or equivalent registered in `e2e/poms/shared/NotFoundPage.ts`)

### TC-06: Legacy migrated pack "seniori" renders without the "(55+)" title qualifier

**Prerequisites**:
- Browser at `http://localhost:8080/tests/seniori`.
- Phase G1 copy sweep has landed (the title stored in DB must not include "(55+)").

**When** the page finishes loading
**Then** the element `data-testid="test-pack-heading"` is visible
**and** the text content of `data-testid="test-pack-heading"` does not contain the substring "(55+)"
**and** the element `data-testid="test-pack-start-button"` is not disabled

### TC-07: Industry filter applied to a single industry narrows the grid

**Prerequisites**:
- Browser at `http://localhost:8080/tests` with all 15 packs visible.
- At least one industry has more than zero but fewer than 15 packs (true for every industry in the seeded data).

**When** the user clicks the first available industry filter chip (any `data-testid^="tests-catalog-filter-"` element)
**Then** the element `data-testid="tests-catalog-result-count"` shows a count that is less than 15
**and** every card visible in the grid has a `data-testid^="tests-catalog-card-industry-"` element whose text matches the selected industry label
**and** the "Vyčistiť" button `data-testid="tests-catalog-filter-clear"` becomes visible

### TC-08: Filtering to a no-match industry shows the empty state with recovery button

**Prerequisites**:
- Browser at `http://localhost:8080/tests`.
- Playwright `route` intercept on the Supabase RPC so `get_platform_packs()` returns a single pack with industry `vseobecny` and no `rodicia` pack.

**When** the user clicks a filter chip for the industry that has no matching pack
**Then** the element `data-testid="tests-catalog-empty"` is visible
**and** the element `data-testid="tests-catalog-empty-clear"` is visible
**and** clicking `data-testid="tests-catalog-empty-clear"` removes the empty state and reveals the full grid

### TC-09: Sort dropdown changes from "Najnovšie" to "Najviac otázok" and reorders the grid

**Prerequisites**:
- Browser at `http://localhost:8080/tests` with no filter active and at least two packs having different question counts.
- Viewport 1280×800.

**When** the user reads the first card title in the grid (before any sort change)
**and** selects the option "Najviac otázok" from `data-testid="tests-catalog-sort"`
**Then** the grid re-renders with a different first card (the pack with the highest question count is now in the featured spotlight position)
**and** selecting "Najnovšie" again from `data-testid="tests-catalog-sort"` restores the original first card order

---

## Edge cases

### TC-10: Featured spotlight tile carries the "⭐ Najnovší" badge on default sort

**Prerequisites**:
- Browser at `http://localhost:8080/tests` with the default "Najnovšie" sort.
- At least one pack has `featured=true` prop passed by the route (first pack in `filtered[]`).

**When** the page finishes loading
**Then** the element whose `data-testid` matches `tests-catalog-card-featured-<slug>` for the featured pack is visible
**and** its text content equals "⭐ Najnovší"
**and** no other card in the grid carries a `data-testid^="tests-catalog-card-featured-"` element

### TC-11: Keyboard focus travels through filter chips → sort → grid links

**Prerequisites**:
- Browser at `http://localhost:8080/tests` with no active filter.
- Viewport 1280×800; keyboard-only navigation (no mouse events).

**When** the user presses Tab from the page's first focusable element and continues tabbing through the catalog header area
**Then** each industry filter chip (`data-testid^="tests-catalog-filter-"`) receives focus in DOM order and shows a visible focus ring
**and** the sort dropdown (`data-testid="tests-catalog-sort"`) receives focus after the chips
**and** the first pack card link (`data-testid^="tests-catalog-card-"`) receives focus after the sort control
**and** no focus event is swallowed silently (every Tab step moves focus to a new visible element)

### TC-12: Touch-target audit — filter chips and sort control are at least 44 px tall

**Prerequisites**:
- Browser at `http://localhost:8080/tests` with at least two industry chips visible.
- Playwright `boundingBox()` API used (not a screenshot assertion).

**When** the bounding box of each `data-testid^="tests-catalog-filter-"` element is measured
**and** the bounding box of `data-testid="tests-catalog-filter-clear"` is measured (when visible)
**and** the bounding box of `data-testid="tests-catalog-sort"` is measured
**Then** each measured element has a `height` property ≥ 44

### TC-13: ARIA — grid is a `<ul role="list">`, result-count has aria-live, sr-only h2 exists

**Prerequisites**:
- Browser at `http://localhost:8080/tests` with packs loaded.

**When** the DOM is inspected via `page.evaluate`
**Then** the element `data-testid="tests-catalog-grid"` has `tagName === "UL"` and `role === "list"`
**and** the element `data-testid="tests-catalog-result-count"` has `aria-live === "polite"`
**and** the element `data-testid="tests-catalog-grid-heading"` exists, has `tagName === "H2"`, and has the class `sr-only` (or equivalent that makes it visually hidden but accessible)

### TC-14: SEO JSON-LD — catalog head emits ItemList and FAQPage blobs with correct canonical

**Prerequisites**:
- Browser at `http://localhost:8080/tests` after full SSR.
- JavaScript evaluation of `document.head`.

**When** the page's `<head>` is read via `page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent)))`
**Then** at least one JSON-LD blob has `"@type": "ItemList"` and its `itemListElement` array has exactly 15 entries each with a `url` starting with `http`
**and** at least one JSON-LD blob has `"@type": "FAQPage"` and its `mainEntity` array has at least one entry
**and** the canonical `<link>` in `<head>` has `href` ending with `/tests`
**and** the `<meta name="robots">` content contains `index, follow`

### TC-15: Detail page JSON-LD uses pack title and canonical URL contains the slug

**Prerequisites**:
- Browser at `http://localhost:8080/tests/heslo-2fa` after SSR.

**When** the page's `<head>` is read via `page.evaluate` to extract `script[type="application/ld+json"]`
**Then** exactly one JSON-LD blob is present in the head
**and** the blob's `"@type"` is `"Quiz"` or another structured type (as produced by `buildPackQuizJsonLd`)
**and** the canonical `<link>` has `href` ending with `/tests/heslo-2fa`

### TC-16: Related-pack strip shows at most 3 cards and excludes the current pack

**Prerequisites**:
- Browser at `http://localhost:8080/tests/heslo-2fa`.
- At least 3 other published packs exist in DB (guaranteed by the 15-pack seed).

**When** the page finishes loading
**Then** the element `data-testid="test-pack-related"` is visible
**and** the element `data-testid="test-pack-related-heading"` contains the text "Vyskúšaj ďalší pack"
**and** the count of `data-testid^="tests-catalog-card-"` elements inside `data-testid="test-pack-related-grid"` is at most 3
**and** none of those cards has `data-testid="tests-catalog-card-heslo-2fa"` (current pack excluded)

### TC-17: Related-pack strip prefers same-industry siblings

**Prerequisites**:
- Browser at `http://localhost:8080/tests/heslo-2fa`.
- At least 2 other packs share the same industry as `heslo-2fa` in the DB seed.

**When** the related-pack strip renders
**Then** the first card in `data-testid="test-pack-related-grid"` has a `data-testid^="tests-catalog-card-industry-"` element whose text equals the industry label of `heslo-2fa`

### TC-18: Catalog gracefully handles an empty RPC response (DB returns 0 packs)

**Prerequisites**:
- Playwright `route` mock on the Supabase RPC endpoint so `get_platform_packs()` returns an empty array (`[]`).
- Browser at `http://localhost:8080/tests`.

**When** the page finishes loading with 0 packs
**Then** the element `data-testid="tests-catalog-empty"` is visible
**and** the element `data-testid="tests-catalog-empty-clear"` is NOT present (no active filter to clear)
**and** the element `data-testid="tests-catalog-result-count"` shows "0 testov"
**and** no JavaScript error is thrown to the browser console

### TC-19: Catalog handles RPC network failure gracefully

**Prerequisites**:
- Playwright `route` mock returning HTTP 500 on the Supabase RPC endpoint for `get_platform_packs`.
- Browser at `http://localhost:8080/tests`.

**When** the page finishes loading (or fails)
**Then** the page does not show an unhandled React error boundary crash that exposes a raw stack trace to the user
**and** no PII or internal Supabase URL appears in the visible page text

### TC-20: Browser back/forward after starting a pack keeps history sane and resets the started state

**Prerequisites**:
- Browser arrived at `http://localhost:8080/tests/heslo-2fa` by clicking the
  pack card on the `/tests` catalog (history: catalog → detail).
- The user has clicked "Spustiť pack →" so `<TestFlow>` has mounted. The CTA
  mounts the flow inline via component-local `useState` — no history entry is
  pushed and the URL stays `/tests/heslo-2fa`.
- Viewport 1280×800.

**When** the user clicks the browser back button
**Then** the browser returns to the previous history entry, the `/tests` catalog
**and** when the user clicks the browser forward button, the browser re-enters `/tests/heslo-2fa`
**and** the element `data-testid="test-pack-heading"` is visible again
**and** the element `data-testid="test-pack-start-button"` is enabled (the started state was in component-local useState and died with the unmount)

### TC-21: Anon session cannot write to platform_pack_metadata via direct REST call

**Prerequisites**:
- No auth cookie present.
- The Supabase anon key is used (as the browser would).

**When** a direct HTTP PATCH is issued to the Supabase REST endpoint for `platform_pack_metadata` with a modified `tagline` field for any existing row
**Then** the response status is 401 or 403 (RLS admin-write policy blocks the mutation)
**and** the catalog page still renders the original tagline on next load

### TC-22: Composer shows 15 pack chips; toggling a chip adds its question IDs to the pool

**Prerequisites**:
- Browser at `http://localhost:8080/test/builder` (Phase G3 DB read path active).
- Phase B' migration applied; `get_platform_pack_question_ids()` returns 15 rows.
- Viewport 1280×800.

**When** the page finishes loading
**Then** the element `data-testid="composer-pack-chips"` is visible
**and** exactly 15 child elements matching `data-testid^="composer-pack-chip-"` are present
**and** clicking `data-testid="composer-pack-chip-heslo-2fa"` causes the selection summary (`data-testid="composer-selection-summary"`) to show a count greater than 0

### TC-23: Toggling a composer pack chip OFF removes its IDs unless shared with another active pack

**Prerequisites**:
- Browser at `http://localhost:8080/test/builder`.
- The `heslo-2fa` chip has been toggled ON so a non-zero count is shown.
- No other pack chip is active.

**When** the user clicks `data-testid="composer-pack-chip-heslo-2fa"` a second time to toggle it OFF
**Then** the selection summary count returns to 0
**and** the element `data-testid="composer-run-self-button"` is disabled or absent (no questions selected)

### TC-24: Selecting more than 50 questions in the composer triggers the cap notification

**Prerequisites**:
- Browser at `http://localhost:8080/test/builder`.
- Enough pack chips exist that activating several of them would exceed 50 questions (guaranteed when 3+ packs are activated given each pack has ≥ 8 questions).

**When** the user toggles on enough pack chips to push the total selected count above 50
**Then** the element `data-testid="composer-stale-notice"` or an equivalent cap-warning element becomes visible in the UI
**and** the submit/run button does not initiate navigation until the count is within the cap

### TC-25: Composer URL `?config=<encoded>` pre-fills pack chip state

**Prerequisites**:
- A valid base64-encoded or URL-encoded composer config string is constructed that activates the `heslo-2fa` pack.
- Browser navigates to `http://localhost:8080/test/builder?config=<encoded>`.

**When** the page finishes loading
**Then** the element `data-testid="composer-pack-chip-heslo-2fa"` shows a pressed/active visual state (`aria-pressed="true"` or equivalent CSS class)
**and** the selection summary count is greater than 0 without the user clicking anything

### TC-26: `/tests/seniori` title does not contain "(55+)" on the catalog card

**Prerequisites**:
- Browser at `http://localhost:8080/tests` with no filter active.

**When** the page finishes loading
**Then** the element `data-testid="tests-catalog-card-title-seniori"` is visible
**and** its text content does not contain the substring "(55+)"

### TC-27: Sitemap includes all 15 `/tests/<slug>` URLs

**Prerequisites**:
- The build-time sitemap (`public/sitemap.xml` or served at `/sitemap.xml`) has been generated from `scripts/generate-sitemap.mjs` after Phase F merged (sitemap now pulls URLs from `get_platform_packs()` instead of the static manifest).
- The test reads the file from disk or fetches it from the dev server.

**When** the content of `sitemap.xml` is read
**Then** it contains exactly 15 `<loc>` entries matching the pattern `*/tests/<slug>` (one per published pack)
**and** none of those entries has a trailing space, newline, or `undefined` fragment in the URL

### TC-28: XSS payload in a pack slug (direct URL manipulation) does not execute script

**Prerequisites**:
- Browser navigates to `http://localhost:8080/tests/<script>alert(1)</script>`.

**When** the page finishes loading
**Then** no `alert` dialog appears
**and** the browser console contains no XSS execution log
**and** the page renders the not-found content (the slug is not in the DB so `notFound()` is thrown)

### TC-29: Mobile viewport (375×667) — catalog CTA buttons stay within the viewport

**Prerequisites**:
- Browser viewport set to 375×667 (iPhone SE simulation).
- Browser at `http://localhost:8080/tests`.

**When** the page finishes loading
**Then** the elements `data-testid="tests-catalog-cta-standard"` and `data-testid="tests-catalog-cta-courses"` are both within the viewport bounds (no horizontal overflow)
**and** `document.body.scrollWidth <= 375`

---

## Page Object Models

### New POMs required

**`e2e/poms/quiz/TestsDirectoryPage.ts`** — the file already exists but must be **extended** with the following locators for this plan's TCs:

| Getter / method | `data-testid` |
|---|---|
| `filterChip(industry)` | `tests-catalog-filter-${industry}` |
| `filterClearButton` | `tests-catalog-filter-clear` |
| `sortDropdown` | `tests-catalog-sort` |
| `resultCount` | `tests-catalog-result-count` |
| `gridHeading` | `tests-catalog-grid-heading` (sr-only) |
| `emptyState` | `tests-catalog-empty` |
| `emptyClearButton` | `tests-catalog-empty-clear` |
| `ctaStandard` | `tests-catalog-cta-standard` |
| `ctaCourses` | `tests-catalog-cta-courses` |
| `packCardIndustry(slug)` | `tests-catalog-card-industry-${slug}` |
| `packCardFeaturedBadge(slug)` | `tests-catalog-card-featured-${slug}` |

The `TestPackLandingPage` class in the same file must be **extended**:

| Getter / method | `data-testid` |
|---|---|
| `hero` | `test-pack-hero` |
| `metaQuestions` | `test-pack-meta-questions` |
| `metaThreshold` | `test-pack-meta-threshold` |
| `metaIndustry` | `test-pack-meta-industry` |
| `relatedSection` | `test-pack-related` |
| `relatedHeading` | `test-pack-related-heading` |
| `relatedGrid` | `test-pack-related-grid` |

`ComposerPage` at `e2e/poms/quiz/ComposerPage.ts` already has all required locators (`packChip(slug)`, `selectionSummary`, `runSelfButton`, `submitButton`, `staleNotice`). No new methods needed for this plan's TCs.

---

## Open questions

- TC-08 uses a route-mock strategy to force a no-match empty state. Confirm whether the Supabase RPC endpoint URL pattern is stable enough for `page.route(...)` matching in the test environment — the `supabase-js` client uses a POST to the RPC path, not a GET; the Playwright `route` handler must intercept POST requests.
- TC-27 (sitemap) assumes `scripts/generate-sitemap.mjs` already calls `get_platform_packs()` (committed in Phase F per the plan). Verify this is merged before the generator writes the spec — if the sitemap still uses the static manifest in the test environment, TC-27 must use a stub or be deferred to Phase G.
- The `buildPackQuizJsonLd` return type (`"@type"` value) should be confirmed against `src/lib/seo/quiz-jsonld.ts` before TC-15 is generated; the plan assumes `"Quiz"` but the generator must verify the actual string.
- TC-24 cap behaviour: confirm whether the cap notification uses `data-testid="composer-stale-notice"` (the existing stale-notice testid) or a separate `data-testid="composer-cap-notice"` — the POM already has `staleNotice` but the cap-exceeded flow may use a different element.
