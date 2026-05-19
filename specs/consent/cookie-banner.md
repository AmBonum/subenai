# Cookie consent banner — test plan

**Area:** `specs/consent/`
**Component(s) under test:** `src/components/consent/ConsentBanner.tsx`, `src/components/consent/ConsentPreferencesDialog.tsx`, `src/hooks/useConsent.tsx`, `src/lib/consent.ts`
**Routes:** `/` (banner renders site-wide; tested at the home route)
**API endpoints:** None — consent is pure client-side localStorage
**Data dependencies:** `localStorage["iiq_consent"]` (key constant `CONSENT_STORAGE_KEY`); `CONSENT_VERSION = "1.5.0"` in `src/lib/consent.ts`
**Source stories:** `tasks/stories/E1.1-consent-link-closes-dialog.md`, `tasks/stories/E10.5-privacy-consent-bump.md`
**Last updated:** 2026-05-19

---

## Context

The cookie consent banner is a GDPR-compliant, ePrivacy-aligned first-visit notice rendered at the bottom of every public subenai page. It appears whenever `localStorage["iiq_consent"]` is absent or holds a record whose `version` field does not match the current `CONSENT_VERSION` constant. The user can accept all four storage categories ("Prijať všetko"), reject all non-essential ones ("Odmietnuť všetko"), or open a granular preferences dialog ("Nastavenia"). The four categories are: `necessary` (always on, locked), `preferences`, `analytics`, `marketing`. A regression introduced by the Phase 0 consent-drift fix means this spec also protects the invariant that a correctly versioned record fully suppresses the banner. Because other specs use `primeConsent` from `e2e/fixtures/consent.ts` to bypass the banner, **this spec must NOT call `primeConsent`** — it needs the banner to actually render.

## Out of scope

- The `/cookies` and `/privacy` static content pages — their copy is separate from the banner's runtime behaviour.
- Google Tag Manager firing / suppression — analytics integration is tested in the analytics consent-gating spec.
- The `/podpora` Stripe-cookie context-specific consent (E10.5 AC-5) — covered by `specs/sponsorship/podpora-donate-flow.md`.
- Server-side rendering hydration consistency — SSR suppresses the banner deterministically; mismatch detection is a unit-test concern.
- The footer "Nastavenia cookies" trigger opening the same dialog — covered by `specs/cross-cutting/site-footer.md`.
- Any post-consent state change that requires a DB call (the banner is fully client-side).

---

## Happy paths

### TC-01: Banner renders on first visit with no localStorage record

**AC reference:** (E10.5 AC-4 — banner appears when no prior decision exists)

**Prerequisites**:
- Browser context with `localStorage` fully cleared (no `iiq_consent` key).
- `primeConsent` fixture is NOT used.
- Dev server running at `http://localhost:8080`.
- Viewport 1280×800.

**When** the browser navigates to `http://localhost:8080/`
**Then** after hydration the `[role="dialog"]` consent banner is visible in the viewport
**and** the banner contains the heading "🍪 Cookies a súkromie"
**and** the badge labelled "aktualizované" is visible alongside the heading
**and** the three action buttons "Nastavenia", "Odmietnuť všetko", and "Prijať všetko" are all visible without scrolling
**and** links to "/cookies" and "/privacy" are present in the banner description

### TC-02: "Prijať všetko" accepts all categories and dismisses the banner

**AC reference:** (E10.5 AC-4)

**Prerequisites**:
- Browser context with `localStorage` fully cleared.
- `primeConsent` fixture is NOT used.
- Browser at `http://localhost:8080/`.
- Banner is visible (verified via TC-01 flow).
- Viewport 1280×800.

**When** the user clicks the button labelled "Prijať všetko"
**Then** the banner `[role="dialog"]` disappears from the DOM
**and** `localStorage["iiq_consent"]` is a valid JSON object with `version === "1.5.0"`
**and** `categories.necessary === true`
**and** `categories.preferences === true`
**and** `categories.analytics === true`
**and** `categories.marketing === true`
**and** `timestamp` is a valid ISO 8601 UTC string within 5 seconds of the click

### TC-03: "Odmietnuť všetko" sets only necessary and dismisses the banner

