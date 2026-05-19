# Reset-password page — test plan

**Area:** `specs/auth/`
**Component(s) under test:** `src/routes/auth.reset-password.tsx`
**Routes:** `/auth/reset-password` (plus URL hash `#access_token=…&type=recovery` appended by Supabase)
**API endpoints:** `POST /auth/v1/token` (implicit token exchange performed by Supabase JS on mount), `PUT /auth/v1/user` (called by `supabase.auth.updateUser({ password })`)
**Data dependencies:** Supabase Auth user records; active recovery session established by the token exchange
**Source stories:** _None — pre-story feature (AH-13.4); intent inferred from `src/routes/auth.reset-password.tsx` + `src/i18n/locales/sk/auth.json`._
**Last updated:** 2026-05-19

---

## Context

The reset-password page at `/auth/reset-password` is the second half of the password-recovery flow. A registered user who clicked the link in a Supabase `resetPasswordForEmail` email lands here with a recovery token in the URL hash. Supabase JS detects the hash, exchanges the token for a session via `POST /auth/v1/token`, and fires either a `PASSWORD_RECOVERY` or `SIGNED_IN` auth-state event. The component listens for that event; once `hasSession` is `true` it renders the new-password form. The user enters and confirms a new password, which is validated client-side (length ≥ 8, fields must match), then submitted to `PUT /auth/v1/user`. On success the component navigates to `/login?reset=1`. If no session can be established (expired or tampered token), the component renders a no-session error block with a link back to `/forgot-password`.

**Token exchange mechanics (critical for test setup):** The Supabase JS client performs the exchange automatically when it detects `#access_token=…&type=recovery` in `window.location.hash` during `onAuthStateChange` listener registration. There is no explicit `exchangeCodeForSession` call in the component. Tests must therefore either (a) supply a real or synthetic hash fragment and intercept `POST /auth/v1/token` to return a mock session, or (b) call `supabase.auth.setSession(…)` directly in the browser context before navigating to the page so that `getSession()` returns a valid session on mount without any exchange being needed. Strategy (b) is simpler for most TCs; strategy (a) is required only for TC-03 which asserts the exchange call itself.

## Out of scope

- The `/forgot-password` form that sends the recovery email — covered in `specs/auth/forgot-password.md`.
- Full e-mail delivery and real link-click flow — cannot be automated end-to-end without a real inbox; verified manually.
- The `/login?reset=1` success banner rendered after redirect — covered in `specs/auth/login.md`.
- Google OAuth / passwordless accounts — Supabase silently rejects `updateUser` for OAuth-only users; no extra client-side branching exists in this component to test.
- 2FA / TOTP re-authentication after password change — not implemented in this route.
- Admin-specific post-reset routing — out of scope; the component always navigates to `/login?reset=1`.
- Password strength bar visual appearance — tested functionally (threshold values) not pixel-perfectly.

---

## Happy paths

### TC-01: Page renders all required UI elements when a valid recovery session exists

**Priority:** P1

**Prerequisites**:
- A synthetic Supabase session is injected via `page.evaluate(() => supabase.auth.setSession({ access_token: '<mock>', refresh_token: '<mock>' }))` before navigation, OR `supabase.auth.onAuthStateChange` is triggered with `PASSWORD_RECOVERY` by intercepting `POST /auth/v1/token` to return a mock session object.
- Browser navigates to `http://localhost:8080/auth/reset-password`.
- No prior form interaction.
- Viewport 1280×800.

**When** the page finishes loading and `hasSession` resolves to `true`
**Then** the card element is visible (`data-testid="reset-card"`)
**and** the heading "Nové heslo" is visible (`data-testid="reset-heading"`)
**and** the subtitle "Zadaj nové heslo k svojmu účtu." is visible
**and** the new-password input is visible and empty (`data-testid="reset-password-input"`)
**and** the confirm-password input is visible and empty (`data-testid="reset-password-confirm-input"`)
**and** the submit button labelled "Zmeniť heslo" is visible and disabled (both `password` and `password2` are empty) (`data-testid="reset-submit-button"`)
**and** no error element (`data-testid="reset-error-message"`) is present in the DOM
**and** the password-strength indicator (`data-testid="reset-password-strength"`) is not present (no password typed yet)

### TC-02: Valid matching passwords of sufficient length trigger updateUser and redirect to /login?reset=1

**Priority:** P1

