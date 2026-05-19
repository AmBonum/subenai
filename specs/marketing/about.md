# About page — test plan

**Area:** `specs/marketing/`
**Component(s) under test:** `src/routes/about.tsx`, `src/i18n/locales/sk/marketing.json` (`about.*` keys)
**Routes:** `/about`
**API endpoints:** _None — static SSR page, no XHR calls._
**Data dependencies:** _None — no DB reads. JSON-LD injected at build time from `src/config/site.ts`._
**Source stories:** _None — pre-story feature; intent inferred from `src/routes/about.tsx` + `src/i18n/locales/sk/marketing.json`._
**Last updated:** 2026-05-19

---

## Context

The `/about` page ("O projekte") is the project's transparency landing page. It explains to any anonymous visitor — curious end-users, potential sponsors, journalists, or educators — why the project is free, where money goes, and what sponsors receive. Seven content sections are structured around `aria-labelledby` IDs. The page closes with a CTA block linking to `/support` (primary) and `/sponsors` (secondary). No authentication or dynamic data is involved.

## Out of scope

- Deep copy review or fact-checking of the cost breakdown numbers.
- Visual / pixel-perfect regression (colours, typography scale, Tailwind token checks).
- Header / footer component behaviour — covered by `specs/cross-cutting/`.
- Cookie banner interactions — covered by `specs/consent/`.
- `/support` Stripe checkout flow — covered by `specs/sponsorship/`.
- `/sponsors` list rendering — covered by `specs/sponsorship/`.
- `/cookies` page content — covered by `specs/consent/`.

---

## Happy paths

### TC-01: Page renders the heading, tagline, and all seven content sections

**Prerequisites**:
- Browser navigates to `http://localhost:8080/about` with no active session (clean localStorage, no `sb-*-auth-token`).
- Viewport 1280×800.
- Dev server running.

**When** the page finishes loading
**Then** the `<h1>` heading with text "Čo je subenai" is visible
**and** the tagline paragraph "Bezplatný edukatívny nástroj pre slovenský digitálny svet." is visible
**and** the `<h2>` heading "1. Cieľ projektu" is visible
**and** the `<h2>` heading "2. Prečo bezplatné" is visible
**and** the `<h2>` heading "3. Prečo sponsorship a nie členstvo" is visible
**and** the `<h2>` heading "4. Kam idú peniaze" is visible
**and** the `<h2>` heading "5. Čo sponzori dostanú" is visible
**and** the `<h2>` heading "6. Čo nerobíme (a kde je hranica)" is visible
**and** the `<h2>` heading "Chceš projekt podporiť?" is visible

### TC-02: CTA buttons link to the correct routes

**Prerequisites**:
- Browser at `http://localhost:8080/about`.
- Viewport 1280×800.

**When** the page has loaded
**Then** the link labelled "Podporiť projekt" in the support CTA section has href `/support`
**and** the link labelled "Pozri sponzorov" in the same section has href `/sponsors`
**and** clicking "Podporiť projekt" navigates to `/support` without a 404

### TC-03: Back-home link and in-text "Nastavenia cookies" link are navigable

**Prerequisites**:
- Browser at `http://localhost:8080/about`.
- Viewport 1280×800.

**When** the user clicks the link labelled "← Späť na domov" near the top of the page
**Then** the browser navigates to `/`
**and** the home page heading is visible

**When** the user returns to `http://localhost:8080/about` and clicks the link labelled "Nastavenia cookies" inside section "6. Čo nerobíme (a kde je hranica)"
**Then** the browser navigates to `/cookies`

---

## Negative scenarios

### TC-04: Direct navigation to /about with no session returns 200, not a redirect

**Prerequisites**:
- Browser has no `sb-*-auth-token` cookie and no `supabase.auth.token` in localStorage.
- Viewport 1280×800.

**When** the user navigates directly to `http://localhost:8080/about`
**Then** the server responds with HTTP 200
**and** the page renders the "Čo je subenai" heading without redirecting to `/login` or any other route

### TC-05: Page title tag is set correctly

**Prerequisites**:
- Browser at `http://localhost:8080/about`.

**When** the page has loaded
**Then** `document.title` equals `"O projekte — subenai"`
**and** the `<meta name="robots">` content is `"index, follow"` (NOT `"noindex"`)

### TC-06: Canonical link points to the production origin

**Prerequisites**:
- Browser at `http://localhost:8080/about`.

