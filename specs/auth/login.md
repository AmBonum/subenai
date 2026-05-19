# Login page — test plan

**Area:** `specs/auth/`
**Component(s) under test:** `src/routes/login.tsx`, `src/lib/auth/post-login-redirect.ts`, `src/integrations/supabase/auth-middleware.ts`
**Routes:** `/login`, `/login?reset=1`
**API endpoints:** `POST /auth/v1/token` (Supabase `signInWithPassword`), `POST /auth/v1/authorize` (Supabase `signInWithOAuth`)
**Data dependencies:** `profile_preferences` table (read by `requireSupabaseAuth` to gate `/app` onboarding redirect); Supabase Auth user records
**Source stories:** _None — pre-story feature; intent inferred from `src/routes/login.tsx` + `src/lib/auth/post-login-redirect.ts`._
**Last updated:** 2026-05-19

---

## Context

The login page at `/login` is the primary authentication entry point for registered subenai users. An unauthenticated visitor enters their email and password, or continues via Google OAuth. On success, `decidePostLoginTarget` inspects whether the user is an admin (requiring AAL2 TOTP) or a regular user (optionally needing onboarding), and routes accordingly. The page also handles the post-reset banner (`?reset=1`) and a OAuth-collision hint when a password attempt fails on a Google-only account.

## Out of scope

- 2FA enrollment (`/login/enroll-2fa`) and verification (`/login/verify-2fa`) — separate spec.
- Google OAuth provider redirect end-to-end (Playwright cannot exercise the real Google OAuth consent screen; the button click and the `signInWithOAuth` call shape are verified instead).
- Password reset flow (`/forgot-password`, `/auth/reset-password`) — separate spec.
- Admin post-login routing (`/admin`, `/login/verify-2fa`) — the decision tree is unit-tested; only the non-admin happy path is exercised end-to-end here.
- Supabase email confirmation flow (magic link, `auth/callback`) — separate spec.
- Onboarding form content — only the redirect target is asserted.

---

## Happy paths

### TC-01: Page renders all expected UI elements

**Prerequisites**:
- Browser navigates to `http://localhost:8080/login` with no active session (clean localStorage, no `sb-*-auth-token`).
- Viewport 1280×800.
- Dev server running (`npm run dev`).

**When** the page finishes loading
**Then** the card heading with text "Prihlásenie" is visible (`data-testid="login-heading"`)
**and** the email input is visible (`data-testid="login-email-input"`)
**and** the password input is visible (`data-testid="login-password-input"`)
**and** the submit button labelled "Prihlásiť sa" is visible but disabled (`data-testid="login-submit-button"`)
**and** the Google OAuth button labelled "Pokračovať cez Google" is visible (`data-testid="login-google-button"`)
**and** the forgot-password link labelled "Zabudli ste heslo?" is visible (`data-testid="login-forgot-password"`)
**and** the sign-up link labelled "Vytvoriť účet" is visible (`data-testid="login-to-signup"`)

### TC-02: Valid credentials redirect a regular user to /app

**Prerequisites**:
- Browser at `http://localhost:8080/login` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` returns a successful `EDUCATOR_SESSION` fixture (see `e2e/fixtures/auth.ts`).
- A `page.route` intercept on `**/rest/v1/rpc/has_role**` returns `false` (non-admin).
- A `page.route` intercept on `**/rest/v1/profile_preferences**` returns a row with `onboarded_at` set (non-null).
- Viewport 1280×800.

**When** the user types a valid email address into the field labelled "E-mail" (`data-testid="login-email-input"`)
**and** types the corresponding password into the field labelled "Heslo" (`data-testid="login-password-input"`)
**and** clicks the button labelled "Prihlásiť sa" (`data-testid="login-submit-button"`)
**Then** the browser navigates to `/app`
**and** no error element with `data-testid="login-error-message"` appears

### TC-03: Valid credentials redirect an un-onboarded user to /app/onboarding

**Prerequisites**:
- Browser at `http://localhost:8080/login` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` returns a successful `EDUCATOR_SESSION` fixture.
- A `page.route` intercept on `**/rest/v1/rpc/has_role**` returns `false` (non-admin).
- A `page.route` intercept on `**/rest/v1/profile_preferences**` returns `null` (no row — `onboarded_at` absent).
- Viewport 1280×800.

