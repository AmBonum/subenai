# Auth callback page — test plan

**Area:** `specs/auth/`
**Component(s) under test:** `src/routes/auth.callback.tsx`, `src/lib/auth/post-login-redirect.ts`
**Routes:** `/auth/callback`
**API endpoints:** `POST /auth/v1/token?grant_type=pkce` (Supabase `exchangeCodeForSession`), `GET /auth/v1/user` (Supabase `getSession`)
**Data dependencies:** `profile_preferences` table (read by `decidePostLoginTarget` via `/app` `beforeLoad`); Supabase Auth user records; MFA factor list (`/auth/v1/factors`)
**Source stories:** _None — pre-story feature; intent inferred from `src/routes/auth.callback.tsx` + commit `a48c667` (2026-05-19 infinite-loop hotfix)._
**Last updated:** 2026-05-19

---

## Context

`/auth/callback` is the single OAuth + magic-link landing page for subenai. Supabase redirects here after Google OAuth and after email-link flows. The component reads three mutually-exclusive search-param groups: a PKCE `?code=…` (exchanges for a session), a `?redirect=…` alongside a code (overrides role-based routing), and a `?error=…&error_description=…` (provider refused). On 2026-05-19 a production incident (352+ runaway requests per session) was traced to a re-render loop triggered by `t` (i18n helper) instability; the fix is a `startedRef` guard that ensures the effect runs exactly once per mount regardless of re-renders. Test design must preserve this invariant.

## Selectors inventory

| `data-testid` | Element | Status |
|---|---|---|
| `auth-callback-root` | `<main>` wrapper | present |
| `auth-callback-loading` | loading paragraph | present |
| `auth-callback-error` | error paragraph (`role="alert"`) | present |

No additional test-ids are needed for the TCs below.

## Out of scope

- The Google OAuth consent screen itself — Playwright cannot visit a real Google identity endpoint; TC-02 intercepts the Supabase token exchange instead.
- 2FA enrollment (`/login/enroll-2fa`) and TOTP verification (`/login/verify-2fa`) — the admin routing branch of `decidePostLoginTarget` is unit-tested; only the non-admin path is exercised end-to-end here.
- Implicit-flow hash tokens (legacy Supabase flow, not used by this app).
- Email template content and deliverability.
- Magic-link click replay via the browser's actual email client.
- Onboarding form content — only the redirect target is asserted.

---

## Happy paths

### TC-01: Loading state is visible immediately on mount before exchange completes

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?code=demo-code` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` delays the response by 500 ms before resolving.
- Viewport 1280×800.

**When** the page finishes its initial render (before the 500 ms delay elapses)
**Then** the element `data-testid="auth-callback-loading"` is visible with text "Overujem prihlásenie..."
**and** the element `data-testid="auth-callback-error"` is not present in the DOM
**and** the page `<title>` is "Prihlasujem · SubenAI"

### TC-02: Valid PKCE code exchange routes a regular onboarded user to /app

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?code=valid-code` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` returns a successful `EDUCATOR_SESSION` fixture immediately.
- A `page.route` intercept on `**/rest/v1/rpc/has_role**` returns `false` (non-admin).
- A `page.route` intercept on `**/rest/v1/profile_preferences**` returns a row with `onboarded_at` set (non-null).
- Viewport 1280×800.

**When** the component mounts and the exchange resolves
**Then** the browser navigates to `/app`
**and** the element `data-testid="auth-callback-error"` never appears during the transition

### TC-03: Explicit ?redirect path overrides role-based routing

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?code=valid-code&redirect=/admin/users` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` returns a successful `EDUCATOR_SESSION` fixture.
- A `page.route` intercept on `**/rest/v1/rpc/has_role**` returns `false` (this intercept should NOT be called — the redirect short-circuits before `decidePostLoginTarget`).
- Viewport 1280×800.

**When** the component mounts and the exchange resolves
**Then** the browser navigates to `/admin/users`
**and** no request to `**/rest/v1/rpc/has_role**` is made (the explicit redirect wins before role lookup)

