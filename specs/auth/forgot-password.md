# Forgot-password page — test plan

**Area:** `specs/auth/`
**Component(s) under test:** `src/routes/forgot-password.tsx`
**Routes:** `/forgot-password`
**API endpoints:** `POST /auth/v1/recover` (called by `supabase.auth.resetPasswordForEmail`)
**Data dependencies:** Supabase Auth user records (email lookup happens server-side; the client never learns whether the address is registered)
**Source stories:** _None — pre-story feature; intent inferred from `src/routes/forgot-password.tsx` + `src/i18n/locales/sk/auth.json`._
**Last updated:** 2026-05-19

---

## Context

The forgot-password page at `/forgot-password` allows a registered subenai user who has lost their password to request a reset link by entering their e-mail address. The page calls `supabase.auth.resetPasswordForEmail`, which contacts `POST /auth/v1/recover`. On any outcome — success or account-not-found — the component deliberately shows the same success state to prevent e-mail enumeration: "Ak účet s týmto e-mailom existuje, do pár minút ti príde odkaz na obnovu." The reset link redirects to `/auth/reset-password`. On a hard server error the component renders a generic Slovak error message and keeps the form in place.

## Out of scope

- The reset-password step at `/auth/reset-password` — separate spec.
- The full e-mail delivery and link-click flow (Supabase transactional e-mail) — cannot be automated end-to-end without a real inbox; verified manually.
- Google OAuth users who have no password — the form sends the request regardless; Supabase handles the rejection silently on its side (no extra client behavior to assert).
- 2FA / TOTP flows — not present on this page.
- Admin-specific routing post-reset — out of scope for this form; handled in the reset-password spec.

---

## Happy paths

### TC-01: Page renders all required UI elements

**Prerequisites**:
- Browser navigates to `http://localhost:8080/forgot-password` with no active session (clean localStorage, no `sb-*-auth-token`).
- Viewport 1280×800.
- Dev server running (`npm run dev`).

**When** the page finishes loading
**Then** the card heading "Zabudnuté heslo" is visible (`data-testid="forgot-heading"`)
**and** the subtitle "Zadaj e-mail a pošleme ti odkaz na obnovu hesla." is visible
**and** the e-mail input is visible and empty (`data-testid="forgot-email-input"`)
**and** the submit button labelled "Poslať odkaz" is visible but disabled because the input is empty (`data-testid="forgot-submit-button"`)
**and** the back-to-login link labelled "Späť na prihlásenie" is visible (`data-testid="forgot-back-to-login"`)
**and** no error element (`data-testid="forgot-error-message"`) is present in the DOM

### TC-02: Valid e-mail address transitions the page to the success state

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password` with no active session.
- A `page.route` intercept on `**/auth/v1/recover**` returns HTTP 200 with an empty JSON body `{}`, simulating Supabase's successful response.
- Viewport 1280×800.

**When** the user types `user@example.com` into the field labelled "E-mail" (`data-testid="forgot-email-input"`)
**and** clicks the button labelled "Poslať odkaz" (`data-testid="forgot-submit-button"`)
**Then** the form element (`data-testid="forgot-form"`) is replaced by the success panel (`data-testid="forgot-success-message"`)
**and** the success panel contains the heading "Skontroluj si e-mail"
**and** the success panel contains the body text "Ak účet s týmto e-mailom existuje, do pár minút ti príde odkaz na obnovu. Skontroluj aj spam — odosielateľ je noreply@subenai.sk."
**and** a back-to-login link labelled "Späť na prihlásenie" is visible inside the success panel (`data-testid="forgot-success-to-login"`)

### TC-03: The redirectTo parameter in the Supabase call points to /auth/reset-password

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password` with no active session.
- A `page.route` intercept on `**/auth/v1/recover**` captures the request body before returning HTTP 200.
- Viewport 1280×800.

**When** the user enters any syntactically valid e-mail and clicks "Poslať odkaz"
**Then** the captured POST body contains a `gotrue_meta_security` or top-level `redirect_to` value whose path component is `/auth/reset-password`
**and** the origin in that value matches `window.location.origin` (e.g. `http://localhost:8080`)

---

## Negative scenarios

### TC-04: Supabase returns a server error — generic error message shown, form kept in place

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password` with no active session.
- A `page.route` intercept on `**/auth/v1/recover**` returns HTTP 500 with any body.
- Viewport 1280×800.

**When** the user types a valid e-mail into `data-testid="forgot-email-input"`
**and** clicks "Poslať odkaz"
**Then** the error element (`data-testid="forgot-error-message"`) becomes visible with the exact text "Žiadosť zlyhala. Skús to znovu."
**and** the form (`data-testid="forgot-form"`) remains in the DOM (no transition to the success state)
**and** the browser URL stays at `/forgot-password`

### TC-05: Submit button is disabled while the field is empty

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password` with no active session.
- Viewport 1280×800.

**When** the e-mail field is empty (initial state, no input typed)
**Then** the button `data-testid="forgot-submit-button"` has the `disabled` attribute
**and** clicking it does not dispatch a request to `**/auth/v1/recover**`

### TC-06: Back-to-login link navigates to /login

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password` with no active session.
- Viewport 1280×800.

**When** the user clicks the link labelled "Späť na prihlásenie" (`data-testid="forgot-back-to-login"`)
**Then** the browser navigates to `/login`

### TC-07: Typing a single character enables the submit button

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password` with no active session.
- Viewport 1280×800.

