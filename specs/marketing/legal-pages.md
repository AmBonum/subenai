# Legal pages (`/privacy`, `/cookies`, `/changelog`) — test plan

**Area:** `specs/marketing/`
**Component(s) under test:** `src/routes/privacy.tsx`, `src/routes/cookies.tsx`, `src/routes/changelog.tsx`
**Routes:** `/privacy`, `/cookies`, `/changelog`
**API endpoints:** _None — all content is static/build-time._
**Data dependencies:** `src/i18n/locales/sk/legal.json` (privacy + cookies copy), `src/i18n/locales/sk/marketing.json` (`zmeny.*` keys), `src/content/changelog.generated.json` (parsed CHANGELOG.md)
**Source stories:** _None — pre-story features; intent inferred from component files + git log._
**Last updated:** 2026-05-19

---

## Context

Three thin statutory pages that every Slovak-language visitor is legally entitled to read. `/privacy` is the full GDPR policy with a processing-purpose table, data-subject rights list, and contact information. `/cookies` catalogs every cookie and localStorage entry by category (necessary, preferences, analytics, marketing, Stripe), displays the live `CONSENT_VERSION`, and exposes a "Otvoriť nastavenia cookies" button that wires into the existing `ConsentPreferencesDialog`. `/changelog` is a versioned public deploy log rendered from a build-time JSON file (`changelog.generated.json`); entries are ordered newest-first and use color-coded section badges ("Pridané", "Zmenené", "Opravené", etc.) with inline markdown rendering. All three pages are indexable (`robots: index, follow`) and must function for anonymous visitors with no session.

## Out of scope

- Correctness of the legal text itself (editorial/legal review, not automated testing).
- Stripe Checkout flow and payment interactions on `/support` (covered by `specs/sponsorship/`).
- Cookie banner accept/reject mechanics (covered by `specs/consent/cookie-banner.md`).
- Content of individual changelog entries beyond structural smoke.
- Authenticated-user-specific behavior — none of these pages have a session guard.
- SEO meta beyond `<title>` and `robots` (og:*, canonical, JSON-LD structured data depth).
- Cross-origin iframe or script injection via cookie values.

---

## /privacy

### TC-01: Page renders key structural sections and page title is set

**Prerequisites**:
- Browser navigates to `http://localhost:8080/privacy` with a clean session (no `sb-*-auth-token`).
- Viewport 1280×800.
- Dev server running.

**When** the page finishes loading
**Then** `document.title` equals "Zásady ochrany súkromia — subenai"
**and** the `<h1>` element (`data-testid="privacy-heading"`) is visible and contains the text "Zásady ochrany súkromia"
**and** the processing-purpose table (`data-testid="privacy-processing-table"`) is visible with at least 9 data rows (one per `PROCESSING_ROW_KEYS` entry)
**and** the GDPR rights section heading (`data-testid="privacy-rights-heading"`) is visible and contains "5. Tvoje práva"

### TC-02: `robots` meta is `index, follow` (noindex absent)

**Prerequisites**:
- Browser at `http://localhost:8080/privacy`, viewport 1280×800.

**When** the page finishes loading
**Then** `document.querySelector('meta[name="robots"]').content` equals `"index, follow"`
**and** `document.title` is non-empty

### TC-03: "← Späť na domov" link navigates to the homepage

**Prerequisites**:
- Browser at `http://localhost:8080/privacy`, viewport 1280×800.

**When** the user clicks the link labelled "← Späť na domov" (`data-testid="privacy-back-home"`)
**Then** the browser navigates to `/`

---

## /cookies

### TC-04: Cookie category table renders all five local rows and four Stripe rows

**Prerequisites**:
- Browser navigates to `http://localhost:8080/cookies` with a clean session.
- Viewport 1280×800.

**When** the page finishes loading
**Then** the `<h1>` element (`data-testid="cookies-heading"`) is visible and contains the text "Zásady používania cookies"
**and** the cookie table (`data-testid="cookies-category-table"`) is visible
**and** the table contains at least one row whose category cell reads "Nevyhnutné"
**and** the table contains a row whose category cell reads "Analytika"
**and** the table contains a row whose category cell reads "Marketing"
**and** the Stripe category cell is visible and contains the text "/support"

### TC-05: "Otvoriť nastavenia cookies" button opens the ConsentPreferencesDialog

**Prerequisites**:
- Browser at `http://localhost:8080/cookies`, viewport 1280×800.
- Consent banner dismissed (cookie `iiq_consent` already set so the banner does not obscure the button).

**When** the user clicks the button labelled "Otvoriť nastavenia cookies" (`data-testid="cookies-manage-button"`)
**Then** the element `data-testid="consent-dialog-root"` becomes visible in the DOM
**and** the dialog is focusable (keyboard focus moves inside it)

