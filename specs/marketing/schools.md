# Schools page `/schools` — test plan

**Area:** `specs/marketing/`
**Component(s) under test:** `src/routes/schools.tsx`, `src/i18n/locales/sk/marketing.json` (`skoly.*` keys)
**Routes:** `/schools`
**API endpoints:** _None — static SSR page, no XHR calls._
**Data dependencies:** `src/config/site.ts` (`CONTACT_EMAIL = "subenai.podpora@gmail.com"`, `SITE_ORIGIN = "https://subenai.sk"`), `src/config/routes.ts` (`ROUTES.zostav = "/test/zostav"`, `ROUTES.privacy = "/privacy"`)
**Source stories:** _None — pre-story feature, intent inferred from `src/routes/schools.tsx` + E18 epic context (edu mode B2B surface)._
**Last updated:** 2026-05-19

---

## Context

The `/schools` page is the primary B2B marketing landing page for the edu mode feature. It explains step-by-step how a teacher, lecturer, or HR manager can create an edu test via the Composer, distribute it to a class or team, and read results from a password-protected dashboard. It also covers the GDPR role split (author = controller, am.bonum = processor), a 6-item FAQ, and closes with a CTA block linking to the Composer and a DPA-request email. The page is static — no JavaScript fetches, no authentication required. It is fully indexable (`robots: index, follow`).

## Missing `data-testid` attributes (flag for generator)

The `schools.tsx` component contains **zero `data-testid` attributes**. Before the generator can write stable Playwright locators, the following test-ids must be added to `src/routes/schools.tsx`:

| Suggested test-id | Element |
|---|---|
| `schools-page-root` | `<main>` wrapper |
| `schools-back-link` | "← Späť na domov" link |
| `schools-heading` | `<h1>Pre školy, lektorov a HR</h1>` |
| `schools-hero-paragraph` | Hero lead paragraph |
| `schools-what-heading` | `<h2>Čo to je</h2>` |
| `schools-composer-link-what` | "Composer-om" link in the "Čo to je" section |
| `schools-step1-heading` | `<h2>Krok 1: Vytvor test</h2>` |
| `schools-composer-link-step1` | "Composer" link in step-1 list item |
| `schools-step2-heading` | `<h2>Krok 2: Zapni edu mód a heslo</h2>` |
| `schools-step3-heading` | `<h2>Krok 3: Pošli link respondentom</h2>` |
| `schools-email-template-details` | `<details>` element containing the email template |
| `schools-email-template-summary` | `<summary>` "Vzor e-mailu pre respondentov (copy-paste)" |
| `schools-email-template-pre` | `<pre>` block with the template text |
| `schools-step4-heading` | `<h2>Krok 4: Pozri výsledky</h2>` |
| `schools-gdpr-heading` | `<h2>GDPR — tvoja rola autora</h2>` |
| `schools-gdpr-dpa-email-link` | `mailto:` link inside GDPR "Šablóna DPA" bullet |
| `schools-gdpr-privacy-link` | "zásady spracovania" link to `/privacy` |
| `schools-faq-heading` | `<h2>Časté otázky</h2>` |
| `schools-outro-card` | Outer `<div>` of the closing CTA card |
| `schools-outro-composer-link` | "Composer" link in the outro card |
| `schools-outro-email-link` | `mailto:` link in the outro card |

---

## Out of scope

- Composer builder behavior (`/test/zostav`) — covered by `specs/composer/`.
- Edu intake form validation and password-gate dashboard — covered by `specs/edu/`.
- Privacy policy (`/privacy`) content — covered by `specs/consent/`.
- Header mega-menu and footer navigation — covered by `specs/cross-cutting/`.
- Cookie banner interaction — covered by `specs/consent/`.
- SEO meta beyond `<title>`, `description`, and `robots` (og:*, twitter:*, canonical, JSON-LD).
- Visual / pixel-perfect regression (Tailwind tokens, color scheme).
- Email template content correctness (the `<pre>` block is treated as an opaque string; its exact wording is not under contract here).

---

## Happy paths

### TC-01: Page renders the heading, hero text, and all six content sections

**Prerequisites**:
- Browser navigates to `http://localhost:8080/schools` with a clean session (no `sb-*-auth-token`, no prior consent cookie).
- Viewport 1280×800.
- Dev server running.

