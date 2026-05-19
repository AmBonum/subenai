# Homepage `/` — test plan

**Area:** `specs/marketing/`
**Component(s) under test:** `src/routes/index.tsx`, `src/i18n/locales/sk/marketing.json` (home keys)
**Routes:** `/`
**API endpoints:** `GET /rest/v1/attempts?select=id&count=exact` (attempt counter, anonymous)
**Data dependencies:** `attempts` table (read-only, anon RLS; count query may return 0 safely)
**Source stories:** _None — pre-story feature; intent inferred from `src/routes/index.tsx` + HEAD commit history._
**Last updated:** 2026-05-19

---

## Context

The homepage at `/` is the primary marketing entry point for subenai — a free Slovak-language phishing-awareness test and course platform. It presents the hero headline, a primary CTA that launches the anonymous quick test, three feature cards (tests, courses, about), a mission/sponsorship block, a slogan image, a blog preview section, and an FAQ accordion. The page is indexable (`robots: index, follow`) and must load correctly for anonymous visitors without any login session.

## Out of scope

- Deep behavioral coverage of header mega-menu navigation (separate cross-cutting spec).
- Cookie banner interaction (separate `specs/consent/` spec).
- FAQ accordion expand/collapse correctness — the Accordion component has its own unit tests.
- Blog section article content or ordering — `BlogHomeSection` is a separate component; only its presence is checked here.
- Sponsorship/Stripe checkout flow — covered by `specs/sponsorship/`.
- SEO meta beyond `<title>` and `robots` (og:*, twitter:*, canonical, structured data).
- Authenticated-user behavior — the homepage has no session guard and renders identically for all visitors.

---

## Happy paths

### TC-01: Hero section renders with correct heading and primary CTA

**Prerequisites**:
- Browser navigates to `http://localhost:8080/` with a clean session (no `sb-*-auth-token`, no prior consent cookie).
- Viewport 1280×800.
- Dev server running.

**When** the page finishes loading
**Then** the `<h1>` element (`data-testid="home-hero-heading"`) is visible and contains the text "Otestuj sa skôr, než ťa otestuje podvodník."
**and** the primary CTA link labelled "Spustiť test" (`data-testid="home-hero-cta"`) is visible
**and** the tagline beneath the CTA contains the texts "Bez registrácie", "90 sekúnd", and "Zadarmo"

### TC-02: Primary CTA navigates to /test

**Prerequisites**:
- Browser at `http://localhost:8080/` with a clean session, viewport 1280×800.

**When** the user clicks the link labelled "Spustiť test" (`data-testid="home-hero-cta"`)
**Then** the browser navigates to `/test`

### TC-03: Feature cards are present and link to correct routes

**Prerequisites**:
- Browser at `http://localhost:8080/` with a clean session, viewport 1280×800.

**When** the page finishes loading
**Then** the feature card link labelled "Sada testov" with CTA "Pozrieť sady testov" (`data-testid="home-feature-card-testy"`) is visible and its `href` is `/tests`
**and** the feature card link labelled "Bezplatné školenia" with CTA "Prejsť do školení" (`data-testid="home-feature-card-skolenia"`) is visible and its `href` is `/courses`
**and** the feature card link labelled "O projekte" with CTA "Spoznaj projekt" (`data-testid="home-feature-card-about"`) is visible and its `href` is `/about`

### TC-04: Page title and robots meta are correct

**Prerequisites**:
- Browser at `http://localhost:8080/` with a clean session, viewport 1280×800.

**When** the page finishes loading
**Then** `document.title` equals "subenai — Bezplatný phishing test a kurzy digitálnej bezpečnosti"
**and** `<meta name="robots">` has content `"index, follow, max-image-preview:large"` (noindex is absent)
**and** `<meta name="description">` is present and non-empty

---

## Negative scenarios

### TC-05: Supabase attempt-count query failure degrades gracefully — stats pill shows loading state

**Prerequisites**:
- Browser at `http://localhost:8080/` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/attempts**` aborts the request (`route.abort()`), simulating a network failure.

**When** the page finishes loading with the Supabase request aborted
**Then** the stats pill (`data-testid="home-stats-pill"`) is visible
**and** the pill does NOT display a number (it either shows the loading text "Načítavam štatistiky…" or remains empty)
**and** no unhandled error overlay or JavaScript exception appears in the console

### TC-06: Supabase attempt-count query returns null count — pill displays loading state

**Prerequisites**:
- Browser at `http://localhost:8080/` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/attempts**` returns HTTP 200 with body `{"data":[],"count":null}`.

**When** the page finishes loading
**Then** the stats pill is visible and shows "Načítavam štatistiky…" rather than a formatted number
**and** the hero heading (`data-testid="home-hero-heading"`) is still visible and unaffected

### TC-07: Mission block "Podporiť projekt" CTA navigates to /support