**Prerequisites**:
- Browser context with `localStorage` fully cleared.
- `primeConsent` fixture is NOT used.
- Browser at `http://localhost:8080/`.
- Banner is visible.
- Viewport 1280×800.

**When** the user clicks the button labelled "Odmietnuť všetko"
**Then** the banner disappears from the DOM
**and** `localStorage["iiq_consent"]` has `categories.necessary === true`
**and** `categories.preferences === false`
**and** `categories.analytics === false`
**and** `categories.marketing === false`
**and** `version === "1.5.0"`

### TC-04: "Nastavenia" opens the preferences dialog

**Prerequisites**:
- Browser context with `localStorage` fully cleared.
- `primeConsent` fixture is NOT used.
- Browser at `http://localhost:8080/`.
- Banner is visible.
- Viewport 1280×800.

**When** the user clicks the button labelled "Nastavenia"
**Then** a Radix dialog with heading "Nastavenia cookies" appears
**and** four category rows are visible: "Nevyhnutné", "Predvoľby", "Analytika", "Marketing"
**and** the "Nevyhnutné" row's switch is checked and carries the `disabled` attribute
**and** the switches for "Predvoľby", "Analytika", and "Marketing" are unchecked and interactive
**and** the banner beneath the dialog remains in the DOM (it is not dismissed by opening preferences)

---

## Negative scenarios

### TC-05: Banner does NOT appear when a valid same-version record is in localStorage

**Prerequisites**:
- Browser context with `localStorage` pre-seeded (via `page.evaluate` before navigation) with a valid `iiq_consent` record: `version = "1.5.0"`, `timestamp` any recent ISO string, all four categories set to `true`.
- `primeConsent` fixture is NOT used (the record is set manually to isolate the version-match logic).
- Browser navigates to `http://localhost:8080/`.
- Viewport 1280×800.

**When** the page finishes hydrating
**Then** the element `[role="dialog"]` for the consent banner is absent from the DOM
**and** no banner heading "🍪 Cookies a súkromie" is visible

### TC-06: Banner reappears when the stored version does not match CONSENT_VERSION

**AC reference:** AC-4 (E10.5)
**Risk reference:** "Banner re-shownutie nahnevá user-ov"

**Prerequisites**:
- Browser context with `localStorage` pre-seeded with a `iiq_consent` record where `version = "1.0.0"` (an old version that does not equal `"1.5.0"`).
- All category values set to `true` in that stale record.
- Browser at `http://localhost:8080/`.
- Viewport 1280×800.

**When** the page finishes hydrating
**Then** the consent banner `[role="dialog"]` is visible (the stale version triggers re-consent)
**and** the banner heading "🍪 Cookies a súkromie" is visible
**and** the "aktualizované" badge is visible

### TC-07: Closing the preferences dialog via the "X" button does not save any decision

**AC reference:** AC-3 (E1.1 — draft is discarded on close without save)

**Prerequisites**:
- Browser context with `localStorage` fully cleared.
- `primeConsent` fixture is NOT used.
- Browser at `http://localhost:8080/`.
- Banner is visible. The user has clicked "Nastavenia" and the dialog is open.
- The user has toggled "Analytika" to `true` inside the dialog (draft state only).
- Viewport 1280×800.

**When** the user closes the dialog via its close button (or the Escape key) without clicking "Uložiť výber"
**Then** the dialog closes and returns `[role="dialog"]` to absent
**and** `localStorage["iiq_consent"]` remains absent (no partial record is written)
**and** the banner is still visible (no decision was saved)

### TC-08: Clicking the "/cookies" link inside the preferences dialog closes the dialog

**AC reference:** AC-1 (E1.1)

**Prerequisites**:
- Browser context with `localStorage` fully cleared.
- `primeConsent` fixture is NOT used.
- Browser at `http://localhost:8080/`.
- Banner is visible. The preferences dialog is open (user clicked "Nastavenia").
- Viewport 1280×800.

**When** the user clicks the link labelled "zásadách cookies" inside the dialog
**Then** the dialog (`[role="dialog"]`) is absent from the DOM (it closed synchronously with navigation)
**and** the browser navigates to `/cookies`
**and** no focus is trapped on the now-navigated page (focus is on the new document body or the first focusable element on `/cookies`)

### TC-09: Clicking the "/privacy" link inside the preferences dialog closes the dialog