**When** the page finishes loading
**Then** the `<h1>` element (`data-testid="schools-heading"`) is visible with text "Pre školy, lektorov a HR"
**and** the hero paragraph (`data-testid="schools-hero-paragraph"`) is visible and contains "Edu mód v Composeri"
**and** all six `<h2>` section headings are visible: "Čo to je", "Krok 1: Vytvor test", "Krok 2: Zapni edu mód a heslo", "Krok 3: Pošli link respondentom", "Krok 4: Pozri výsledky", and "GDPR — tvoja rola autora"
**and** the FAQ heading "Časté otázky" (`data-testid="schools-faq-heading"`) is visible

### TC-02: "Composer" links in the body navigate to `/test/zostav`

**Prerequisites**:
- Browser at `http://localhost:8080/schools` with a clean session, viewport 1280×800.

**When** the page finishes loading
**Then** the link labelled "Composer-om" (`data-testid="schools-composer-link-what"`) has `href="/test/zostav"`
**and** the link labelled "Composer" (`data-testid="schools-composer-link-step1"`) has `href="/test/zostav"`
**and** the outro-card link labelled "Composer" (`data-testid="schools-outro-composer-link"`) has `href="/test/zostav"`

### TC-03: Page title and robots meta are correct

**Prerequisites**:
- Browser at `http://localhost:8080/schools` with a clean session, viewport 1280×800.

**When** the page finishes loading
**Then** `document.title` equals "Pre školy a vzdelávacie inštitúcie — subenai"
**and** `<meta name="robots">` has content `"index, follow"` (noindex is absent)
**and** `<meta name="description">` is present and contains "edu test"

### TC-04: DPA and outro email links resolve to `mailto:subenai.podpora@gmail.com`

**Prerequisites**:
- Browser at `http://localhost:8080/schools` with a clean session, viewport 1280×800.

**When** the page finishes loading
**Then** the email link inside the "Šablóna DPA" GDPR bullet (`data-testid="schools-gdpr-dpa-email-link"`) has `href="mailto:subenai.podpora@gmail.com"`
**and** the email link inside the outro card (`data-testid="schools-outro-email-link"`) has `href="mailto:subenai.podpora@gmail.com"`

---

## Negative scenarios

### TC-05: "zásady spracovania" link in the GDPR section navigates to `/privacy`

**Prerequisites**:
- Browser at `http://localhost:8080/schools` with a clean session, viewport 1280×800.

**When** the page finishes loading
**Then** the link labelled "zásady spracovania" (`data-testid="schools-gdpr-privacy-link"`) has `href="/privacy"`

### TC-06: Email template `<details>` is collapsed by default and expands on click

**Prerequisites**:
- Browser at `http://localhost:8080/schools` with a clean session, viewport 1280×800.

**When** the page finishes loading
**Then** the `<details>` element (`data-testid="schools-email-template-details"`) does not have the `open` attribute (template body is hidden)
**When** the user clicks the summary labelled "Vzor e-mailu pre respondentov (copy-paste)" (`data-testid="schools-email-template-summary"`)
**Then** the `<pre>` block (`data-testid="schools-email-template-pre"`) is visible and contains the text "Predmet: Test rozpoznávania scamov"

### TC-07: "← Späť na domov" link navigates to `/`

**Prerequisites**:
- Browser at `http://localhost:8080/schools` with a clean session, viewport 1280×800.

**When** the user clicks the link labelled "← Späť na domov" (`data-testid="schools-back-link"`)
**Then** the browser navigates to `http://localhost:8080/`
**and** no HTTP error status is returned

### TC-08: No JavaScript console errors on clean page load

**Prerequisites**:
- Browser navigates to `http://localhost:8080/schools` with a clean session, no prior consent cookie, viewport 1280×800.
- Console error listener active from before navigation.

**When** the page finishes loading (network idle)
**Then** the browser console contains zero errors (no unhandled rejections, no 4xx/5xx resource failures, no React hydration warnings)

---

## Edge cases

### TC-09: Mobile viewport (375×667) — heading and outro card are fully visible without horizontal overflow

**Prerequisites**:
- Browser at `http://localhost:8080/schools` with a clean session.
- Viewport set to 375×667 (iPhone SE) before navigation.

**When** the page finishes loading
**Then** the `<h1>` element (`data-testid="schools-heading"`) is visible within the viewport
**and** `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth` (no horizontal overflow)
**and** the outro card (`data-testid="schools-outro-card"`) is visible after scrolling to bottom

### TC-10: Tablet viewport (768×1024) — prose article renders without overflow

**Prerequisites**:
- Browser at `http://localhost:8080/schools` with a clean session.
- Viewport set to 768×1024 (iPad portrait) before navigation.

