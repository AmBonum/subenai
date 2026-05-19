# LocaleSwitcher disabled state — test plan

**Area:** `specs/cross-cutting/`
**Component(s) under test:** `src/components/i18n/LocaleSwitcher.tsx`, `src/i18n/locale-context.tsx`
**Routes:** `/`, `/app` (any authenticated sub-route), `/admin` (any admin sub-route)
**API endpoints:** None — purely client-side state.
**Data dependencies:** `localStorage["subenai.locale"]` (STORAGE_KEY); `LOCALE_SWITCHER_ENABLED` compile-time flag in `LocaleSwitcher.tsx`.
**Source stories:** _None — task #45 "UX: locale disable + responsive logo" (2026-05-19); intent inferred from `src/components/i18n/LocaleSwitcher.tsx` + the `LOCALE_SWITCHER_ENABLED = false` constant added in that task._
**Last updated:** 2026-05-19

---

## Context

The subenai UI ships trilingual infrastructure (sk / en / cs bundles, resolver, lazy-loaded locale JSON), but user-visible locale switching is intentionally disabled while copy and UX research are finalised. `LocaleSwitcher` returns `null` when `LOCALE_SWITCHER_ENABLED = false`, so no globe button, no dropdown, and no "SK" label appear anywhere in the UI. The lock is enforced in two places: the feature flag in `LocaleSwitcher.tsx` and the short-circuited `readInitialLocale()` in `locale-context.tsx` that always returns `"sk"` regardless of `localStorage`. This plan is a regression guard: an accidental re-enable of the dropdown (e.g. flipping the flag to `true` during a merge conflict resolution) would ship incomplete en/cs copy to all users.

## Existing `data-testid` inventory

The following testids are declared inside `LocaleSwitcher` but are **unreachable while the flag is off** (they live after the early `return null`):
- `locale-switcher-trigger`
- `locale-switcher-current`
- `locale-switcher-menu`
- `locale-switcher-option-sk`, `locale-switcher-option-en`, `locale-switcher-option-cs`

Slot wrappers that are always rendered (the parent component renders them even when the switcher returns `null`):
- `data-testid="header-mobile-locale"` — `SiteHeader` mobile sheet footer div
- `data-testid="admin-shell-sidebar-locale"` — `AdminSidebar` footer div

**ADD-testid follow-ups** (no source edits in this plan):
- The `AppShell` header's `<LocaleSwitcher />` call has no surrounding wrapper testid — add `data-testid="app-shell-header-locale"` on the wrapping `<div>` to make absence assertions reliable.
- The `SiteHeader` desktop `<LocaleSwitcher />` call has no surrounding wrapper testid — add `data-testid="header-desktop-locale"` on the enclosing `<div>`.

## Out of scope

- Testing that en or cs translations are correct or complete — the switcher is disabled; translation quality belongs to a future epic.
- `setLocale` unit-level tests — those are covered in Vitest unit tests for `locale-context.tsx`.
- Cookie-banner locale interaction — separate spec (`specs/consent/`).
- The re-enable path (flipping `LOCALE_SWITCHER_ENABLED = true`) — when the flag is turned on, a new plan covering the enabled picker UX must be created; the present plan's TCs become moot and should be archived.
- Admin sidebar collapse mode (`collapsible="icon"`) — the locale slot is already hidden in that state via `group-data-[collapsible=icon]:hidden`; layout regression is out of scope here.

---

## Happy paths

### TC-01: Public home page renders no locale switcher element in the desktop header

**Prerequisites**:
- Browser navigates to `http://localhost:8080/`.
- No active session (clean localStorage, no `sb-*-auth-token`).
- Viewport 1280×800.

**When** the page finishes loading
**Then** the element `data-testid="locale-switcher-trigger"` does NOT exist in the DOM
**and** the element `data-testid="locale-switcher-menu"` does NOT exist in the DOM
**and** the element `data-testid="locale-switcher-current"` does NOT exist in the DOM
**and** the desktop nav container `data-testid="header-desktop-nav"` is visible and contains no globe icon or language label

### TC-02: Public home page renders no locale switcher in the mobile sheet

**Prerequisites**:
- Browser navigates to `http://localhost:8080/`.
- No active session.
- Viewport 375×667 (iPhone SE).

**When** the user taps the hamburger button `data-testid="header-mobile-trigger"` to open the mobile sheet
**Then** the mobile sheet `data-testid="header-mobile-sheet"` is visible
**and** the wrapper `data-testid="header-mobile-locale"` exists but contains no child elements (it is empty — `LocaleSwitcher` returned `null`)
**and** no element with `data-testid="locale-switcher-trigger"` is present anywhere in the DOM