**When** the user types the single character `a` into `data-testid="forgot-email-input"`
**Then** the button `data-testid="forgot-submit-button"` no longer has the `disabled` attribute
**and** the button label reads "Poslať odkaz" (not the in-flight label "Posielam...")

---

## Edge cases

### TC-08: Button label changes to "Posielam..." while the request is in flight

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password` with no active session.
- A `page.route` intercept on `**/auth/v1/recover**` delays the response by 500 ms before returning HTTP 200.
- Viewport 1280×800.

**When** the user types a valid e-mail and clicks "Poslať odkaz"
**Then** within 100 ms the button label changes to "Posielam..."
**and** the button has the `disabled` attribute for the duration of the in-flight request
**and** after the response arrives the page transitions to the success panel (`data-testid="forgot-success-message"`)

### TC-09: Double-clicking submit does not send two requests

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password` with no active session.
- A `page.route` intercept on `**/auth/v1/recover**` delays the response by 300 ms then returns HTTP 200.
- The e-mail field contains a valid address.
- Viewport 1280×800.

**When** the user double-clicks "Poslať odkaz" rapidly
**Then** exactly one request reaches `**/auth/v1/recover**`
**and** the button is disabled during the in-flight period, preventing the second click from firing

### TC-10: E-mail with leading and trailing whitespace is trimmed before submission

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password` with no active session.
- A `page.route` intercept on `**/auth/v1/recover**` captures the request body and returns HTTP 200.
- Viewport 1280×800.

**When** the user types `  test@example.com  ` (two leading and two trailing spaces) into the e-mail field
**and** clicks "Poslať odkaz"
**Then** the captured POST body contains `"email":"test@example.com"` with no surrounding whitespace
**and** the page transitions to the success panel

### TC-11: Non-registered e-mail address still shows the success state (no enumeration)

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password` with no active session.
- A `page.route` intercept on `**/auth/v1/recover**` returns HTTP 200 (Supabase returns 200 even for unknown addresses).
- Viewport 1280×800.

**When** the user submits an address that does not belong to any account (e.g. `nobody-registered@example.com`)
**Then** the success panel (`data-testid="forgot-success-message"`) appears with the same body text as TC-02
**and** no element in the DOM reveals that the account does not exist

### TC-12: XSS payload in the e-mail field does not execute

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password` with no active session.
- A `page.route` intercept on `**/auth/v1/recover**` returns HTTP 500 to trigger the error message render path.
- Viewport 1280×800.

**When** the user types `<script>window.__xss=1</script>` into the e-mail field
**and** submits the form
**Then** `window.__xss` is `undefined` in the page context (the script tag did not execute)
**and** the error element (`data-testid="forgot-error-message"`) renders the Slovak text "Žiadosť zlyhala. Skús to znovu." as plain text, not injected HTML

### TC-13: Network abort during submit shows the generic error and re-enables the button

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password` with no active session.
- A `page.route` intercept on `**/auth/v1/recover**` calls `route.abort()` to simulate an offline condition.
- The e-mail field contains a valid address.
- Viewport 1280×800.

**When** the user clicks "Poslať odkaz" and the network request is aborted
**Then** the error element (`data-testid="forgot-error-message"`) shows "Žiadosť zlyhala. Skús to znovu."
**and** the submit button returns to its enabled, non-loading state (the `finally` block clears `submitting`)
**and** the form remains visible (no transition to the success panel)

### TC-14: Keyboard-only user can submit the form without a mouse

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password` with no active session.
- A `page.route` intercept on `**/auth/v1/recover**` returns HTTP 200.
- Viewport 1280×800.

**When** the user tabs to the e-mail field and types a valid address
**and** presses Tab to move focus to the "Poslať odkaz" button
**and** presses Enter to activate the button
**Then** a request is dispatched to `**/auth/v1/recover**`
**and** the page transitions to the success panel (`data-testid="forgot-success-message"`)

### TC-15: Success-state back-to-login link navigates to /login

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password` that has already reached the success state (via a mocked HTTP 200 response as in TC-02).
- Viewport 1280×800.

**When** the user clicks the link labelled "Späť na prihlásenie" inside the success panel (`data-testid="forgot-success-to-login"`)
**Then** the browser navigates to `/login`

### TC-16: Mobile viewport (375×667) keeps the card inside the viewport

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password` with no active session.
- Viewport 375×667 (iPhone SE).

**When** the page finishes loading
**Then** the card element (`data-testid="forgot-card"`) is fully within the viewport width (no horizontal overflow)
**and** the e-mail input, submit button, and back-to-login link are all visible without horizontal scrolling

### TC-17: Page is indexed with noindex,nofollow

**Prerequisites**:
- Browser at `http://localhost:8080/forgot-password`.
- Viewport 1280×800.

**When** the page finishes loading
**Then** the `<meta name="robots">` tag in `<head>` contains `noindex,nofollow`
**and** the page `<title>` is "Zabudnuté heslo · SubenAI"

---

## Open questions

- Should `/forgot-password` redirect already-authenticated users away (e.g. to `/app`) via a `beforeLoad` guard? Currently it does not — an authenticated user can visit the page and submit a request. If a guard is added, TC-01 through TC-13 must add a prerequisite asserting no active session, and a new TC must verify the redirect.
- The `page.route` intercept for `**/auth/v1/recover**` is the correct Supabase endpoint for `resetPasswordForEmail`. Confirm with the generator that the Supabase JS client does not proxy this through a different path in the local dev configuration (e.g. `http://localhost:54321/auth/v1/recover`).
