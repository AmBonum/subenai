# 2FA verification page — test plan

**Area:** `specs/auth/`
**Component(s) under test:** `src/routes/login_.verify-2fa.tsx`, `src/lib/auth/mfa.ts`
**Routes:** `/login/verify-2fa`, `/login/verify-2fa?redirect=<path>`
**API endpoints:** `POST /auth/v1/factors/{id}/challenge`, `POST /auth/v1/factors/{id}/verify`, `POST /rest/v1/rpc/consume_mfa_backup_code`
**Data dependencies:** `mfa_backup_codes` table (`consume_mfa_backup_code` SECURITY DEFINER RPC); Supabase Auth factor records; `getAuthenticatorAssuranceLevel` session metadata
**Source stories:** _None — pre-story feature; intent inferred from `src/routes/login_.verify-2fa.tsx` (comment header `AH-12.3`) + `src/lib/auth/mfa.ts`._
**Last updated:** 2026-05-19

---

## Context

The `/login/verify-2fa` page is the AAL2 upgrade gate for admin users. After a successful AAL1 password login, admins with an enrolled TOTP factor are redirected here. The user enters a 6-digit code from their authenticator app; the component calls `challengeAndVerify` which issues a Supabase MFA challenge then immediately verifies it, upgrading the session to AAL2. A `?redirect=` search param overrides the default `/admin` destination. A secondary backup-code mode lets a user substitute one of their 8 single-use recovery codes in place of the TOTP. The page is tagged `noindex,nofollow` and has three `beforeLoad` guards: no session → `/login`, already AAL2 → `/app`, no verified TOTP factor → `/login/enroll-2fa`.

## Out of scope

- TOTP enrollment flow (`/login/enroll-2fa`) — separate spec.
- Backup-code generation and the "regenerate" action on the security settings page (`/app/account/security`) — separate spec.
- Google OAuth login path (OAuth users with 2FA are out of scope for the current admin flow).
- Supabase server-side TOTP clock-skew tolerance window (implementation detail of the Supabase auth service, not of this component).
- Admin post-login routing decision logic (`decidePostLoginTarget`) — covered by the login spec.
- Rate-limiting enforcement at the Supabase infrastructure level; only client-side re-enable behavior is tested here.

---

## `data-testid` inventory

The following test-ids exist in the component as of the last audit:

| `data-testid` | Element |
|---|---|
| `verify-2fa-card` | Outer `<Card>` wrapper |
| `verify-2fa-heading` | `<CardTitle>` |
| `verify-2fa-subheading` | `<CardDescription>` |
| `verify-2fa-totp-form` | TOTP `<form>` |
| `verify-2fa-code-input` | `<InputOTP>` root (segmented, 6 slots, separator after slot 2) |
| `verify-2fa-hint` | Hint `<p>` below the OTP input |
| `verify-2fa-error` | TOTP error `<p role="alert">` |
| `verify-2fa-submit-button` | TOTP submit `<Button>` |
| `verify-2fa-use-backup-link` | "Use backup code" toggle `<button>` |
| `verify-2fa-backup-form` | Backup-code `<form>` |
| `verify-2fa-backup-input` | Backup-code `<Input>` |
| `verify-2fa-backup-error` | Backup-code error `<p role="alert">` |
| `verify-2fa-backup-submit-button` | Backup-code submit `<Button>` |
| `verify-2fa-use-totp-link` | "Back to app code" toggle `<button>` |

---

## Happy paths

### TC-01: TOTP form renders all expected elements on first load

**Prerequisites**:
- An AAL1 session (admin user with one verified TOTP factor) is seeded into localStorage via `primeAuthSession` with `currentLevel: "aal1"` and `nextLevel: "aal2"`.
- A `page.route` intercept on `**/auth/v1/factors**` returns a factor list with one entry `{ status: "verified", factor_type: "totp" }`.
- Browser navigates to `http://localhost:8080/login/verify-2fa`.
- Viewport 1280×800.