**Prerequisites**:
- Recovery session injected as in TC-01.
- A `page.route` intercept on `**/auth/v1/user**` (method PUT) returns HTTP 200 with `{ id: "mock-uid", email: "user@example.com" }`.
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** the user types `NewPass1!` into the new-password field (`data-testid="reset-password-input"`)
**and** types `NewPass1!` into the confirm-password field (`data-testid="reset-password-confirm-input"`)
**and** clicks the "Zmeniť heslo" button (`data-testid="reset-submit-button"`)
**Then** a PUT request is dispatched to `**/auth/v1/user**` with `{ "password": "NewPass1!" }` in the body
**and** the browser navigates to `/login` with query parameter `reset=1`
**and** no error element (`data-testid="reset-error-message"`) appears at any point

### TC-03: Supabase JS exchanges the recovery token from the URL hash before rendering the form

**Priority:** P1

**Prerequisites**:
- A `page.route` intercept on `**/auth/v1/token**` (method POST, body containing `type=recovery`) returns HTTP 200 with a mock session `{ access_token: "tok", refresh_token: "rtok", token_type: "bearer", expires_in: 3600, user: { id: "uid" } }`.
- Browser navigates to `http://localhost:8080/auth/reset-password#access_token=FAKE&refresh_token=RFAKE&type=recovery`.
- Viewport 1280×800.

**When** the page mounts and Supabase JS processes the URL hash
**Then** a POST request is made to `**/auth/v1/token**` with the recovery grant
**and** after the exchange completes the form (`data-testid="reset-form"`) becomes visible (not the no-session block)
**and** `hasSession` is `true` (inferred from the form being present and the no-session block absent)

---

## Negative scenarios

### TC-04: Password mismatch shows client-side error and does not call updateUser

**Priority:** P1

**Prerequisites**:
- Recovery session injected as in TC-01.
- No `page.route` intercept on `**/auth/v1/user**` (any call would be unexpected).
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** the user types `NewPass1!` into `data-testid="reset-password-input"`
**and** types `Different2@` into `data-testid="reset-password-confirm-input"`
**and** clicks "Zmeniť heslo"
**Then** the error element (`data-testid="reset-error-message"`) is visible with the exact text "Heslá sa nezhodujú."
**and** no request is dispatched to `**/auth/v1/user**`
**and** the browser URL remains at `/auth/reset-password`

### TC-05: Password shorter than 8 characters shows client-side error and does not call updateUser

**Priority:** P1

**Prerequisites**:
- Recovery session injected as in TC-01.
- No `page.route` intercept on `**/auth/v1/user**`.
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** the user types `Ab1!` into `data-testid="reset-password-input"`
**and** types `Ab1!` into `data-testid="reset-password-confirm-input"`
**and** clicks "Zmeniť heslo"
**Then** the error element (`data-testid="reset-error-message"`) is visible with the exact text "Heslo je príliš slabé. Použi aspoň 8 znakov."
**and** no request is dispatched to `**/auth/v1/user**`
**and** the browser URL remains at `/auth/reset-password`

### TC-06: Expired or missing recovery token renders the no-session error block

**Priority:** P1

**Prerequisites**:
- A `page.route` intercept on `**/auth/v1/token**` returns HTTP 400 `{ error: "invalid_grant", error_description: "Token has expired or is invalid" }` to reject any exchange attempt.
- No synthetic session is injected.
- Browser navigates to `http://localhost:8080/auth/reset-password` with no hash or with a well-formed but expired hash.
- Viewport 1280×800.

**When** the page mounts and `getSession()` returns no session and the auth-state change listener never fires `SIGNED_IN` or `PASSWORD_RECOVERY`
**Then** the no-session block (`data-testid="reset-no-session"`) is visible
**and** the error text "Odkaz na obnovu vypršal. Vyžiadaj si nový." is visible inside it (role `alert`)
**and** a link labelled "Zmeniť heslo" pointing to `/forgot-password` is visible (`data-testid="reset-to-forgot"`)
**and** the password form (`data-testid="reset-form"`) is absent from the DOM

### TC-07: updateUser server error shows the generic error message and keeps the form in place

**Priority:** P1

**Prerequisites**:
- Recovery session injected as in TC-01.
- A `page.route` intercept on `**/auth/v1/user**` (method PUT) returns HTTP 500 with any body.
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** the user types `NewPass1!` into both password fields and clicks "Zmeniť heslo"
**Then** the error element (`data-testid="reset-error-message"`) is visible with the exact text "Zmena hesla zlyhala. Skús to znovu."
**and** the form (`data-testid="reset-form"`) remains in the DOM
**and** the browser URL stays at `/auth/reset-password`
**and** the submit button is re-enabled after the response (the `finally` block clears `submitting`)

