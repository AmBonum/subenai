# Support page `/support` — smoke / UI test plan

**Area:** `specs/marketing/`
**Component(s) under test:** `src/routes/support.tsx` (`DonateForm`, `PodporaPage`)
**Routes:** `/support`, `/support?cancelled=1`
**API endpoints:** _None triggered by these TCs — all TCs stop before clicking the submit button. POST `/api/create-checkout-session` is covered by `specs/sponsorship/podpora-donate-flow.md`._
**Data dependencies:** `src/i18n/locales/sk/marketing.json` (`podpora.*` keys); `src/config/site.ts` (`SITE_ORIGIN`, `CONTACT_EMAIL`)
**Source stories:** `tasks/stories/E11.1-podpora-page.md` (AC-1 through AC-13)
**Last updated:** 2026-05-19

---

## Context

The `/support` page is the primary donor-facing surface for the subenai project (Epic E11). A visitor picks a donation frequency (one-off or monthly), selects a preset or custom amount, provides billing details and two mandatory legal consents, and optionally opts into the public sponsor list. This plan covers the **smoke and UI layer only** — static rendering, meta tags, React state transitions triggered by clicking preset chips and the frequency toggle, the cancellation banner, viewport behaviour, and keyboard accessibility up to but not including the submit action. All Stripe Checkout redirect flows and API integration are covered by `specs/sponsorship/podpora-donate-flow.md`.

## Out of scope

- POST to `/api/create-checkout-session` and anything downstream of it — see `specs/sponsorship/podpora-donate-flow.md` TC-01 through TC-24.
- `/thank-you/$sessionId` polling and rendering — covered by `specs/sponsorship/podpora-donate-flow.md`.
- `/manage-support` page functionality — to be covered by a separate `specs/sponsorship/manage-support.md` plan.
- `/sponsors` page rendering of sponsor entries — to be covered by `specs/sponsorship/sponsors-page.md`.
- Stripe webhook, refund flow, and raw DB assertions — integration test concern.
- Server-side AML validation (max 500 EUR) — API integration concern; the client-side guard is tested here in TC-08.
- Payment method alternatives (Apple Pay, Google Pay, SEPA) — Stripe's hosted checkout, not in scope for this plan.
- Cookie banner interaction — covered by `specs/consent/`.

---

## Happy paths

### TC-01: Page renders with correct heading, hero text, and back link

**AC reference:** AC-1, AC-2

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- No `cancelled` query param.
- Consent banner dismissed (irrelevant to this assertion, but should not obscure `<main>`).

**When** the page finishes loading
**Then** `document.title` equals `"Podpora projektu — subenai"`
**and** the `<h1>` reads `"Podpora projektu"` and is visible within `<main>`
**and** the hero paragraph contains the text `"Akúkoľvek čiastku použijeme na hosting, tvorbu obsahu a údržbu. Žiadne reklamy, žiadne platené výhody."` and a link labelled `"O projekte"` pointing to `/about`
**and** the link `"← Späť na domov"` is present above the heading and points to `/`

---

### TC-02: Frequency toggle switches amount chips between one-off and monthly sets

**AC reference:** AC-3, AC-4

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- Page loaded; no prior interaction.

**When** the page loads
**Then** the radio button labelled `"Jednorazovo"` (`data-testid="podpora-mode-oneoff"`) has `aria-checked="true"` (default mode)
**and** the amount group shows chips for `5 €`, `10 €`, `25 €`, `50 €`, `100 €`, and `"Iná suma"` (six chips, one-off set)
**When** the user clicks the radio button labelled `"Mesačne"` (`data-testid="podpora-mode-monthly"`)
**Then** `data-testid="podpora-mode-monthly"` has `aria-checked="true"` and `data-testid="podpora-mode-oneoff"` has `aria-checked="false"`
**and** the amount group shows chips for `5 €`, `10 €`, `25 €` only (three chips, monthly set)
**and** the `"Iná suma"` chip is no longer present
**and** the section legend reads `"Suma (€/mesiac)"` instead of `"Suma (€)"`

---

### TC-03: Clicking a preset chip marks it as selected and updates submit button label

**AC reference:** AC-4, AC-13

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- "Jednorazovo" mode (default); no amount pre-selected.
- Fields labelled `"E-mail"` and `"Meno alebo firma"` filled with valid values; both consent checkboxes ticked.

**When** the user clicks the chip labelled `"25 €"` (`data-testid="podpora-amount-25"`)
**Then** `data-testid="podpora-amount-25"` has `aria-checked="true"`
**and** all other amount chips have `aria-checked="false"`
**and** the submit button (`data-testid="podpora-submit-button"`) label reads `"Pokračovať na platbu — 25 €"`
**and** the button is enabled (does not have the `disabled` attribute)

---

### TC-04: "Iná suma" chip reveals custom input; typed value updates submit label

**AC reference:** AC-4, AC-5

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- "Jednorazovo" mode; fields `"E-mail"` and `"Meno alebo firma"` filled; both consents ticked.