**When** the user fills in valid credentials and clicks "Prihlásiť sa"
**Then** the browser navigates to `/app/onboarding`
**and** no error element appears

---

## Negative scenarios

### TC-04: Wrong credentials show the invalid-credentials error message

**Prerequisites**:
- Browser at `http://localhost:8080/login` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` returns HTTP 400 with body `{"error":"invalid_grant","error_description":"Invalid login credentials"}`.
- Viewport 1280×800.

**When** the user fills in an email and a password that do not match any account
**and** clicks "Prihlásiť sa"
**Then** the error element (`data-testid="login-error-message"`) becomes visible with text "Neplatný e-mail alebo heslo."
**and** the OAuth-collision hint panel (`data-testid="login-oauth-collision"`) is visible, containing the text "Tento e-mail je zaregistrovaný cez Google."
**and** the browser URL remains `/login`

### TC-05: Server error (500) shows the generic error message

**Prerequisites**:
- Browser at `http://localhost:8080/login` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` returns HTTP 500.
- Viewport 1280×800.

**When** the user fills in any email and password
**and** clicks "Prihlásiť sa"
**Then** the error element (`data-testid="login-error-message"`) shows "Prihlásenie zlyhalo. Skús to znovu."
**and** the OAuth-collision hint panel is NOT visible
**and** the browser URL remains `/login`

### TC-06: Submit button stays disabled while either field is empty

**Prerequisites**:
- Browser at `http://localhost:8080/login` with no active session.
- Viewport 1280×800.

**When** the email field contains a value but the password field is empty
**Then** the button `data-testid="login-submit-button"` has the `disabled` attribute
**and** clicking it does not trigger a network request to `/auth/v1/token`

### TC-07: Forgot-password link navigates to /forgot-password

**Prerequisites**:
- Browser at `http://localhost:8080/login` with no active session.
- Viewport 1280×800.

**When** the user clicks the link labelled "Zabudli ste heslo?" (`data-testid="login-forgot-password"`)
**Then** the browser navigates to `/forgot-password`

### TC-08: Sign-up link navigates to /signup

**Prerequisites**:
- Browser at `http://localhost:8080/login` with no active session.
- Viewport 1280×800.

**When** the user clicks the link labelled "Vytvoriť účet" (`data-testid="login-to-signup"`)
**Then** the browser navigates to `/signup`

---

## Edge cases

### TC-09: Post-reset banner appears when ?reset=1 is present in the URL

**Prerequisites**:
- Browser navigates to `http://localhost:8080/login?reset=1` with no active session.
- Viewport 1280×800.

**When** the page finishes loading
**Then** the status element `data-testid="login-reset-success-banner"` is visible
**and** it contains the text "Heslo zmenené — môžeš sa prihlásiť."
**and** the same banner is NOT visible when navigating to `/login` without the query parameter

### TC-10: Google OAuth button click triggers signInWithOAuth with the correct provider

**Prerequisites**:
- Browser at `http://localhost:8080/login` with no active session.
- A `page.route` intercept on `**/auth/v1/authorize**` captures the outbound request without completing the redirect.
- Viewport 1280×800.

**When** the user clicks the button labelled "Pokračovať cez Google" (`data-testid="login-google-button"`)
**Then** a request to Supabase `/auth/v1/authorize` is intercepted with `provider=google` in the query string
**and** `redirectTo` contains `/auth/callback` (the registered OAuth callback path)

### TC-11: Double-clicking the submit button does not send two auth requests

**Prerequisites**:
- Browser at `http://localhost:8080/login` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` delays the response by 300 ms then returns a successful session.
- Both email and password fields are filled with valid-looking values.
- Viewport 1280×800.

**When** the user double-clicks "Prihlásiť sa" rapidly
**Then** exactly one request reaches `**/auth/v1/token**`
**and** the button is disabled for the duration of the in-flight request (`submitting` state)

### TC-12: Email with leading and trailing whitespace is trimmed before submission

**Prerequisites**:
- Browser at `http://localhost:8080/login` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` captures the request body.
- Viewport 1280×800.

**When** the user types `  user@example.com  ` (leading and trailing spaces) into the email field
**and** fills in a password and submits
**Then** the captured request body contains `"email":"user@example.com"` (trimmed, no surrounding spaces)

