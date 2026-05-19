# Tests directory — `/tests` catalog + `/tests/$slug` pack landing — test plan

**Area:** quiz
**Component(s) under test:**
- `src/routes/tests.index.tsx` — catalog grid
- `src/components/test-packs/TestPackCard.tsx` — individual card
- `src/routes/tests.$slug.tsx` — pack landing page
**Project:** `e2e-chromium` (all TCs are browser-driven UI assertions)
**Spec file:** `e2e/specs/quiz/tests-directory.spec.ts`

---

## Background

`/tests` renders a filterable grid of all published test packs (9 total at time of writing,
loaded statically from `src/content/test-packs/index.ts`). Each card is a `<Link>` to
`/tests/$slug`. The pack landing (`/tests/$slug`) resolves the slug via a loader; an unknown
slug throws `notFound()` which the router catches and renders the global 404 component
("Stránka nenájdená"). The entire flow is anonymous — no auth required.

---

## Prerequisites (all TCs)

- Viewport: 1280×800 (Desktop Chrome default)
- Consent pre-seeded to `"all"` via `primeConsent` so the banner does not overlap the content

---

## Happy paths

### TC-01: Catalog page renders with all pack cards visible

**Given** the user navigates to `/tests`
**Then** the page heading "Otestuj svoju branžu" is visible
**and** the intro paragraph is visible
**and** the catalog grid contains at least 9 pack cards

### TC-02: Each card displays title, question-count meta and is a link to `/tests/$slug`

**Given** the user is on `/tests`
**When** they inspect the "eshop" card
**Then** the card title "E-shop tím — odolnosť proti scam-u" is visible
**and** the card meta line "📋 14 otázok · ≥ 70 %" is visible
**and** the card is a link pointing to `/tests/eshop`

### TC-03: Clicking a pack card navigates to the correct pack landing URL

**Given** the user is on `/tests`
**When** they click the "eshop" card
**Then** the browser navigates to `/tests/eshop`
**and** the page title contains "E-shop tím — odolnosť proti scam-u"

---

## Negative scenarios

### TC-04: Valid slug — pack landing renders title, tagline, meta and the "Spustiť pack →" CTA

**Given** the user navigates directly to `/tests/eshop`
**Then** the pack heading "E-shop tím — odolnosť proti scam-u" is visible
**and** the tagline paragraph is visible
**and** the meta line showing question count and passing threshold is visible
**and** the "Spustiť pack →" button is visible and enabled

### TC-05: Invalid slug — the global 404 component is rendered

**Given** the user navigates to `/tests/this-slug-does-not-exist`
**Then** the heading "404" is visible
**and** the subheading "Stránka nenájdená" is visible
**and** the URL remains `/tests/this-slug-does-not-exist`