### TC-03: App shell header renders no locale switcher for an authenticated user

**Prerequisites**:
- A valid educator session is seeded into the browser via `primeAuthSession` (see `e2e/fixtures/auth.ts`).
- `page.route` intercepts on all Supabase profile/notification API calls return minimal valid fixtures.
- Browser navigates to `http://localhost:8080/app`.
- Viewport 1280×800.

**When** the app shell header finishes rendering
**Then** no element with `data-testid="locale-switcher-trigger"` is present inside `data-testid="app-shell-header"`
**and** the user row `data-testid="app-shell-header-user"` and logout button `data-testid="app-shell-header-logout"` are visible (confirms the header rendered correctly)

---

## Negative scenarios

### TC-04: Writing "en" to localStorage before page load does NOT switch the UI locale

**Prerequisites**:
- Browser navigates to `http://localhost:8080/`.
- No active session.
- `localStorage.setItem("subenai.locale", "en")` is executed via `page.evaluate` before navigation completes (or on a fresh page before navigating).
- Viewport 1280×800.

**When** the page finishes loading after `localStorage["subenai.locale"]` is set to `"en"`
**Then** no element with `data-testid="locale-switcher-trigger"` appears (the switcher is still null)
**and** a spot-check of any translated string confirms Slovak copy is rendered (e.g. the header CTA contains no English text — the exact Slovak string is asserted via `data-testid="header-cta-pill"`)

### TC-05: Writing "cs" to localStorage before page load does NOT switch the UI locale

**Prerequisites**:
- Browser navigates to `http://localhost:8080/`.
- No active session.
- `localStorage.setItem("subenai.locale", "cs")` is executed via `page.evaluate` before navigation.
- Viewport 1280×800.

**When** the page finishes loading
**Then** no element with `data-testid="locale-switcher-trigger"` appears
**and** the `data-testid="header-cta-pill"` is visible and renders Slovak copy (not Czech)

### TC-06: Dispatching the "subenai:locale-change" custom event programmatically does NOT render an en/cs switcher

**Prerequisites**:
- Browser navigates to `http://localhost:8080/`.
- No active session.
- Viewport 1280×800.
- The page has finished loading.

**When** `window.dispatchEvent(new CustomEvent("subenai:locale-change", { detail: "en" }))` is executed via `page.evaluate`
**and** the test waits 500 ms for any re-render
**Then** no element with `data-testid="locale-switcher-trigger"` appears in the DOM
**and** no element with `data-testid="locale-switcher-menu"` appears in the DOM

### TC-07: Admin sidebar locale slot is empty — no switcher rendered

**Prerequisites**:
- A valid admin session is seeded (AAL2 TOTP satisfied) via `primeAdminSession` fixture.
- Browser navigates to `http://localhost:8080/admin`.
- Viewport 1280×800 (sidebar not in collapsed/icon mode).

**When** the admin sidebar finishes rendering
**Then** the element `data-testid="admin-shell-sidebar-locale"` exists but contains no child elements (empty slot)
**and** no element with `data-testid="locale-switcher-trigger"` is present anywhere on the page

---

## Edge cases

### TC-08: LocaleSwitcher absence does not break keyboard tab order in the desktop header

**Prerequisites**:
- Browser navigates to `http://localhost:8080/`.
- No active session.
- Viewport 1280×800.

**When** the user presses Tab repeatedly from the start of the document until focus reaches the CTA pill `data-testid="header-cta-pill"`
**Then** focus moves cleanly from the logo link to the mega-menu items to the CTA pill without getting stuck or skipping over an invisible element
**and** at no point does focus land on a non-interactive element (no rogue `tabindex` left by a removed switcher node)

### TC-09: LocaleSwitcher absence does not break keyboard tab order in the mobile sheet

**Prerequisites**:
- Browser navigates to `http://localhost:8080/`.
- No active session.
- Viewport 375×667.

**When** the mobile sheet is opened via `data-testid="header-mobile-trigger"`
**and** the user presses Tab from the close button `data-testid="header-mobile-close"` through all focusable elements until the CTA link `data-testid="header-mobile-cta"`
**Then** no focus trap or dead focus stop occurs at the position where the locale switcher would have appeared (inside `data-testid="header-mobile-locale"`)
**and** focus reaches the CTA link in the expected order

### TC-10: currentLocale module-level value stays "sk" even after a programmatic setLocale call

**Prerequisites**:
- Browser navigates to `http://localhost:8080/`.
- No active session.
- Viewport 1280×800.
- The page has finished loading.