### TC-13: OAuth-collision Google button in the hint panel re-uses the same onGoogle handler

**Prerequisites**:
- Browser at `http://localhost:8080/login` with no active session.
- A `page.route` on `**/auth/v1/token**` returns HTTP 400 (invalid credentials) causing the collision hint to appear.
- A second `page.route` on `**/auth/v1/authorize**` captures any subsequent Google redirect request.
- Viewport 1280×800.

**When** the credentials error triggers the OAuth-collision panel (`data-testid="login-oauth-collision"`)
**and** the user clicks the button labelled "Pokračovať cez Google" inside that panel (`data-testid="login-oauth-collision-google"`)
**Then** a request to `/auth/v1/authorize` with `provider=google` is captured

> **Note:** the plan originally also asserted that the primary `login-google-button` is disabled during the OAuth redirect. Dropped 2026-05-19 — `supabase.auth.signInWithOAuth` sets `window.location.href` directly, so the page navigates away before Playwright can observe the transient `googleLoading` state. The handler-fires-same-OAuth-call check above is the actual testable invariant.

### TC-14: Keyboard-only user can complete the login flow without a mouse

**Prerequisites**:
- Browser at `http://localhost:8080/login` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` returns a successful `EDUCATOR_SESSION` fixture.
- A `page.route` on `**/rest/v1/rpc/has_role**` returns `false`.
- A `page.route` on `**/rest/v1/profile_preferences**` returns a row with `onboarded_at` set.
- Viewport 1280×800.

**When** the user tabs to the email field and types a valid address
**and** tabs to the password field and types a valid password
**and** presses Enter to submit the form
**Then** the browser navigates to `/app`
**and** focus was never trapped outside the form during the flow

### TC-15: Mobile viewport (375×667) keeps the login card fully inside the viewport

**Prerequisites**:
- Browser at `http://localhost:8080/login` with no active session.
- Viewport 375×667 (iPhone SE).

**When** the page finishes loading
**Then** the element `data-testid="login-card"` is fully within the viewport width (no horizontal overflow)
**and** the submit button "Prihlásiť sa", the Google button "Pokračovať cez Google", the forgot-password link, and the sign-up link are all visible without scrolling horizontally

### TC-16: Already-authenticated user visiting /login is NOT automatically redirected

**Prerequisites**:
- Browser at `http://localhost:8080/login` with a valid `EDUCATOR_SESSION` seeded into localStorage via `primeAuthSession` (see `e2e/fixtures/auth.ts`).
- Viewport 1280×800.

**When** the page finishes loading
**Then** the login card (`data-testid="login-card"`) remains visible
**and** the browser URL stays at `/login` (no automatic redirect, because `/login` has no `beforeLoad` session guard in the current implementation)

### TC-17: XSS payload in the email field does not execute

**Prerequisites**:
- Browser at `http://localhost:8080/login` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` returns HTTP 400.
- Viewport 1280×800.

**When** the user types `<script>window.__xss=1</script>` into the email field
**and** types any value into the password field and submits
**Then** `window.__xss` is `undefined` in the page context (the script did not execute)
**and** the error message element (`data-testid="login-error-message"`) renders the raw text of the error, not injected HTML

### TC-18: Network offline during submit shows the generic error

**Prerequisites**:
- Browser at `http://localhost:8080/login` with no active session.
- Both fields are filled.
- A `page.route` intercept on `**/auth/v1/token**` aborts the request (`route.abort()`), simulating an offline condition.
- Viewport 1280×800.

**When** the user submits the form while the network intercept is aborting the request
**Then** the error element (`data-testid="login-error-message"`) shows "Prihlásenie zlyhalo. Skús to znovu."
**and** the submit button returns to its enabled state after the failure (the `submitting` spinner clears via the `finally` block)

---

## Open questions

- Should `/login` gain a `beforeLoad` that redirects already-authenticated users to `/app`? Currently it does not (TC-16 documents the existing behavior). If a product decision adds this guard, TC-16 must be inverted and a new prerequisite (seeding a session) added to several other TCs.
- The `?reset=1` banner is triggered by a query param set by `/auth/reset-password` after a successful password change. Verify whether the param should be stripped from the URL after the banner renders (to prevent copy-pasting the URL and showing a stale success message). TC-09 as written does not assert URL cleanup — extend if stripping is added.