### TC-08: Submit button is disabled while either password field is empty

**Priority:** P1

**Prerequisites**:
- Recovery session injected as in TC-01.
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** only the new-password field contains text and the confirm field is empty
**Then** the button `data-testid="reset-submit-button"` has the `disabled` attribute
**and** when both fields are empty the button also has the `disabled` attribute
**and** when only the confirm field contains text and the new-password field is empty the button also has the `disabled` attribute

---

## Edge cases

### TC-09: Password exactly 8 characters long passes the length check

**Priority:** P1

**Prerequisites**:
- Recovery session injected as in TC-01.
- A `page.route` intercept on `**/auth/v1/user**` returns HTTP 200.
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** the user types `Abcdef1!` (exactly 8 chars) into both password fields and submits
**Then** no error element (`data-testid="reset-error-message"`) appears
**and** a PUT request is dispatched to `**/auth/v1/user**`
**and** the browser navigates to `/login?reset=1`

### TC-10: Password of 7 characters is rejected even when fields match

**Priority:** P1

**Prerequisites**:
- Recovery session injected as in TC-01.
- No intercept on `**/auth/v1/user**`.
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** the user types `Abcde1!` (7 chars) into both password fields and submits
**Then** the error "Heslo je príliš slabé. Použi aspoň 8 znakov." is visible
**and** no request is dispatched to `**/auth/v1/user**`

### TC-11: Password strength meter reflects scoring thresholds correctly

**Priority:** P2

**Prerequisites**:
- Recovery session injected as in TC-01.
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** the user types `aaaaaaaa` (8 lowercase, score = 25) into `data-testid="reset-password-input"`
**Then** `data-testid="reset-password-strength"` is visible and the label reads "Sila hesla: Slabé"
**and** when the user clears the field and types `Aaaaaaa1!` (8+ chars, uppercase, digit, special, score = 25+15+15+20 = 75 = "Stredné") the label reads "Sila hesla: Stredné"
**and** when the user clears the field and types `Aaaaaaaaa1!X` (12+ chars, uppercase, digit, special, score = 25+25+15+15+20 = 100 = "Silné") the label reads "Sila hesla: Silné"

### TC-12: Strength indicator does not appear before the first character is typed

**Priority:** P2

**Prerequisites**:
- Recovery session injected as in TC-01.
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** the page finishes loading with no input typed
**Then** `data-testid="reset-password-strength"` is absent from the DOM
**and** after typing one character into `data-testid="reset-password-input"` the strength indicator appears
**and** after clearing the field again the strength indicator disappears

### TC-13: Double-clicking submit does not dispatch two PUT requests

**Priority:** P1

**Prerequisites**:
- Recovery session injected as in TC-01.
- A `page.route` intercept on `**/auth/v1/user**` delays the response by 400 ms then returns HTTP 200.
- Both password fields pre-filled with `NewPass1!`.
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** the user double-clicks "Zmeniť heslo" in rapid succession
**Then** exactly one request reaches `**/auth/v1/user**`
**and** the button is disabled during the in-flight period (the `submitting` flag and the `disabled={submitting || !password || !password2}` guard prevent the second click)

### TC-14: Network abort from updateUser shows the generic error and re-enables the button

**Priority:** P1

**Prerequisites**:
- Recovery session injected as in TC-01.
- A `page.route` intercept on `**/auth/v1/user**` calls `route.abort()` to simulate an offline condition.
- Both password fields filled with `NewPass1!`.
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** the user clicks "Zmeniť heslo" and the PUT request is aborted
**Then** the error element (`data-testid="reset-error-message"`) shows "Zmena hesla zlyhala. Skús to znovu."
**and** the submit button returns to its enabled, non-loading state
**and** the form remains in the DOM

### TC-15: Slovak diacritics in the password field are accepted without corruption

**Priority:** P2

**Prerequisites**:
- Recovery session injected as in TC-01.
- A `page.route` intercept on `**/auth/v1/user**` captures the request body and returns HTTP 200.
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** the user types `Súťaž2026!` (containing Slovak diacritics ú, ť, a ž) into both password fields and submits
**Then** no client-side validation error appears (the password is 10 chars, has uppercase, digit, and special)
**and** the captured PUT body contains the password string exactly as typed without encoding corruption
**and** the browser navigates to `/login?reset=1`