**When** the page finishes loading
**Then** the card element (`data-testid="verify-2fa-card"`) is visible
**and** the heading labelled "Overte sa kódom z aplikácie" is visible (`data-testid="verify-2fa-heading"`)
**and** the subheading labelled "Zadajte 6-miestny kód z autentifikátora." is visible (`data-testid="verify-2fa-subheading"`)
**and** the segmented OTP input (`data-testid="verify-2fa-code-input"`) is visible, has 6 slots, and has autofocus
**and** the hint `data-testid="verify-2fa-hint"` is visible with text beginning "Otvor svoju authenticator aplikáciu"
**and** the submit button `data-testid="verify-2fa-submit-button"` is visible and labelled "Overiť" but disabled (code length < 6)
**and** the link `data-testid="verify-2fa-use-backup-link"` is visible with text "Použiť záložný kód"
**and** no error element (`data-testid="verify-2fa-error"`) is present in the DOM

### TC-02: Valid TOTP code auto-submits, upgrades session to AAL2, and navigates to /admin

**Prerequisites**:
- AAL1 session seeded as in TC-01.
- A `page.route` intercept on `**/auth/v1/factors**` returns one verified TOTP factor with `id: "factor-abc"`.
- A `page.route` intercept on `**/auth/v1/factors/factor-abc/challenge**` returns HTTP 200 with `{ id: "challenge-xyz" }`.
- A `page.route` intercept on `**/auth/v1/factors/factor-abc/verify**` returns HTTP 200 (success).
- Browser at `http://localhost:8080/login/verify-2fa`.
- Viewport 1280×800.

**When** the user types `123456` into the segmented OTP input (`data-testid="verify-2fa-code-input"`)
**Then** the component auto-submits immediately on entry of the 6th digit (no button click required)
**and** the submit button label changes to "Hotovo ✓" (`data-testid="verify-2fa-submit-button"`)
**and** the OTP input becomes disabled
**and** the browser navigates to `/admin` within ~500 ms

### TC-03: Valid TOTP code with ?redirect param navigates to the redirect target

**Prerequisites**:
- Same session and route intercepts as TC-02.
- Browser at `http://localhost:8080/login/verify-2fa?redirect=/admin/users`.

**When** the user types `123456` into the OTP input
**Then** the verify endpoint is called and returns success
**and** the browser navigates to `/admin/users` (not the default `/admin`)

---

## Negative scenarios

### TC-04: Invalid TOTP code shows the Slovak error message and clears the input

**Prerequisites**:
- AAL1 session seeded as in TC-01.
- A `page.route` intercept on `**/auth/v1/factors/factor-abc/challenge**` returns HTTP 200 with `{ id: "challenge-xyz" }`.
- A `page.route` intercept on `**/auth/v1/factors/factor-abc/verify**` returns HTTP 422 with body `{"message":"Invalid TOTP code"}`.
- Browser at `http://localhost:8080/login/verify-2fa`.
- Viewport 1280×800.

**When** the user types `000000` into the OTP input
**Then** the error element (`data-testid="verify-2fa-error"`, `role="alert"`) becomes visible with text "Kód nie je správny."
**and** the OTP input value is cleared (all 6 slots empty)
**and** the browser URL remains `/login/verify-2fa`
**and** the submit button is re-enabled after the failure (the `finally` block clears `submitting`)

### TC-05: Expired TOTP code error (mfa_totp_enroll_error containing "expired") shows the expiry message

**Prerequisites**:
- Same intercept setup as TC-04 except the verify endpoint returns HTTP 422 with body `{"message":"mfa totp code expired"}` (Supabase error string contains "expired").
- Browser at `http://localhost:8080/login/verify-2fa`.
- Viewport 1280×800.

**When** the user types `999999` into the OTP input
**Then** the error element shows "Kód vypršal. Authenticator generuje nový každých 30 sekúnd — počkaj a skús ten najnovší."
**and** the OTP slots are cleared so the user can immediately enter the next code

### TC-06: Network abort during verify shows the generic error and re-enables the button

**Prerequisites**:
- AAL1 session seeded as in TC-01.
- A `page.route` intercept on `**/auth/v1/factors/factor-abc/challenge**` returns HTTP 200 with `{ id: "challenge-xyz" }`.
- A `page.route` intercept on `**/auth/v1/factors/factor-abc/verify**` calls `route.abort()` (simulates network offline / connection reset).
- Browser at `http://localhost:8080/login/verify-2fa`.
- Viewport 1280×800.