**When** the page has loaded
**Then** `<link rel="canonical">` has `href` equal to `"https://subenai.sk/about"`

---

## Edge cases

### TC-07: All seven section `aria-labelledby` IDs are present and match their headings

**Prerequisites**:
- Browser at `http://localhost:8080/about`.

**When** the page has loaded
**Then** the element with `id="ciel"` exists and its text content equals "1. Cieľ projektu"
**and** the element with `id="bezplatne"` exists and its text content equals "2. Prečo bezplatné"
**and** the element with `id="preco-sponsorship"` exists and its text content equals "3. Prečo sponsorship a nie členstvo"
**and** the element with `id="kam-id-peniaze"` exists and its text content equals "4. Kam idú peniaze"
**and** the element with `id="co-sponzori"` exists and its text content equals "5. Čo sponzori dostanú"
**and** the element with `id="co-nerobime"` exists and its text content equals "6. Čo nerobíme (a kde je hranica)"
**and** the element with `id="podporit"` exists and its text content equals "Chceš projekt podporiť?"

### TC-08: Mobile viewport (375×667) renders without horizontal overflow

**Prerequisites**:
- Playwright viewport set to 375×667 before navigation.
- Browser at `http://localhost:8080/about`.

**When** the page has loaded at 375×667
**Then** `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth` (no horizontal scroll)
**and** the "Čo je subenai" heading is visible
**and** both CTA links ("Podporiť projekt" and "Pozri sponzorov") are visible without being cut off

### TC-09: The `about.tsx` component contains no `data-testid` attributes — flag as missing

**Prerequisites**:
- Browser at `http://localhost:8080/about`.

**When** the page has loaded
**Then** `document.querySelectorAll('[data-testid]')` returns zero elements whose `data-testid` value starts with `"about-"` (none are defined in `src/routes/about.tsx` today — this TC documents the gap so the generator adds test IDs before writing locators)

**Note:** This TC is intentionally failing by design until `data-testid="about-heading"`, `data-testid="about-support-cta-primary"`, `data-testid="about-support-cta-secondary"`, and `data-testid="about-back-home"` are added to `src/routes/about.tsx`.

### TC-10: Keyboard-only navigation reaches both CTA links in the support section

**Prerequisites**:
- Browser at `http://localhost:8080/about`.
- No pointer device used after page load.
- Viewport 1280×800.

**When** the user presses Tab repeatedly until focus lands on the link labelled "Podporiť projekt" in the support section
**Then** the element is focusable and has a visible focus ring
**and** pressing Tab once more moves focus to "Pozri sponzorov"
**and** pressing Enter on either link navigates to the correct route

### TC-11: JSON-LD `AboutPage` script is present and valid

**Prerequisites**:
- Browser at `http://localhost:8080/about`.

**When** the page has loaded
**Then** `document.querySelector('script[type="application/ld+json"]')` is non-null
**and** its `textContent` parses as valid JSON without throwing
**and** the parsed object contains a node with `"@type": "AboutPage"` (or the root `@graph` contains such a node)

### TC-12: Page renders correctly when the browser locale is non-Slovak (e.g. `en-US`)

**Prerequisites**:
- Browser launched with `Accept-Language: en-US,en;q=0.9`.
- Browser at `http://localhost:8080/about`.

**When** the page finishes loading
**Then** the "Čo je subenai" heading is still present (the app is sk-SK only; no language negotiation occurs)
**and** no JavaScript error related to `Intl` or `localeCompare` appears in the console

### TC-13: Page does not load analytics scripts before consent is given

**Prerequisites**:
- Browser opens `http://localhost:8080/about` in a fresh context (no cookies, no localStorage).
- Network requests are intercepted.

**When** the page finishes loading without any interaction with the consent banner
**Then** no request to `www.googletagmanager.com` or `www.google-analytics.com` has been made
**and** the consent banner (`data-testid="consent-banner-root"`) is visible

---

## Open questions

- `src/routes/about.tsx` has no `data-testid` attributes on its own elements. The generator will need either (a) those IDs added to the component, or (b) role-based locators as a fallback. Recommend adding `about-heading`, `about-back-home`, `about-support-cta-primary`, `about-support-cta-secondary` before generating specs (TC-09 documents this gap).
- The route's `head()` injects an `AboutPage` JSON-LD node, but the browser evaluation in TC-11 found the global site-wide `@graph` script only — it's unclear whether TanStack Start merges `head()` script tags or whether the route-level LD+JSON is deduplicated at runtime. Needs verification during spec generation.