### TC-16: XSS payload in the password field does not execute

**Priority:** P2

**Prerequisites**:
- Recovery session injected as in TC-01.
- A `page.route` intercept on `**/auth/v1/user**` returns HTTP 500 to force the error-render path.
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** the user types `<script>window.__xss=1</script>Pass1!` into both password fields and submits
**Then** `window.__xss` is `undefined` in the page context
**and** the error element (`data-testid="reset-error-message"`) renders "Zmena hesla zlyhala. Skús to znovu." as plain text, not injected HTML

### TC-17: No-session link navigates to /forgot-password

**Priority:** P1

**Prerequisites**:
- No session injected; `POST /auth/v1/token` intercepted to return HTTP 400 so `hasSession` resolves to `false` (same setup as TC-06).
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** the user clicks the link `data-testid="reset-to-forgot"` inside the no-session block
**Then** the browser navigates to `/forgot-password`

### TC-18: Button label changes to "Ukladám..." while the PUT request is in flight

**Priority:** P1

**Prerequisites**:
- Recovery session injected as in TC-01.
- A `page.route` intercept on `**/auth/v1/user**` delays the response by 500 ms before returning HTTP 200.
- Both password fields filled with `NewPass1!`.
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** the user clicks "Zmeniť heslo"
**Then** within 100 ms the button label changes to "Ukladám..."
**and** the button has the `disabled` attribute for the duration of the in-flight request
**and** after the response arrives the browser navigates to `/login?reset=1`

### TC-19: Keyboard-only user can submit the form without a mouse

**Priority:** P1

**Prerequisites**:
- Recovery session injected as in TC-01.
- A `page.route` intercept on `**/auth/v1/user**` returns HTTP 200.
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 1280×800.

**When** the user tabs to the new-password field and types `NewPass1!`
**and** presses Tab to move to the confirm-password field and types `NewPass1!`
**and** presses Tab to focus the "Zmeniť heslo" button and presses Enter
**Then** a PUT request is dispatched to `**/auth/v1/user**`
**and** the browser navigates to `/login?reset=1`

### TC-20: Mobile viewport (375×667) keeps the card within the viewport

**Priority:** P2

**Prerequisites**:
- Recovery session injected as in TC-01.
- Browser navigated to `http://localhost:8080/auth/reset-password`.
- Viewport 375×667 (iPhone SE).

**When** the page finishes loading
**Then** the card element (`data-testid="reset-card"`) is fully within the viewport width (no horizontal overflow)
**and** both password inputs, the strength indicator placeholder, and the submit button are visible without horizontal scrolling

### TC-21: Page carries noindex,nofollow robots directive

**Priority:** P2

**Prerequisites**:
- Browser navigated to `http://localhost:8080/auth/reset-password` (session state irrelevant for head meta).
- Viewport 1280×800.

**When** the page finishes loading
**Then** the `<meta name="robots">` tag in `<head>` has content `noindex,nofollow`
**and** the page `<title>` is `"Nové heslo · SubenAI"`

---

## Open questions

- **Bug candidate — wrong i18n key for the no-session link label.** In the no-session block (`data-testid="reset-no-session"`) the link to `/forgot-password` uses `t("submit")` from the `reset` namespace, which resolves to `"Zmeniť heslo"`. This is semantically incorrect; the link should read something like `"Vyžiadať nový odkaz"`. TC-06 and TC-17 assert against `"Zmeniť heslo"` as the current verbatim behavior — if the key is corrected, those TCs must be updated.
- **Session injection strategy.** The preferred test approach (calling `supabase.auth.setSession` in the browser context before navigating) depends on the Supabase client being exposed on `window` or importable. Confirm with the generator whether `page.evaluate` can reach the client, or whether the intercept-and-mock-token-exchange approach (TC-03 style) must be used universally.
- **updateUser endpoint pattern.** The Supabase JS client may hit `PUT /auth/v1/user` through a local proxy at `http://localhost:54321/auth/v1/user` in dev. The generator must verify the correct intercept URL pattern against the running dev-server configuration.
- **Back navigation after redirect.** If the user presses the browser Back button from `/login?reset=1`, they return to `/auth/reset-password` with no token in the hash. TC-06 covers this incidentally (no session → no-session block), but a dedicated TC may be warranted if the product decision is to redirect rather than render the expired-link block.
