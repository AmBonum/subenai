# Signup page — test plan

**Area:** `specs/auth/`
**Component(s) under test:** `src/routes/signup.tsx`
**Routes:** `/signup`
**API endpoints:** `POST /auth/v1/signup` (Supabase `signUp`), `POST /auth/v1/authorize` (Supabase `signInWithOAuth`)
**Data dependencies:** Supabase Auth user records; no RLS-gated tables touched by this page directly
**Source stories:** _None — pre-story feature; intent inferred from `src/routes/signup.tsx` + `src/i18n/locales/sk/auth.json`._
**Last updated:** 2026-05-19

---

## Context

The signup page at `/signup` is the self-service account-creation entry point for subenai. An unauthenticated visitor fills in an email address and a password (with a confirmation field), or continues via Google OAuth. On successful email signup Supabase sends a verification email and the component transitions to a "check your email" success state in place — no redirect. The Google OAuth path redirects through `/auth/callback`. A password-strength meter is shown inline while typing. There is no terms-of-service checkbox.

## Out of scope

- Google OAuth end-to-end: Playwright cannot exercise the real Google consent screen; the button click and `signInWithOAuth` call shape are verified only.
- Email verification link flow (`/auth/callback`) — separate spec.
- Post-signup onboarding (`/app/onboarding`) — tested via the login + onboarding spec.
- 2FA enrollment — not triggered from signup.
- Admin role assignment — Supabase assigns default role; admin promotion is out of scope here.
- Rate-limiting enforcement at the Supabase edge (cannot be reliably simulated in integration tests without a dedicated test tenant).

---

## Happy paths

### TC-01: Page renders all expected UI elements

**Priority:** P1

**Prerequisites**:
- Browser navigates to `http://localhost:8080/signup` with no active session (clean localStorage, no `sb-*-auth-token`).
- Viewport 1280×800.
- Dev server running (`npm run dev`).

**When** the page finishes loading
**Then** the card heading "Vytvoriť účet" is visible (`data-testid="signup-heading"`)
**and** the email input is visible (`data-testid="signup-email-input"`)
**and** the password input is visible (`data-testid="signup-password-input"`)
**and** the password-confirm input is visible (`data-testid="signup-password-confirm-input"`)
**and** the submit button labelled "Vytvoriť účet" is visible but disabled (`data-testid="signup-submit-button"`)
**and** the Google OAuth button labelled "Pokračovať cez Google" is visible (`data-testid="signup-google-button"`)
**and** the "Prihlásiť sa" link navigating to `/login` is visible (`data-testid="signup-to-login"`)

### TC-02: Valid email + strong password submits and shows the success state

**Priority:** P1

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- A `page.route` intercept on `**/auth/v1/signup` returns HTTP 200 with a stub session body (indicating email confirmation required — `session: null`, `user.confirmation_sent_at` set).
- Viewport 1280×800.

**When** the user types `test@example.com` into the field labelled "E-mail" (`data-testid="signup-email-input"`)
**and** types `MyStr0ng!Pass` into the field labelled "Heslo" (`data-testid="signup-password-input"`)
**and** types `MyStr0ng!Pass` into the field labelled "Potvrdiť heslo" (`data-testid="signup-password-confirm-input"`)
**and** clicks the button labelled "Vytvoriť účet" (`data-testid="signup-submit-button"`)
**Then** the success panel becomes visible (`data-testid="signup-success-message"`)
**and** it contains the text "Skontroluj si e-mail"
**and** it contains the text "Poslali sme ti odkaz na overenie účtu. Klikni naň pre dokončenie registrácie."
**and** the form (`data-testid="signup-form"`) is no longer visible
**and** the link labelled "Prihlásiť sa" is present inside the success panel (`data-testid="signup-success-to-login"`)

### TC-03: Google OAuth button click triggers signInWithOAuth with the correct provider

**Priority:** P1

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- A `page.route` intercept on `**/auth/v1/authorize**` captures the outbound request without completing the redirect.
- Viewport 1280×800.

**When** the user clicks the button labelled "Pokračovať cez Google" (`data-testid="signup-google-button"`)
**Then** a request to `/auth/v1/authorize` is intercepted with `provider=google` in the query string
**and** the `redirectTo` parameter of that request contains `/auth/callback`

---

## Negative scenarios

### TC-04: Password mismatch shows the mismatch error message

**Priority:** P1

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- No network route intercept needed (the check is client-side).
- Viewport 1280×800.

**When** the user types `test@example.com` into the email field
**and** types `MyStr0ng!Pass` into the password field
**and** types `DifferentPass1!` into the password-confirm field
**and** clicks "Vytvoriť účet"
**Then** the error element (`data-testid="signup-error-message"`) becomes visible with text "Heslá sa nezhodujú."
**and** no request reaches `/auth/v1/signup`
**and** the browser URL remains `/signup`