**When** the user clicks the chip labelled `"Iná suma"` (`data-testid="podpora-amount-custom"`)
**Then** `data-testid="podpora-amount-custom"` has `aria-checked="true"`
**and** the input `data-testid="podpora-amount-custom-input"` is visible with label `"Vlastná suma (5–500 €)"`
**When** the user types `35` into `data-testid="podpora-amount-custom-input"`
**Then** the submit button label reads `"Pokračovať na platbu — 35 €"`
**and** the button is enabled

---

## Negative scenarios

### TC-05: Submit button is disabled on initial page load (no amount, no consents)

**AC reference:** AC-7, AC-13

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- All form fields at their initial empty/unchecked state.

**When** the page finishes loading without any user interaction
**Then** `data-testid="podpora-submit-button"` has the `disabled` attribute
**and** the button label reads `"Pokračovať na platbu"` (the `submit_default` fallback — `amountEur` is `null`)
**and** no error banner (`data-testid="podpora-error-banner"`) is visible

---

### TC-06: Button stays disabled when amount and email are filled but consents are missing

**AC reference:** AC-7

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.

**When** the user clicks `data-testid="podpora-amount-25"` to select `25 €`
**and** fills `data-testid="podpora-field-email"` with `test@example.com`
**and** fills `data-testid="podpora-field-name"` with `Test User`
**and** leaves both consent checkboxes unchecked
**Then** `data-testid="podpora-submit-button"` remains disabled
**and** ticking only `data-testid="podpora-checkbox-consent-immediate"` (leaving `data-testid="podpora-checkbox-consent-data"` unchecked) still leaves the button disabled

---

### TC-07: Cancellation banner appears when `?cancelled=1` is present; absent otherwise

**AC reference:** AC-9 (cancel_url behaviour)

**Prerequisites**:
- Two separate page loads tested sequentially.

**When** the browser navigates to `http://localhost:8788/support?cancelled=1`
**Then** the element `data-testid="podpora-cancelled-banner"` is visible with text `"Platbu si zrušil. Žiadne údaje neboli uložené. Ak si to len rozmyslel, môžeš formulár vyplniť znova."`
**and** the donate form (`data-testid="podpora-form"`) is rendered below the banner with all fields empty
**When** the browser navigates to `http://localhost:8788/support` (no query param)
**Then** `data-testid="podpora-cancelled-banner"` is NOT present in the DOM

---

### TC-08: Custom one-off amount outside 5–500 range disables the submit button

**AC reference:** AC-5

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- `"Iná suma"` chip clicked; `data-testid="podpora-amount-custom-input"` is visible.
- `"E-mail"`, `"Meno alebo firma"`, and both consents filled correctly.

**When** the user clears the custom amount input and types `4` (below minimum of 5)
**Then** `data-testid="podpora-submit-button"` is disabled
**and** `data-testid="podpora-amount-custom-input"` has `aria-invalid="true"`
**When** the user clears the input and types `501` (above maximum of 500)
**Then** `data-testid="podpora-submit-button"` is disabled
**and** `data-testid="podpora-amount-custom-input"` has `aria-invalid="true"`

---

### TC-09: Sponsor opt-in section is hidden by default; "Zobrazované meno" becomes required when expanded

**AC reference:** AC-8

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- Amount `25 €` selected, email and name filled, both consents ticked.

**When** the page loads
**Then** the `"Zobrazované meno"` field is NOT present in the DOM (sponsor section is collapsed)
**When** the user ticks `data-testid="podpora-checkbox-show-in-list"` (labelled `"Chcem byť na zozname sponzorov (/sponsors)"`)
**Then** the sponsor sub-panel becomes visible, showing inputs for `"Zobrazované meno"`, `"Odkaz (https://, voliteľné)"`, and textarea `"Krátka správa (voliteľné)"`
**and** `data-testid="podpora-submit-button"` becomes disabled (because `displayName` is empty and `displayValid` is false)

---

## Edge cases

### TC-10: No preset amount is pre-selected on load — all chips equally prominent

**AC reference:** AC-13

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- No URL params; fresh session; no localStorage influence.

**When** the page finishes loading
**Then** all six one-off amount chips (`data-testid="podpora-amount-5"` through `data-testid="podpora-amount-custom"`) have `aria-checked="false"`
**and** `data-testid="podpora-submit-button"` is disabled (confirming no amount is silently pre-selected)

---

### TC-11: Switching mode resets amount selection

**AC reference:** AC-3, AC-4

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.

**When** the user clicks `data-testid="podpora-amount-50"` to select `50 €` in one-off mode
**and** then clicks `data-testid="podpora-mode-monthly"` to switch to monthly
**Then** no monthly chip has `aria-checked="true"` (selection is cleared)
**and** `data-testid="podpora-submit-button"` is disabled
**When** the user switches back to `data-testid="podpora-mode-oneoff"`
**Then** no one-off chip has `aria-checked="true"` either (the reset persists across mode switches)

---