### TC-06: `robots` meta is `index, follow` and `CONSENT_VERSION` appears in the page

**Prerequisites**:
- Browser at `http://localhost:8080/cookies`, viewport 1280×800.

**When** the page finishes loading
**Then** `document.querySelector('meta[name="robots"]').content` equals `"index, follow"`
**and** the version line beneath the heading (`data-testid="cookies-version-line"`) is visible and contains the text "Verzia"

### TC-07: "zásadách ochrany súkromia" cross-link navigates to /privacy

**Prerequisites**:
- Browser at `http://localhost:8080/cookies`, viewport 1280×800.

**When** the user clicks the link labelled "zásadách ochrany súkromia" (`data-testid="cookies-privacy-link"`)
**Then** the browser navigates to `/privacy`

---

## /changelog

### TC-08: Page renders at least one version block and page title is set

**Prerequisites**:
- Browser navigates to `http://localhost:8080/changelog` with a clean session.
- Viewport 1280×800.
- `changelog.generated.json` has at least one entry (guaranteed by the build step that parses `CHANGELOG.md`).

**When** the page finishes loading
**Then** `document.title` equals "Zmeny a verzie — subenai"
**and** the `<h1>` element (`data-testid="changelog-heading"`) is visible and contains the text "Zmeny a verzie"
**and** the version list (`data-testid="changelog-list"`) is visible and contains at least one `<li>` child

### TC-09: Version entries are ordered newest-first

**Prerequisites**:
- Browser at `http://localhost:8080/changelog`, viewport 1280×800.
- `changelog.generated.json` has at least two entries.

**When** the page finishes loading
**Then** the `dateTime` attribute of the first `<time>` element inside the version list is lexicographically greater than or equal to the `dateTime` attribute of the second entry's `<time>` element (ISO-8601 descending order)

### TC-10: `robots` meta is `index, follow`

**Prerequisites**:
- Browser at `http://localhost:8080/changelog`, viewport 1280×800.

**When** the page finishes loading
**Then** `document.querySelector('meta[name="robots"]').content` equals `"index, follow"`
**and** `document.title` is non-empty

---

## Negative scenarios

### TC-11: `/changelog` with empty `changelog.generated.json` shows empty-state message

**Prerequisites**:
- Browser at `http://localhost:8080/changelog`, viewport 1280×800.
- Build-time JSON stubbed to `[]` via a `page.route` intercept that replaces the module with an empty array, OR the generator seeds the JSON to empty in a fixture variant.

**When** the page finishes loading with no entries
**Then** the version list is absent from the DOM
**and** the element containing the text "Zatiaľ žiadne verzie." (`data-testid="changelog-empty"`) is visible

### TC-12: `/privacy` contact email link is a `mailto:` href pointing to the correct address

**Prerequisites**:
- Browser at `http://localhost:8080/privacy`, viewport 1280×800.

**When** the page finishes loading
**Then** the email link (`data-testid="privacy-contact-email"`) is visible
**and** its `href` attribute starts with `mailto:`
**and** the link text is non-empty (the address renders)

### TC-13: `/cookies` — when no consent record exists, the "last consent" paragraph is absent

**Prerequisites**:
- Browser at `http://localhost:8080/cookies` with a clean session (no `iiq_consent` key in localStorage).
- Viewport 1280×800.

**When** the page finishes loading
**Then** the "Otvoriť nastavenia cookies" button (`data-testid="cookies-manage-button"`) is visible
**and** no element containing "Tvoj posledný súhlas:" is present in the DOM

### TC-14: `/cookies` — when a valid `iiq_consent` record exists, the "last consent" paragraph is visible

**Prerequisites**:
- Browser at `http://localhost:8080/cookies` with `iiq_consent` set in localStorage to a valid JSON object with `timestamp` and `version` fields (e.g. `{"timestamp":1716000000000,"version":"1.4.0","categories":{"preferences":false,"analytics":false,"marketing":false}}`).
- Viewport 1280×800.

**When** the page finishes loading
**Then** a paragraph containing the text "Tvoj posledný súhlas:" (`data-testid="cookies-last-consent"`) is visible
**and** the paragraph contains the version string from the stored record

---

## Edge cases

### TC-15: Mobile viewport (375×667) — all three pages load without horizontal overflow

**Prerequisites**:
- Viewport 375×667 (iPhone SE).
- Clean session, no consent cookie.

**When** the browser navigates to `http://localhost:8080/privacy`
**Then** `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth` (no horizontal overflow)
**and** the `<h1>` is visible within the viewport
**When** the browser navigates to `http://localhost:8080/cookies`
**and** `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth`
**When** the browser navigates to `http://localhost:8080/changelog`
**and** `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth`

### TC-16: Tablet viewport (768×1024) — `/privacy` processing table does not overflow