### TC-05: Password shorter than 8 characters shows the weak-password error message

**Priority:** P1

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- Viewport 1280×800.

**When** the user types `test@example.com` into the email field
**and** types `abc` into the password field
**and** types `abc` into the password-confirm field
**and** clicks "Vytvoriť účet"
**Then** the error element (`data-testid="signup-error-message"`) shows "Heslo je príliš slabé. Použi aspoň 8 znakov."
**and** no request reaches `/auth/v1/signup`

### TC-06: Email already registered shows the email-exists error message

**Priority:** P1

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- A `page.route` intercept on `**/auth/v1/signup` returns HTTP 400 with body `{"error":"user_already_exists","error_description":"User already registered"}`.
- Viewport 1280×800.

**When** the user fills in a valid email, matching passwords of 8+ characters, and submits
**Then** the error element (`data-testid="signup-error-message"`) shows "Tento e-mail je už registrovaný."
**and** the success panel (`data-testid="signup-success-message"`) does NOT appear
**and** the browser URL remains `/signup`

### TC-07: Server error (500) shows the generic error message

**Priority:** P1

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- A `page.route` intercept on `**/auth/v1/signup` returns HTTP 500.
- Viewport 1280×800.

**When** the user fills in valid email and matching 8-character passwords and submits
**Then** the error element (`data-testid="signup-error-message"`) shows "Registrácia zlyhala. Skús to znovu."
**and** the success panel does NOT appear
**and** the submit button returns to the enabled state (the `submitting` spinner clears via the `finally` block)

### TC-08: Submit button stays disabled while any of the three fields is empty

**Priority:** P1

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- Viewport 1280×800.

**When** the email field is empty and the password fields are filled
**Then** the button `data-testid="signup-submit-button"` has the `disabled` attribute
**and** when the email field is filled but the password field is empty, the button remains disabled
**and** when both password and email fields are filled but the confirm field is empty, the button remains disabled

### TC-09: "Prihlásiť sa" link navigates to /login

**Priority:** P2

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- Viewport 1280×800.

**When** the user clicks the link labelled "Prihlásiť sa" (`data-testid="signup-to-login"`)
**Then** the browser navigates to `/login`

---

## Edge cases

### TC-10: Password-strength meter appears and updates while typing the password

**Priority:** P2

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- Viewport 1280×800.

**When** the password field is empty
**Then** the strength meter element (`data-testid="signup-password-strength"`) is NOT visible
**and** when the user types `abc` into the password field, the strength meter becomes visible showing "Sila hesla: Slabé"
**and** when the user types `MyStr0ng!Pass` (12+ chars, upper, digit, special), the label updates to show "Sila hesla: Silné"

### TC-11: Email with leading and trailing whitespace is trimmed before the signup call

**Priority:** P2

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- A `page.route` intercept on `**/auth/v1/signup` captures the raw request body and returns HTTP 200.
- Viewport 1280×800.

**When** the user types `  test@example.com  ` (with surrounding spaces) into the email field
**and** fills in matching passwords of 8+ characters and submits
**Then** the captured request body contains `"email":"test@example.com"` (trimmed, no surrounding spaces)

### TC-12: Double-clicking the submit button does not send two signup requests

**Priority:** P1

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- A `page.route` intercept on `**/auth/v1/signup` delays the response by 400 ms then returns HTTP 200.
- All three fields are filled with valid matching values.
- Viewport 1280×800.

**When** the user double-clicks "Vytvoriť účet" rapidly
**Then** exactly one request reaches `**/auth/v1/signup`
**and** the button is disabled for the duration of the in-flight request (`submitting` state)

### TC-13: XSS payload in the email field does not execute

**Priority:** P1

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- A `page.route` intercept on `**/auth/v1/signup` returns HTTP 400 with `{"error":"user_already_exists","error_description":"User already registered"}`.
- Viewport 1280×800.

**When** the user types `<script>window.__xss=1</script>@example.com` into the email field
**and** fills matching 8-character passwords and submits
**Then** `window.__xss` is `undefined` in the page context (the script did not execute)
**and** the error element (`data-testid="signup-error-message"`) renders the raw error string, not injected HTML

### TC-14: Network abort during submit shows the generic error

**Priority:** P1

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- A `page.route` intercept on `**/auth/v1/signup` aborts the request (`route.abort()`).
- All three fields filled with valid matching values.
- Viewport 1280×800.