### TC-12: "Zobraziť ma v päte stránky" checkbox is disabled until amount qualifies

**AC reference:** AC-8

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- `data-testid="podpora-checkbox-show-in-list"` ticked so sponsor sub-panel is visible.

**When** the user selects `10 €` in one-off mode (below the 50 EUR footer threshold)
**Then** `data-testid="podpora-checkbox-show-in-footer"` is rendered with the `disabled` attribute
**and** its label contains the text `"Zobraziť ma v päte (potrebné: jednorazovo ≥ 50 € alebo mesačne ≥ 25 €)"`
**When** the user selects `50 €` in one-off mode
**Then** `data-testid="podpora-checkbox-show-in-footer"` is enabled (no `disabled` attribute)
**and** its label reads `"Zobraziť ma aj v päte stránky"`

---

### TC-13: Display message textarea character counter counts down from 80

**AC reference:** AC-8

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- Sponsor sub-panel visible (`data-testid="podpora-checkbox-show-in-list"` ticked).

**When** the user types a 10-character string into `data-testid="podpora-field-display-message"`
**Then** the counter paragraph below the textarea reads `"70 znakov zostáva"`
**When** the user pastes an 85-character string into the textarea
**Then** the textarea value is truncated to exactly 80 characters
**and** the counter reads `"0 znakov zostáva"`

---

### TC-14: Page meta — `robots: index, follow` is set; canonical href ends with `/support`

**AC reference:** AC-1

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.

**When** the page finishes loading
**Then** `<meta name="robots">` has content `"index, follow"` (page is intentionally indexable — not noindex)
**and** `<link rel="canonical">` is present with `href` ending in `/support`
**and** `<meta property="og:title">` content equals `"Podpora projektu — subenai"`
**and** `<meta name="description">` content contains `"jednorazovo alebo mesačne"`

---

### TC-15: Mobile viewport (375×667) — form is fully usable without horizontal overflow

**AC reference:** AC-11, AC-12

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 375×667 (iPhone SE).

**When** the page finishes loading
**Then** `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth` (no horizontal overflow)
**and** the frequency radio group (`data-testid="podpora-mode-oneoff"` and `data-testid="podpora-mode-monthly"`) is visible in a two-column grid without clipping
**and** all one-off preset amount chips wrap naturally within the viewport
**and** the submit button (`data-testid="podpora-submit-button"`) is full-width and its label is fully readable without overflow

---

### TC-16: Tablet viewport (768×1024) — form renders without layout breakage

**AC reference:** AC-11

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 768×1024 (iPad portrait).

**When** the page finishes loading
**Then** the form card (`data-testid="podpora-form"`) is visible and fully within the viewport width
**and** `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth`
**and** the header and footer are both visible

---

### TC-17: Keyboard-only navigation reaches the submit button without a pointer device

**AC reference:** AC-12

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.
- Consent banner dismissed via keyboard before the test starts.
- No mouse interaction.

**When** the user presses Tab from the top of the document until focus reaches `data-testid="podpora-mode-oneoff"` and presses Space to confirm it
**and** tabs to `data-testid="podpora-amount-25"` and presses Space to select it
**and** tabs to `data-testid="podpora-field-email"` and types a valid email address
**and** tabs to `data-testid="podpora-field-name"` and types a valid name
**and** tabs to `data-testid="podpora-checkbox-consent-immediate"` and presses Space to tick it
**and** tabs to `data-testid="podpora-checkbox-consent-data"` and presses Space to tick it
**and** tabs to `data-testid="podpora-submit-button"`
**Then** `data-testid="podpora-submit-button"` has browser focus and is enabled (not disabled)
**and** every interactive element was reachable in document order without a pointer device

---

### TC-18: Footer "Spravovať podporu (sponzori)" link points to `/manage-support`

**AC reference:** AC-12 (accessibility of related flows)

**Prerequisites**:
- Browser at `http://localhost:8788/support`, viewport 1280×800.

**When** the page finishes loading
**Then** the global footer link labelled `"Spravovať podporu (sponzori)"` is visible in the "Právne" footer column
**and** its `href` resolves to `/manage-support`

---

## Open questions

- **`data-testid` audit.** The `<h1>` element and the back-link (`"← Späť na domov"`) do not currently have `data-testid` attributes. The generator should add `data-testid="podpora-heading"` to the `<h1>` and `data-testid="podpora-back-link"` to the back-link `<a>` in `src/routes/support.tsx` before writing TC-01 locators. All other elements used in this plan already have test-ids.
- **`robots` meta value.** The source sets `{ name: "robots", content: "index, follow" }` (no `max-image-preview:large`). TC-14 asserts the exact string `"index, follow"` — confirm this has not been extended since `2026-05-19`.
- **`?cancelled=1` with `cancelled=0`.** `validateSearch` treats only the literal values `"1"` and `1` as truthy. TC-07 covers the happy path and absent param. A future edge-case TC could assert that `?cancelled=0` or `?cancelled=foo` do NOT show the banner — not added here to respect the ~200-line cap.