**When** the page finishes loading
**Then** all six `<h2>` section headings are visible after scrolling
**and** `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth` (no horizontal overflow)
**and** the `<pre>` template block inside the expanded `<details>` does not cause overflow when the `<details>` is opened

### TC-11: Keyboard-only navigation reaches the first Composer CTA without a mouse

**Prerequisites**:
- Browser at `http://localhost:8080/schools` with consent banner dismissed (cookie set).
- Viewport 1280×800.

**When** the user presses Tab repeatedly from the top of the document until focus reaches the link labelled "Composer-om" (`data-testid="schools-composer-link-what"`)
**and** presses Enter
**Then** the browser navigates to `/test/zostav`
**and** focus was reachable without a keyboard trap in the header or cookie banner

### TC-12: XSS payload in URL hash does not execute on the page

**Prerequisites**:
- Browser navigates to `http://localhost:8080/schools#<img src=x onerror=window.__xss=1>` with a clean session, viewport 1280×800.

**When** the page finishes loading
**Then** `window.__xss` is `undefined` in the page context
**and** the heading "Pre školy, lektorov a HR" renders normally

### TC-13: FAQ section lists all six questions

**Prerequisites**:
- Browser at `http://localhost:8080/schools` with a clean session, viewport 1280×800.

**When** the page finishes loading and the user scrolls to the "Časté otázky" section
**Then** all six FAQ `<dt>` question terms are visible: "Stratil/a som heslo. Môžete mi ho resetovať?", "Ako dlho sa uchovávajú odpovede?", "Môžem zmazať konkrétneho študenta?", "Koľko respondentov môže absolvovať jeden test?", "Môže sa študent prihlásiť opakovane?", and "Funguje to na mobile?"
**and** each `<dd>` answer immediately follows its corresponding `<dt>` (no pairing mismatch)

### TC-14: Step-4 result-set bullet list renders all five items including the CSV export emphasis

**Prerequisites**:
- Browser at `http://localhost:8080/schools` with a clean session, viewport 1280×800.

**When** the page finishes loading and the user scrolls to the section headed "Krok 4: Pozri výsledky"
**Then** the unordered list contains exactly five items
**and** the fifth item contains the bold text "CSV export"
**and** the brute-force protection notice "Session vydrží 60 minút" is visible below the list

### TC-15: GDPR section renders controller/processor split correctly

**Prerequisites**:
- Browser at `http://localhost:8080/schools` with a clean session, viewport 1280×800.

**When** the page finishes loading and the user scrolls to the section headed "GDPR — tvoja rola autora"
**Then** the paragraph contains the bold text "ty kontrolór"
**and** the paragraph contains the bold text "am.bonum s. r. o."
**and** the paragraph contains the bold text "sprostredkovateľ"
**and** the bullet labelled "Doba uchovávania:" is visible with text containing "12 mesiacov"

### TC-16: Outro card footer line shows correct site origin and entity name

**Prerequisites**:
- Browser at `http://localhost:8080/schools` with a clean session, viewport 1280×800.

**When** the page finishes loading and the user scrolls to the outro card (`data-testid="schools-outro-card"`)
**Then** the card footer paragraph contains the bold text "https://subenai.sk"
**and** it contains the text "am.bonum s. r. o."

### TC-17: Page does not carry a `noindex` directive

**Prerequisites**:
- Browser at `http://localhost:8080/schools` with a clean session, viewport 1280×800.

**When** the page finishes loading
**Then** no `<meta name="robots">` tag with content containing "noindex" is present in `document.head`
**and** the page `<title>` is non-empty (confirming the route's `head()` ran)

---

## Open questions

- TC-03 asserts `<meta name="description">` contains "edu test" — the actual value from `skoly.meta_description` in the i18n JSON is `"Ako pripraviť edu test pre triedu alebo tím…"`. If the description key changes, update the assertion substring.
- No `data-testid` attributes exist anywhere in `src/routes/schools.tsx` as of 2026-05-19. The generator must add all entries from the "Missing `data-testid` attributes" table before implementing any TC. The missing-testid table is the primary blocker.
- The `<details>` / `<summary>` element for the email template currently has no `data-testid`. TC-06 depends on `schools-email-template-details` and `schools-email-template-summary` being added.
- TC-11 (keyboard nav) assumes the consent banner can be pre-dismissed by setting the consent cookie directly — confirm the banner's cookie name and value format with `specs/consent/` spec before implementing.