**When** `window.dispatchEvent(new CustomEvent("subenai:locale-change", { detail: "en" }))` is dispatched (simulating what `setLocale("en")` would emit)
**and** `localStorage["subenai.locale"]` is manually set to `"en"` via `page.evaluate`
**and** the page is reloaded
**Then** the module-level `currentLocale` resolves to `"sk"` (because `readInitialLocale()` is locked and ignores `localStorage`)
**and** no element with `data-testid="locale-switcher-trigger"` appears after the reload
**and** Slovak copy remains visible in `data-testid="header-cta-pill"`

### TC-11: Very long string in localStorage locale key does not crash the page

**Prerequisites**:
- Browser navigates to `http://localhost:8080/`.
- No active session.
- `localStorage.setItem("subenai.locale", "a".repeat(10000))` is executed before navigation.
- Viewport 1280×800.

**When** the page finishes loading
**Then** no JavaScript error appears in the console
**and** the page renders normally with `data-testid="header-root"` visible
**and** no element with `data-testid="locale-switcher-trigger"` appears

### TC-12: Invalid locale value in localStorage ("xyz") does not crash the page

**Prerequisites**:
- Browser navigates to `http://localhost:8080/`.
- No active session.
- `localStorage.setItem("subenai.locale", "xyz")` is executed before navigation.
- Viewport 1280×800.

**When** the page finishes loading
**Then** no JavaScript error of level `error` appears in the console (verified via `browser_console_messages`)
**and** the page header `data-testid="header-root"` is visible
**and** no locale switcher trigger appears

### TC-13: LOCALE_SWITCHER_ENABLED flag state is visible as an absence — aria audit confirms no stray role="combobox" or role="listbox"

**Prerequisites**:
- Browser navigates to `http://localhost:8080/`.
- No active session.
- Viewport 1280×800.

**When** an accessibility snapshot of the full page is taken
**Then** no element with `role="menu"` that is a child of the site header is present in the accessibility tree
**and** no element whose accessible name contains `"Jazyk / Language"` appears anywhere in the snapshot (the `aria-label` from the disabled trigger is gone with the element)

### TC-14: Mobile viewport (375×667) — the mobile sheet header section does not show a blank gap where the switcher would have been

**Prerequisites**:
- Browser navigates to `http://localhost:8080/`.
- No active session.
- Viewport 375×667.

**When** the user opens the mobile sheet via `data-testid="header-mobile-trigger"`
**and** a screenshot of the sheet footer area (around `data-testid="header-mobile-locale"`) is captured
**Then** the CTA button `data-testid="header-mobile-cta"` is visually adjacent to the nav links above it with no unexplained whitespace gap between them (the empty locale slot adds no visible vertical space beyond its own zero height)

### TC-15: Feature flag regression — if LOCALE_SWITCHER_ENABLED were flipped to true, the trigger would appear (canary assertion)

**Prerequisites**:
- This TC is a **build-time canary**, not a browser test. It must be implemented as a static analysis / source assertion.
- The assertion reads `src/components/i18n/LocaleSwitcher.tsx` and verifies that the line `const LOCALE_SWITCHER_ENABLED = false;` exists and the value is literally `false`.

**When** the CI pipeline runs the canary check (e.g. `grep -c "LOCALE_SWITCHER_ENABLED = false" src/components/i18n/LocaleSwitcher.tsx`)
**Then** the grep count equals `1` (exactly one occurrence of the locked-off flag)
**and** any deviation (count is 0, or the value is `true`) fails the pipeline and blocks deployment

> **Note:** The generator should implement this as a Playwright `test` that reads the source file via `fs.readFileSync` (Node context, not browser context) and asserts the string. This makes accidental re-enables a CI-breaking event rather than a silent regression.

---

## Open questions

- Should `data-testid="header-desktop-locale"` and `data-testid="app-shell-header-locale"` wrapper divs be added to `SiteHeader.tsx` and `AppShell.tsx` so TC-01 and TC-03 can assert on a stable slot element rather than relying on absence of `locale-switcher-trigger`? (Listed as ADD-testid follow-ups above; requires source edit not done in this plan.)
- When the locale switcher is eventually re-enabled, should this plan be superseded by a new `locale-switcher-enabled.md` or updated in place? Recommendation: create a new plan and delete this one; the semantics are different enough that TCs would need complete rewrites.
- TC-15 (canary) requires the generator to run in Node context — confirm whether the project's Playwright config exposes `__dirname`-based file reads in test scope, or whether a separate shell-script check is preferable.