**When** the user types `123456` into the OTP input (triggering auto-submit)
**Then** the error element (`data-testid="verify-2fa-error"`) shows "Nastala chyba. Skúste to znova."
**and** the submit button (`data-testid="verify-2fa-submit-button"`) returns to its normal enabled state (not stuck in "Overujem...")
**and** the OTP slots are cleared

### TC-07: Invalid backup code shows the backup-specific error message

**Prerequisites**:
- AAL1 session seeded as in TC-01.
- A `page.route` intercept on `**/rest/v1/rpc/consume_mfa_backup_code**` returns HTTP 200 with body `false`.
- Browser at `http://localhost:8080/login/verify-2fa`.
- Viewport 1280×800.

**When** the user clicks the link `data-testid="verify-2fa-use-backup-link"`
**and** the backup-code form (`data-testid="verify-2fa-backup-form"`) becomes visible
**and** the user types `INVALID-CODE` into the backup input (`data-testid="verify-2fa-backup-input"`)
**and** clicks "Použiť kód" (`data-testid="verify-2fa-backup-submit-button"`)
**Then** the backup error element (`data-testid="verify-2fa-backup-error"`, `role="alert"`) shows "Záložný kód je neplatný alebo už bol použitý."
**and** the backup input retains its value (not cleared on failure)
**and** the URL remains `/login/verify-2fa`

---

## Edge cases

### TC-08: Already-AAL2 session → `beforeLoad` redirects immediately to /app

**Prerequisites**:
- A session seeded into localStorage with `currentLevel: "aal2"` (user already verified 2FA in a prior tab).
- Browser navigates to `http://localhost:8080/login/verify-2fa`.
- Viewport 1280×800.

**When** the `beforeLoad` guard runs on navigation
**Then** the browser is redirected to `/app` without ever rendering the card (`data-testid="verify-2fa-card"`)

### TC-09: Unauthenticated visit → `beforeLoad` redirects to /login

**Prerequisites**:
- No session in localStorage (clean browser state, no `sb-*-auth-token`).
- Browser navigates to `http://localhost:8080/login/verify-2fa`.
- Viewport 1280×800.

**When** the `beforeLoad` guard runs on navigation
**Then** the browser is redirected to `/login`
**and** the verify-2fa card is never rendered

### TC-10: AAL1 session with no verified TOTP factor → `beforeLoad` redirects to /login/enroll-2fa

**Prerequisites**:
- An AAL1 session seeded for a user with zero `status: "verified"` TOTP factors (factor list returns an empty array or only `status: "unverified"` entries).
- A `page.route` intercept on `**/auth/v1/factors**` returns `{ totp: [] }`.
- Browser navigates to `http://localhost:8080/login/verify-2fa`.
- Viewport 1280×800.

**When** the `beforeLoad` guard runs
**Then** the browser is redirected to `/login/enroll-2fa`

### TC-11: Switching to backup mode clears any existing TOTP error and hides the TOTP form

**Prerequisites**:
- AAL1 session seeded as in TC-01 with intercept for verify returning HTTP 422 to produce an error first.
- Browser at `http://localhost:8080/login/verify-2fa`.
- Viewport 1280×800.

**When** a bad TOTP code entry has triggered the error element (`data-testid="verify-2fa-error"`)
**and** the user clicks `data-testid="verify-2fa-use-backup-link"`
**Then** the TOTP form (`data-testid="verify-2fa-totp-form"`) is no longer visible
**and** the backup form (`data-testid="verify-2fa-backup-form"`) is visible
**and** no error element is present (neither `verify-2fa-error` nor `verify-2fa-backup-error`)

### TC-12: Switching back from backup mode to TOTP mode clears any backup error

**Prerequisites**:
- AAL1 session seeded as in TC-01.
- `consume_mfa_backup_code` intercept returns `false` (bad code) to produce a backup error.
- Browser at `http://localhost:8080/login/verify-2fa`, backup mode active, error visible.
- Viewport 1280×800.

**When** the user clicks `data-testid="verify-2fa-use-totp-link"`
**Then** the backup form is hidden
**and** the TOTP form is visible again
**and** neither error element is present in the DOM

### TC-13: Backup input value is uppercased automatically as the user types

**Prerequisites**:
- AAL1 session seeded as in TC-01.
- Browser at `http://localhost:8080/login/verify-2fa`, backup mode active (after clicking `verify-2fa-use-backup-link`).
- Viewport 1280×800.