### TC-04: Provider error param shows error UI then redirects to /login

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?error=access_denied&error_description=User+cancelled+the+flow` with no active session.
- No network intercept needed — no outbound request is expected.
- Viewport 1280×800.

**When** the component mounts
**Then** the element `data-testid="auth-callback-error"` becomes visible with text "Prihlásenie zlyhalo. Skús to znovu."
**and** the element `data-testid="auth-callback-loading"` is no longer in the DOM
**and** after approximately 1.5 seconds the browser navigates to `/login`

---

## Negative scenarios

### TC-05: Failed code exchange (invalid code) shows error UI then redirects to /login

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?code=bad-code` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` returns HTTP 400 with body `{"error":"invalid_grant","error_description":"Invalid code"}`.
- Viewport 1280×800.

**When** the component mounts and the exchange call resolves with an error
**Then** the element `data-testid="auth-callback-error"` becomes visible with text "Prihlásenie zlyhalo. Skús to znovu."
**and** after approximately 1.5 seconds the browser navigates to `/login`

### TC-06: No code and no session — bare callback URL shows error then redirects

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback` (no query params) with no active session.
- A `page.route` intercept on `**/auth/v1/user**` (Supabase `getSession`) returns `{"data":{"session":null},"error":null}`.
- Viewport 1280×800.

**When** the component mounts (no `code` branch runs; `getSession` returns null)
**Then** the element `data-testid="auth-callback-error"` becomes visible with text "Prihlásenie zlyhalo. Skús to znovu."
**and** after approximately 1.5 seconds the browser navigates to `/login`

### TC-07: Token exchange returns a 500 server error — error UI shown, no crash

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?code=any-code` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` returns HTTP 500 with an empty body.
- Viewport 1280×800.

**When** the component mounts and the Supabase call throws
**Then** the element `data-testid="auth-callback-error"` becomes visible with text "Prihlásenie zlyhalo. Skús to znovu."
**and** no unhandled JavaScript exception is recorded in the browser console
**and** after approximately 1.5 seconds the browser navigates to `/login`

### TC-08: Network abort during exchange shows error UI, does not hang

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?code=any-code` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` aborts the request (`route.abort()`).
- Viewport 1280×800.

**When** the component mounts and the exchange request is aborted
**Then** the element `data-testid="auth-callback-error"` becomes visible with text "Prihlásenie zlyhalo. Skús to znovu."
**and** after approximately 1.5 seconds the browser navigates to `/login`

---

## Edge cases

### TC-09: startedRef invariant — exchangeCodeForSession fires exactly once despite re-renders

> **Regression guard for commit `a48c667` / 2026-05-19 incident (352+ runaway requests).**

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?code=valid-code` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` counts incoming requests and delays each by 200 ms before returning a successful `EDUCATOR_SESSION` fixture.
- A `page.route` intercept on `**/rest/v1/rpc/has_role**` returns `false`.
- A `page.route` intercept on `**/rest/v1/profile_preferences**` returns a row with `onboarded_at` set.
- Viewport 1280×800.

**When** the component mounts and navigation to `/app` completes
**and** the test waits an additional 500 ms for any potential deferred re-fires
**Then** the total number of intercepted requests to `**/auth/v1/token**` is exactly 1
**and** the browser URL is `/app` (not stuck in a redirect loop on `/auth/callback`)

### TC-10: ?redirect with an external origin is rejected — routing falls back to decidePostLoginTarget

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?code=valid-code&redirect=https://evil.example.com/steal` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` returns a successful `EDUCATOR_SESSION` fixture.
- A `page.route` intercept on `**/rest/v1/rpc/has_role**` returns `false`.
- A `page.route` intercept on `**/rest/v1/profile_preferences**` returns a row with `onboarded_at` set.
- Viewport 1280×800.

**When** the component mounts and the exchange resolves
**Then** the browser does NOT navigate to `https://evil.example.com/steal`
**and** the browser navigates to `/app` (the `redirect.startsWith("/")` guard in the component rejects absolute URLs)

### TC-11: ?redirect with a relative path that does not start with / is also rejected

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?code=valid-code&redirect=evil-relative` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` returns a successful `EDUCATOR_SESSION` fixture.
- A `page.route` intercept on `**/rest/v1/rpc/has_role**` returns `false`.
- A `page.route` intercept on `**/rest/v1/profile_preferences**` returns a row with `onboarded_at` set.
- Viewport 1280×800.