**AC reference:** AC-2 (E1.1)

**Prerequisites**:
- Browser context with `localStorage` fully cleared.
- `primeConsent` fixture is NOT used.
- Browser at `http://localhost:8080/`.
- Banner is visible. The preferences dialog is open.
- Viewport 1280×800.

**When** the user clicks the link labelled "zásadách ochrany súkromia" inside the dialog
**Then** the dialog is absent from the DOM
**and** the browser navigates to `/privacy`

### TC-10: Malformed JSON in localStorage is treated as absent and banner shows

**Prerequisites**:
- Browser context with `localStorage` pre-seeded: `localStorage.setItem("iiq_consent", "NOT_VALID_JSON")`.
- Browser at `http://localhost:8080/`.
- Viewport 1280×800.

**When** the page finishes hydrating
**Then** the consent banner `[role="dialog"]` is visible
**and** no JavaScript error appears in the browser console (the `try/catch` in `loadConsent` silently handles it)

---

## Edge cases

### TC-11: Persisted decision survives navigation to a different route

**Prerequisites**:
- Browser context with `localStorage` fully cleared.
- `primeConsent` fixture is NOT used.
- Banner is visible at `http://localhost:8080/`.
- The user clicks "Prijať všetko"; the banner disappears.
- Viewport 1280×800.

**When** the user navigates to `http://localhost:8080/skolenia` (client-side routing)
**and** then navigates back to `http://localhost:8080/` via the browser back button
**Then** the consent banner does NOT reappear on either route
**and** `localStorage["iiq_consent"].version` is still `"1.5.0"`

### TC-12: Dialog draft is reset to persisted state on re-open after a save

**AC reference:** AC-3 (E1.1 — draft is reloaded from persisted record on open)

**Prerequisites**:
- Browser context with `localStorage` fully cleared.
- `primeConsent` fixture is NOT used.
- Browser at `http://localhost:8080/`.
- The user has opened preferences, toggled "Analytika" to `true`, and clicked "Uložiť výber" (dialog closes; `iiq_consent` is written with `analytics: true`).
- Viewport 1280×800.

**When** the user re-opens preferences via the footer "Nastavenia cookies" button
**Then** the "Analytika" switch is checked (the persisted `analytics: true` is the initial draft state)
**and** the "Nevyhnutné" switch is checked and still disabled

### TC-13: Saving a custom selection from the dialog writes exactly the chosen categories

**Prerequisites**:
- Browser context with `localStorage` fully cleared.
- `primeConsent` fixture is NOT used.
- Browser at `http://localhost:8080/`.
- Preferences dialog is open.
- All non-necessary switches start unchecked.
- Viewport 1280×800.

**When** the user toggles only the "Analytika" switch to `true`
**and** clicks the button labelled "Uložiť výber"
**Then** the dialog closes
**and** the banner disappears
**and** `localStorage["iiq_consent"]` has `categories.analytics === true`
**and** `categories.preferences === false`
**and** `categories.marketing === false`
**and** `categories.necessary === true`

### TC-14: The "Nevyhnutné" switch cannot be toggled by clicking it

**Prerequisites**:
- Browser context with `localStorage` fully cleared.
- `primeConsent` fixture is NOT used.
- Browser at `http://localhost:8080/`.
- Preferences dialog is open.
- Viewport 1280×800.

**When** the user clicks the switch for the "Nevyhnutné" category
**Then** the switch remains checked (value does not change)
**and** no JavaScript error fires
**and** `localStorage["iiq_consent"]` (if any prior save exists) still has `necessary: true`

### TC-15: Banner and dialog are fully operable keyboard-only (a11y)

**Prerequisites**:
- Browser context with `localStorage` fully cleared.
- `primeConsent` fixture is NOT used.
- Browser at `http://localhost:8080/`.
- Banner is visible.
- Viewport 1280×800.

**When** the user tabs to the "Nastavenia" button and activates it via Enter
**and** navigates the four category switches via Tab and toggles "Analytika" via Space
**and** tabs to "Uložiť výber" and presses Enter
**Then** the dialog closes and the banner disappears
**and** `localStorage["iiq_consent"]` has `analytics: true` and `marketing: false`
**and** focus returns to a visible element on the page (no focus lost)

### TC-16: Mobile viewport (375×667) — all three banner buttons visible without horizontal scroll