**Prerequisites**:
- Browser at `http://localhost:8080/privacy`, viewport 768×1024 (iPad portrait).

**When** the page finishes loading
**Then** the processing-purpose table (`data-testid="privacy-processing-table"`) is fully visible
**and** the table's bounding-box right edge does not exceed the viewport width

### TC-17: Keyboard-only navigation reaches the "Otvoriť nastavenia cookies" button on `/cookies`

**Prerequisites**:
- Browser at `http://localhost:8080/cookies` with consent banner dismissed.
- Viewport 1280×800.

**When** the user presses Tab repeatedly from the top of the document until focus reaches the element `data-testid="cookies-manage-button"`
**and** presses Enter
**Then** the element `data-testid="consent-dialog-root"` becomes visible
**and** focus moves inside the dialog (focus is not left on the button)

### TC-18: XSS payload in changelog entry does not execute

**Prerequisites**:
- Browser at `http://localhost:8080/changelog`, viewport 1280×800.
- `changelog.generated.json` contains one entry whose `added` array includes the string `**<img src=x onerror=window.__xss=1>**`.

**When** the page finishes loading and the entry is rendered via `renderInline`
**Then** `window.__xss` is `undefined` (the `escapeHtml` pass neutralised the payload before `<strong>` wrapping)
**and** the rendered list item contains a `<strong>` element with the literal text `<img src=x onerror=window.__xss=1>` escaped as HTML entities

### TC-19: `/changelog` anchor `#v<version>` scrolls to the correct version block

**Prerequisites**:
- Browser navigates directly to `http://localhost:8080/changelog#v1.0.0`, viewport 1280×800.
- An entry with `version: "1.0.0"` exists in `changelog.generated.json`.

**When** the page finishes loading
**Then** the `<li id="v1.0.0">` element (`data-testid="changelog-entry-v1.0.0"` or by `id`) is within the visible viewport (or near the top of the scroll position)

### TC-20: `/privacy` — section s8 callout "Ak ste respondent edu testu" is visible

**Prerequisites**:
- Browser at `http://localhost:8080/privacy`, viewport 1280×800.

**When** the page finishes loading
**Then** the section heading containing "8. Education mode (zber edu odpovedí)" (`data-testid="privacy-s8-heading"`) is visible
**and** the callout block (`data-testid="privacy-s8-callout"`) is visible and contains the text "Ak ste respondent edu testu:"

### TC-21: Console is clean on all three legal pages (no JS errors at load)

**Prerequisites**:
- Browser navigates to `http://localhost:8080/privacy`, then `http://localhost:8080/cookies`, then `http://localhost:8080/changelog` in sequence.
- Clean session, viewport 1280×800.

**When** each page finishes loading
**Then** `browser_console_messages` at level `"error"` returns no entries for any of the three pages
**and** no `Unhandled Promise Rejection` or React render error appears in the console

### TC-22: `/cookies` category table renders correctly on mobile (overflow-x scroll container)

**Prerequisites**:
- Browser at `http://localhost:8080/cookies`, viewport 375×667.

**When** the page finishes loading
**Then** the table wrapper (`data-testid="cookies-category-table-wrapper"`) has `overflow-x: auto` computed style (the table scrolls horizontally rather than breaking the layout)
**and** the "Nevyhnutné" category row is visible after a horizontal scroll if necessary

---

## Open questions

- None of the three route files (`privacy.tsx`, `cookies.tsx`, `changelog.tsx`) contain any `data-testid` attributes. The generator must add testids to every element cited in this plan in the same PR as the specs. Key additions needed:
  - `privacy.tsx`: `privacy-heading`, `privacy-back-home`, `privacy-processing-table`, `privacy-rights-heading`, `privacy-contact-email`, `privacy-s8-heading`, `privacy-s8-callout`
  - `cookies.tsx`: `cookies-heading`, `cookies-back-home`, `cookies-version-line`, `cookies-category-table`, `cookies-category-table-wrapper`, `cookies-manage-button`, `cookies-privacy-link`, `cookies-last-consent`
  - `changelog.tsx`: `changelog-heading`, `changelog-list`, `changelog-empty`; and per-entry `changelog-entry-v{version}` on each `<li id={anchor}>` element
- TC-11 (empty changelog) requires either a fixture JSON or a `page.route` intercept that replaces the static asset; the generator should confirm which approach is feasible given TanStack Start's SSR bundling.
- TC-18 (XSS in changelog) requires seeding a crafted entry into `changelog.generated.json` at test time. The generator may need a test-only fixture file rather than mutating the real changelog.
- TC-19 assumes `version: "1.0.0"` exists in `changelog.generated.json`. The generator should pick the oldest real version from the file instead of hardcoding `v1.0.0`.