**When** the user submits the form while the network intercept is aborting the request
**Then** the error element (`data-testid="signup-error-message"`) shows "Registrácia zlyhala. Skús to znovu."
**and** the submit button returns to the enabled state after the failure

### TC-15: Keyboard-only user can complete the signup flow without a mouse

**Priority:** P1

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- A `page.route` intercept on `**/auth/v1/signup` returns HTTP 200 with a stub body.
- Viewport 1280×800.

**When** the user tabs to the email field and types a valid email address
**and** tabs to the password field and types a matching 8-character password
**and** tabs to the password-confirm field and types the same password
**and** tabs to the submit button and presses Enter
**Then** the success panel (`data-testid="signup-success-message"`) becomes visible
**and** focus was never trapped outside the form during the flow

### TC-16: Mobile viewport (375×667) keeps the signup card fully inside the viewport

**Priority:** P2

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- Viewport 375×667 (iPhone SE).

**When** the page finishes loading
**Then** the element `data-testid="signup-card"` is fully within the viewport width (no horizontal overflow)
**and** all three input fields, the submit button, and the "Pokračovať cez Google" button are visible without horizontal scrolling

### TC-17: Google OAuth button shows a loading label while the redirect is in progress

**Priority:** P2

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- A `page.route` intercept on `**/auth/v1/authorize**` stalls indefinitely (never responds), keeping the redirect pending.
- Viewport 1280×800.

**When** the user clicks "Pokračovať cez Google" (`data-testid="signup-google-button"`)
**Then** the button text changes to "Presmerovávam na Google..."
**and** the button and the form submit button are both disabled during the pending state

### TC-18: Success-state "Prihlásiť sa" link navigates to /login

**Priority:** P2

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- A `page.route` intercept on `**/auth/v1/signup` returns HTTP 200 with a stub body.
- All three fields filled with valid matching values; form has been submitted successfully so the success panel is shown.
- Viewport 1280×800.

**When** the user clicks the link labelled "Prihlásiť sa" inside the success panel (`data-testid="signup-success-to-login"`)
**Then** the browser navigates to `/login`

### TC-19: Very long email input (1 000 characters) is accepted by the input without crashing

**Priority:** P2

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- No network intercept required (the test does not submit).
- Viewport 1280×800.

**When** the user types a 1 000-character string into the email field
**Then** the component does not throw a React error boundary
**and** the email input (`data-testid="signup-email-input"`) still reflects the typed value without truncation by the component itself (native HTML truncation by the browser is acceptable)

### TC-20: Slovak diacritics in the email field are preserved in the signup request body

**Priority:** P2

**Prerequisites**:
- Browser at `http://localhost:8080/signup` with no active session.
- A `page.route` intercept on `**/auth/v1/signup` captures the request body and returns HTTP 200.
- Viewport 1280×800.

**When** the user types `ján.novák@príklad.sk` into the email field
**and** fills matching 8-character passwords and submits
**Then** the captured request body contains `"email":"ján.novák@príklad.sk"` with diacritics intact (no encoding loss introduced by the React state or the `trim()` call)

---

## Selectors reference

All selectors confirmed present in `src/routes/signup.tsx` as of 2026-05-19:

| Element | `data-testid` |
|---|---|
| Outer card wrapper | `signup-card` |
| Page heading | `signup-heading` |
| Email input | `signup-email-input` |
| Password input | `signup-password-input` |
| Password-confirm input | `signup-password-confirm-input` |
| Password-strength container | `signup-password-strength` |
| Inline error paragraph | `signup-error-message` |
| Submit button | `signup-submit-button` |
| Google OAuth button | `signup-google-button` |
| "Prihlásiť sa" link (form footer) | `signup-to-login` |
| Success panel | `signup-success-message` |
| "Prihlásiť sa" link (success panel) | `signup-success-to-login` |
| Form element | `signup-form` |

---

## Non-goals

- Writing the POM (`e2e/poms/auth/SignupPage.ts`) — that is the generator's job.
- End-to-end email delivery verification (click the verification link).
- Post-signup onboarding questionnaire content.
- Admin-role provisioning after signup.

---

## Open questions

- Should `/signup` redirect already-authenticated users to `/app`? Currently there is no `beforeLoad` session guard (confirmed by source), so a logged-in user who navigates to `/signup` sees the form. If a guard is added, TC-01 must add an explicit "no active session" note and a new TC must cover the redirect.
- The `signInWithOAuth` error branch (`catch`) sets `tc("google_error")` — "Prihlásenie cez Google zlyhalo. Skús to znovu." — but `supabase.auth.signInWithOAuth` almost never throws (it navigates away). A dedicated TC for this branch is omitted because it requires patching the Supabase client; add one if the client is made injectable.