**Prerequisites**:
- Browser at `http://localhost:8080/` with a clean session, viewport 1280×800.
- Consent banner dismissed (click `data-testid="consent-banner-reject-all"`) so it does not obscure the CTA.

**When** the user scrolls to the mission section and clicks the link labelled "Podporiť projekt" (`data-testid="home-mission-cta-support"`)
**Then** the browser navigates to `/support`

### TC-08: Sponsors section "Pozrieť zoznam" CTA navigates to /sponsors

**Prerequisites**:
- Browser at `http://localhost:8080/` with a clean session, viewport 1280×800.
- Consent banner dismissed.

**When** the user clicks the link labelled "Pozrieť zoznam" (`data-testid="home-sponsors-cta"`)
**Then** the browser navigates to `/sponsors`

---

## Edge cases

### TC-09: Mobile viewport (375×667) — hero heading and CTA are fully visible without horizontal scroll

**Prerequisites**:
- Browser at `http://localhost:8080/` with a clean session.
- Viewport 375×667 (iPhone SE).

**When** the page finishes loading
**Then** the `<h1>` (`data-testid="home-hero-heading"`) is visible within the viewport with no horizontal overflow
**and** the CTA link (`data-testid="home-hero-cta"`) is visible and its tap target is fully within the viewport width
**and** `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth` (no horizontal overflow)

### TC-10: Tablet viewport (768×1024) — feature cards render in a grid without overflow

**Prerequisites**:
- Browser at `http://localhost:8080/` with a clean session.
- Viewport 768×1024 (iPad portrait).

**When** the page finishes loading
**Then** all three feature card links (`data-testid="home-feature-card-testy"`, `data-testid="home-feature-card-skolenia"`, `data-testid="home-feature-card-about"`) are visible
**and** no card overflows the right edge of the viewport

### TC-11: Slogan image renders and has a non-empty alt attribute

**Prerequisites**:
- Browser at `http://localhost:8080/` with a clean session, viewport 1280×800.

**When** the page finishes loading
**Then** the element `data-testid="home-slogan-image"` is visible
**and** its `alt` attribute equals "su(rfuj) be(zpečne) na (i)nternete"
**and** the image's `naturalWidth` is greater than 0 (the SVG loaded successfully)

### TC-12: Stats counter displays a formatted Slovak number once the Supabase query resolves

**Prerequisites**:
- Browser at `http://localhost:8080/` with a clean session, viewport 1280×800.
- A `page.route` intercept on `**/rest/v1/attempts**` returns HTTP 200 with body `{"data":[],"count":500}` after a 100 ms delay.

**When** the page finishes loading and the mocked query resolves
**Then** the stats pill (`data-testid="home-stats-pill"`) contains the text "Už otestovaných 627 ľudí" (500 + 127 offset, formatted with `sk-SK` locale — space as thousands separator)
**and** the "Načítavam štatistiky…" placeholder text is no longer present

### TC-13: Keyboard-only navigation reaches the primary CTA without a mouse

**Prerequisites**:
- Browser at `http://localhost:8080/` with consent banner dismissed (cookie set).
- Viewport 1280×800.

**When** the user presses Tab repeatedly from the start of the document until focus reaches the element `data-testid="home-hero-cta"`
**and** presses Enter
**Then** the browser navigates to `/test`
**and** focus was not trapped in the cookie banner or header skip-link during the traversal

### TC-14: XSS payload injected via URL fragment does not execute on the homepage

**Prerequisites**:
- Browser navigates to `http://localhost:8080/#<img src=x onerror=window.__xss=1>` with a clean session, viewport 1280×800.

**When** the page finishes loading
**Then** `window.__xss` is `undefined` in the page context
**and** the hero heading (`data-testid="home-hero-heading"`) renders normally

### TC-15: Site header and footer are present (sanity)

**Prerequisites**:
- Browser at `http://localhost:8080/` with a clean session, viewport 1280×800.

**When** the page finishes loading
**Then** `data-testid="header-root"` is visible
**and** `data-testid="footer-root"` is visible
**and** `data-testid="footer-nav-link-test"` resolves to `/test` (footer "Spustiť test" link points to the correct route)

---

## Open questions

- `data-testid` values `home-hero-cta`, `home-stats-pill`, `home-feature-card-testy`, `home-feature-card-skolenia`, `home-feature-card-about`, `home-mission-cta-support`, `home-mission-cta-more`, and `home-sponsors-cta` are **not yet present** in `src/routes/index.tsx`. They must be added before the generator can implement TC-01 through TC-08 and TC-12. The slogan section (`home-slogan-section`, `home-slogan-image`) already has `data-testid` attributes.
- TC-12 assumes the `displayCount` offset is exactly 127 (hardcoded in the component). If that constant changes, the expected text in the assertion must be updated in the spec.
- The "Žiadna registrácia. Žiadne bullshit." section heading (How it works) has no `data-testid`. If a TC is ever added to verify the how-it-works cards, a `data-testid="home-how-heading"` should be added.