**Prerequisites**:
- Browser context with `localStorage` fully cleared.
- `primeConsent` fixture is NOT used.
- Viewport 375×667 (iPhone SE portrait).
- Browser at `http://localhost:8080/`.

**When** the page finishes hydrating and the banner is visible
**Then** the buttons "Nastavenia", "Odmietnuť všetko", and "Prijať všetko" are all within the visible viewport
**and** the page has no horizontal scrollbar (no overflow-x on the banner container)
**and** tapping "Prijať všetko" (touch event) dismisses the banner and writes a valid `iiq_consent` record

### TC-17: Double-clicking "Prijať všetko" writes localStorage exactly once

**Prerequisites**:
- Browser context with `localStorage` fully cleared.
- `primeConsent` fixture is NOT used.
- Browser at `http://localhost:8080/`.
- Banner is visible.
- Viewport 1280×800.

**When** the user double-clicks the button labelled "Prijať všetko" within 100 ms
**Then** `localStorage["iiq_consent"]` contains exactly one record (not two serialized back-to-back writes resulting in a corrupt value)
**and** the banner disappears after the first click

### TC-18: Record with missing categories field is treated as absent

**Prerequisites**:
- Browser context with `localStorage` pre-seeded: `localStorage.setItem("iiq_consent", JSON.stringify({ version: "1.5.0", timestamp: new Date().toISOString() }))` — `categories` key is omitted.
- Browser at `http://localhost:8080/`.
- Viewport 1280×800.

**When** the page finishes hydrating
**Then** `loadConsent()` returns `null` (the defensive guard in `src/lib/consent.ts` rejects the malformed record)
**and** the consent banner `[role="dialog"]` is visible

### TC-19: localStorage quota exceeded silently degrades — banner reappears on next load

**Prerequisites**:
- Browser context with `localStorage` cleared.
- `primeConsent` fixture is NOT used.
- A `page.evaluate` override replaces `localStorage.setItem` with a function that throws `DOMException: QuotaExceededError` before the banner is shown.
- Browser at `http://localhost:8080/`.
- Viewport 1280×800.

**When** the user clicks "Prijať všetko"
**and** the `setItem` call throws `QuotaExceededError`
**Then** no uncaught JavaScript exception surfaces in the console (the `try/catch` in `saveConsent` silences it)
**and** on a subsequent page reload (without the override) the banner reappears because no record was persisted

### TC-20: Dialog re-opens correctly after a previous "Odmietnuť všetko" from within the dialog

**Prerequisites**:
- Browser context with `localStorage` fully cleared.
- `primeConsent` fixture is NOT used.
- Browser at `http://localhost:8080/`.
- The user opened preferences, then clicked the "Odmietnuť všetko" button inside the dialog (this saves `ALL_REJECTED` and closes the dialog + banner).
- Viewport 1280×800.

**When** the user opens preferences via the footer "Nastavenia cookies" button
**Then** the dialog opens with all non-necessary switches unchecked (the draft is seeded from the persisted `ALL_REJECTED` record)
**and** no banner is visible behind the dialog (the previous rejection was a valid decision)

---

## Open questions

- The `ConsentBanner.tsx` source does not carry `data-testid` attributes on its root element or buttons — the POM `e2e/poms/shared/ConsentBanner.ts` currently walks the DOM via `#consent-banner-title` ancestor traversal rather than a stable testid. The generator should add `data-testid="consent-banner-root"`, `data-testid="consent-banner-accept-all"`, `data-testid="consent-banner-reject-all"`, and `data-testid="consent-banner-settings"` to `ConsentBanner.tsx` in the same PR as the spec, and update the POM accordingly.
- TC-19 (quota exceeded) is marked as a degraded-mode edge case. Confirm with product whether a visible toast error is preferable to silent degradation, as the current `saveConsent` implementation swallows the exception with a comment.
- The story E10.5 references a `CONSENT_VERSION` bump from `1.1.0` to `1.2.0`; the live source is at `1.5.0`. TC-06 uses `1.0.0` as the stale version to keep it version-agnostic. If the test fixture needs to import `CONSENT_VERSION` directly from `src/lib/consent.ts` (as `primeConsent` already does), the generator should do so — and TC-06's Prerequisites should note the import.