**When** the user types `abcde-12345` (lowercase) into `data-testid="verify-2fa-backup-input"`
**Then** the displayed value in the input is `ABCDE-12345` (all uppercase)

### TC-14: Keyboard-only flow: Tab to OTP, paste 6 digits, Enter submits

**Prerequisites**:
- AAL1 session seeded as in TC-01 with verify intercept returning HTTP 200 (success).
- Browser at `http://localhost:8080/login/verify-2fa`.
- Viewport 1280×800.

**When** the OTP input (`data-testid="verify-2fa-code-input"`) receives focus (autofocus on mount)
**and** the user pastes the string `123456` via the keyboard shortcut (Ctrl+V / Cmd+V)
**and** presses Enter
**Then** the form submits (verify request is issued)
**and** the browser navigates to `/admin`

### TC-15: Mobile viewport (375×667) — card fits within viewport, OTP slots legible

**Prerequisites**:
- AAL1 session seeded as in TC-01.
- Browser at `http://localhost:8080/login/verify-2fa`.
- Viewport 375×667 (iPhone SE).

**When** the page finishes loading
**Then** the card (`data-testid="verify-2fa-card"`) fits within the viewport width with no horizontal overflow
**and** all 6 OTP slots are visible without scrolling
**and** the submit button and "Použiť záložný kód" link are both visible

### TC-16: Double-entry guard — second auto-submit is suppressed while first is in-flight

**Prerequisites**:
- AAL1 session seeded as in TC-01.
- A `page.route` intercept on the challenge endpoint introduces a 500 ms artificial delay.
- Browser at `http://localhost:8080/login/verify-2fa`.
- Viewport 1280×800.

**When** the user enters 6 digits triggering auto-submit
**and** before the in-flight request completes, the `code` state would attempt a second submit (e.g. due to a `useEffect` re-run)
**Then** exactly one challenge request and one verify request reach the Supabase endpoints
**and** the OTP input is disabled for the duration of the in-flight call (`submitting === true`)

### TC-17: XSS payload in OTP input does not execute

**Prerequisites**:
- AAL1 session seeded as in TC-01.
- The verify intercept returns HTTP 422 so the error path renders.
- Browser at `http://localhost:8080/login/verify-2fa`.
- Viewport 1280×800.

**When** the user manages to inject `<script>window.__xss=1</script>` via the OTP input (e.g. by pasting into the underlying hidden input)
**and** the error element renders
**Then** `window.__xss` is `undefined` in the page context
**and** the error text is rendered as plain text, not evaluated HTML

### TC-18: Valid backup code → navigates to default /admin target

**Prerequisites**:
- AAL1 session seeded as in TC-01.
- A `page.route` intercept on `**/rest/v1/rpc/consume_mfa_backup_code**` returns HTTP 200 with body `true`.
- Browser at `http://localhost:8080/login/verify-2fa`, backup mode active.
- Viewport 1280×800.

**When** the user types a valid-looking backup code into `data-testid="verify-2fa-backup-input"`
**and** clicks `data-testid="verify-2fa-backup-submit-button"`
**Then** the `consume_mfa_backup_code` RPC is called with the uppercased, trimmed code
**and** the browser navigates to `/admin`

---

## Open questions

- The component maps error messages containing `"invalid"` or `"code"` → `error_invalid` and everything else → `error_generic`. Supabase may return `"expired"` as a separate string not matching either branch — the TC-05 assertion relies on the error message text containing `"expired"`, which currently falls into the `error_generic` branch unless explicitly handled. Confirm whether `error_expired` is wired to a distinct catch branch, or remove TC-05's distinct-message assertion and align it with `error_generic`.
- `beforeLoad` guard for already-AAL2 users currently redirects to `/app`, not `/admin`. Verify with product whether an admin who re-visits `/login/verify-2fa` with an AAL2 session should land at `/admin` instead (TC-08 documents the current `/app` behavior).
- Backup code path does not call `supabase.auth.mfa.verify` — it relies solely on the `consume_mfa_backup_code` DB function to act as the AAL2-equivalent gate. Confirm whether the Supabase session's `currentLevel` is actually upgraded to `aal2` after a backup-code success, or whether downstream admin guards need to accept the recovery path separately.