**When** the component mounts and the exchange resolves
**Then** the browser navigates to `/app` (fallback — the `startsWith("/")` guard rejected the non-rooted path)
**and** the browser never attempts to navigate to a path containing "evil-relative"

### TC-12: Cancellation flag prevents navigate after component unmount

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?code=slow-code` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` delays 2000 ms before responding.
- A JavaScript snippet is prepared to navigate the page away (simulating the user pressing back) after 200 ms.
- Viewport 1280×800.

**When** the user navigates away from `/auth/callback` before the 2000 ms delay elapses
**Then** no unhandled "Can't perform a React state update on an unmounted component" warning appears in the console
**and** no navigation back to `/auth/callback` occurs after the delayed exchange would have completed

### TC-13: Page is indexed as noindex — robots meta tag present

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?code=any` (no network intercepts needed for meta verification).
- Viewport 1280×800.

**When** the page finishes its initial render
**Then** the `<meta name="robots">` tag in `<head>` has content `"noindex,nofollow"`

### TC-14: Error paragraph has role="alert" for screen-reader announcement

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?error=access_denied&error_description=x` with no active session.
- Viewport 1280×800.

**When** the error state renders
**Then** the element `data-testid="auth-callback-error"` has the `role="alert"` attribute
**and** the text "Prihlásenie zlyhalo. Skús to znovu." is contained in an element that will be announced by assistive technology without requiring user focus

### TC-15: Keyboard-only user sees no focus trap — loading paragraph is not interactive

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?code=slow-code` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` delays 2000 ms.
- Viewport 1280×800.

**When** the page renders in the loading state
**and** the user presses Tab
**Then** focus moves to the next focusable element in the document (e.g. the browser chrome or an injected toolbar) rather than being trapped inside `auth-callback-root`
**and** no interactive elements exist inside the callback page that could confuse a keyboard-only user during the loading state

### TC-16: Mobile viewport (375×667) — loading paragraph is fully visible without horizontal scroll

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?code=slow-code` with no active session.
- A `page.route` intercept on `**/auth/v1/token**` delays 2000 ms.
- Viewport 375×667 (iPhone SE).

**When** the page renders in the loading state
**Then** the element `data-testid="auth-callback-loading"` is within the viewport bounds (no horizontal overflow)
**and** no horizontal scrollbar is present on the `<body>`

### TC-17: XSS in error_description param does not execute injected script

**Prerequisites**:
- Browser navigates to `http://localhost:8080/auth/callback?error=access_denied&error_description=<script>window.__xss=1</script>` with no active session.
- Viewport 1280×800.

**When** the error state renders
**Then** `window.__xss` is `undefined` in the page context (the injected script did not execute)
**and** the element `data-testid="auth-callback-error"` displays the generic string "Prihlásenie zlyhalo. Skús to znovu." rather than the raw `error_description` value (the component ignores `error_description` in its UI)

---

## Open questions

- TC-03 asserts that `has_role` is never called when `?redirect=` is present. Verify this holds when the `redirect` value is `/admin` — the component currently short-circuits before `decidePostLoginTarget`, meaning an AAL1 admin could reach `/admin` directly via a crafted callback URL. If that is unintended, the `?redirect=` branch should only be allowed for admin sessions already at AAL2, and this TC must be updated.
- The 1.5 s timeout before bouncing to `/login` (TC-04, TC-05, TC-06, TC-07, TC-08) is hardcoded in the component. If it becomes configurable (e.g. reduced for automated tests), the relevant TCs should parameterise the wait rather than using a fixed `waitForTimeout`.
- `decidePostLoginTarget` performs two async Supabase calls (`has_role`, then `listFactors`/`getAALStatus`) after `getSession`. If either of these calls is slow or fails, the component currently has no error handler for the `decidePostLoginTarget` call itself — an unhandled rejection could slip through the `try/catch` only if `decidePostLoginTarget` rejects after `cancelled = true`. Confirm the cleanup path covers this and add a TC if not.
