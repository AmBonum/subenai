# 2FA enrollment page — test plan

**Area:** `specs/auth/`
**Component(s) under test:** `src/routes/login_.enroll-2fa.tsx`, `src/lib/auth/mfa.ts`
**Routes:** `/login/enroll-2fa`
**API endpoints:** `POST /auth/v1/factors` (`enrollTotp` → `supabase.auth.mfa.enroll`), `POST /auth/v1/factors/{id}/challenge` (`challengeAndVerify`), `POST /auth/v1/factors/{id}/verify` (`challengeAndVerify`), `POST /rpc/generate_mfa_backup_codes`
**Data dependencies:** Supabase Auth user records; `mfa_backup_codes` table (written by `generate_mfa_backup_codes` RPC); `has_role` RPC (determines issuer label shown in the authenticator app)
**Source stories:** _None — pre-story feature (AH-12.2); intent inferred from `src/routes/login_.enroll-2fa.tsx` + `src/lib/auth/mfa.ts` + `src/i18n/locales/sk/security.json`._
**Last updated:** 2026-05-19

---

## Context

The 2FA enrollment page at `/login/enroll-2fa` is a four-step TOTP setup wizard for admin-tier users. After a first-factor login (AAL1) succeeds and Supabase confirms the user has no verified TOTP factor, `post-login-redirect` routes the admin here. The wizard walks through: (1) download-authenticator prompt, (2) QR code + manual secret display, (3) 6-digit code verification against Supabase MFA endpoints, (4) single-display backup codes with copy and download affordances. On completion the user's session is upgraded to AAL2 and they are redirected to `/app`. The page carries a `beforeLoad` guard that redirects unauthenticated visitors to `/login` and already-AAL2 visitors (or those with an existing verified factor) to `/app` or `/login/verify-2fa` respectively.

## Out of scope

- The `/login/verify-2fa` step used when the user _already_ has a verified factor — separate spec.
- Admin post-enrollment routing beyond `/app` (e.g. `/admin` navigation, role-gated content) — the enrollment wizard's job ends at the redirect.
- The `has_role` issuer-selection branch at runtime (whether the QR encodes `subenai.sk admin` vs `subenai.sk`) — integration concern, not UI behavior; the QR image renders the same regardless.
- Real TOTP cryptographic correctness — the secret-to-code math is Supabase's responsibility; only the client-side call sequence and UI state are tested here.
- Backup-code consumption at `/login/verify-2fa` — separate spec.
- The `/app/account/security` 2FA management card that allows unenrolling and regenerating backup codes — separate spec.
- E-mail or SMS second factors — Supabase TOTP is the only factor type used here.
- Actual QR scanability on a physical phone — cannot be automated; verified manually.

---

## Happy paths

### TC-01: Step 1 renders all expected UI elements for an AAL1 admin session

**Priority:** P1

**Prerequisites**:
- A synthetic AAL1 Supabase session (no verified TOTP factor) is seeded via `primeAuthSession` or `page.evaluate(() => supabase.auth.setSession({...}))` before navigation.
- `**/auth/v1/factors**` (GET, listing factors) intercepted to return `{ totp: [] }` (no existing factors) so `beforeLoad` proceeds.
- `**/auth/v1/factors**` (GET for AAL check) intercepted to return `currentLevel: "aal1"`.
- Browser navigates to `http://localhost:8080/login/enroll-2fa`.
- Viewport 1280×800.

**When** the page finishes loading
**Then** the card element is visible (`data-testid="enroll-2fa-card"`)
**and** the heading "Dvojfaktorové overenie" is visible (`data-testid="enroll-2fa-heading"`)
**and** the subheading "Zabezpečte si účet jednorázovým kódom z autentifikátora." is visible (`data-testid="enroll-2fa-subheading"`)
**and** the step indicator reads "Krok 1 zo 4" (`data-testid="enroll-2fa-step-indicator"`)
**and** the step-1 panel is visible (`data-testid="enroll-2fa-step-1"`)
**and** the continue button labelled "Pokračovať" is visible (`data-testid="enroll-2fa-step-1-continue"`)

### TC-02: Step 2 shows QR code and manual secret after clicking continue on step 1

**Priority:** P1

**Prerequisites**:
- Same session seed and factor-list intercept as TC-01.
- `**/auth/v1/factors**` (POST, enrollment) intercepted to return `{ id: "factor-abc", totp: { qr_code: "data:image/png;base64,ABC", secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://totp/..." } }`.
- `**/rest/v1/rpc/has_role**` intercepted to return `true` (admin, so issuer = `"subenai.sk admin"`).
- Browser at `/login/enroll-2fa`, step 1 visible.
- Viewport 1280×800.

**When** the user clicks the button "Pokračovať" (`data-testid="enroll-2fa-step-1-continue"`)
**Then** the step indicator reads "Krok 2 zo 4"
**and** the QR image element is visible (`data-testid="enroll-2fa-qr-image"`) with a non-empty `src` attribute starting with `data:image`
**and** the manual secret code element is visible (`data-testid="enroll-2fa-manual-secret"`) with non-empty text content
**and** the continue button (`data-testid="enroll-2fa-step-2-continue"`) is enabled (not disabled)

### TC-03: Valid 6-digit TOTP code enrolls the factor and advances to backup-codes step

**Priority:** P1

**Prerequisites**:
- Session, factor-list, and enrollment intercepts as in TC-02.
- `**/auth/v1/factors/factor-abc/challenge**` intercepted to return `{ id: "chal-xyz", ... }`.
- `**/auth/v1/factors/factor-abc/verify**` intercepted to return HTTP 200 (empty success body).
- `**/rest/v1/rpc/generate_mfa_backup_codes**` intercepted to return `["aaa-bbb", "ccc-ddd", "eee-fff", "ggg-hhh", "iii-jjj", "jjj-kkk", "lll-mmm", "nnn-ooo"]`.
- Browser is at step 3 of the wizard (steps 1 and 2 clicked through).
- Viewport 1280×800.

**When** the user enters `123456` into the OTP input (`data-testid="enroll-2fa-code-input"`)
**and** clicks the button "Overiť" (`data-testid="enroll-2fa-verify-button"`)
**Then** a POST is dispatched to `/auth/v1/factors/factor-abc/challenge`
**and** a POST is dispatched to `/auth/v1/factors/factor-abc/verify` with `code: "123456"`
**and** the step indicator reads "Krok 4 zo 4"
**and** the backup codes list is visible (`data-testid="enroll-2fa-backup-codes-list"`) containing exactly 8 code items
**and** no error element (`data-testid="enroll-2fa-error"`) is present

### TC-04: Clicking "Pokračovať na admin" from step 4 navigates to /app

**Priority:** P1

**Prerequisites**:
- Browser is at step 4 with the backup-codes list rendered (flow continuation from TC-03 or intercepts replayed).
- Viewport 1280×800.

**When** the user clicks the button "Pokračovať na admin" (`data-testid="enroll-2fa-step-4-continue"`)
**Then** the browser navigates to `/app`

---

## Negative scenarios

### TC-05: Invalid TOTP code shows the Slovak error message and does not advance

**Priority:** P1

**Prerequisites**:
- Session, factor-list, and enrollment intercepts as in TC-02.
- `**/auth/v1/factors/factor-abc/challenge**` returns a challenge.
- `**/auth/v1/factors/factor-abc/verify**` returns HTTP 422 with body `{ message: "Invalid TOTP code" }`.
- Browser is at step 3.
- Viewport 1280×800.

**When** the user enters `000000` into the OTP input
**and** clicks "Overiť"
**Then** the error element (`data-testid="enroll-2fa-error"`) is visible with the exact text "Kód nie je správny. Skúste znova."
**and** the step indicator still reads "Krok 3 zo 4" (no advance)
**and** the verify button (`data-testid="enroll-2fa-verify-button"`) is re-enabled after the response

### TC-06: Enrollment server error shows the generic Slovak error message

**Priority:** P1

**Prerequisites**:
- Session and factor-list intercepts as in TC-01.
- `**/auth/v1/factors**` (POST, enrollment) returns HTTP 500 with any body.
- Browser is at step 1, then step 2 is clicked.
- Viewport 1280×800.

**When** the user clicks "Pokračovať" to advance to step 2 and `enrollTotp` throws
**Then** the error element (`data-testid="enroll-2fa-error"`) is visible with the exact text "Nastala chyba. Skúste to znova."
**and** no QR image appears (`data-testid="enroll-2fa-qr-image"` is absent)
**and** the continue button on step 2 (`data-testid="enroll-2fa-step-2-continue"`) is disabled (because `qrCode` is still null)

### TC-07: Unauthenticated visitor is redirected to /login by beforeLoad

**Priority:** P1

**Prerequisites**:
- No session in localStorage (clean state).
- `supabase.auth.getSession()` returns `{ data: { session: null } }`.
- Browser navigates to `http://localhost:8080/login/enroll-2fa`.
- Viewport 1280×800.

**When** the page's `beforeLoad` runs and finds no session
**Then** the browser is redirected to `/login`
**and** the enrollment card (`data-testid="enroll-2fa-card"`) is never rendered

### TC-08: Already-AAL2 visitor is redirected to /app by beforeLoad

**Priority:** P1

**Prerequisites**:
- A valid AAL2 session seeded into localStorage.
- `getAALStatus()` returns `currentLevel: "aal2"`.
- Browser navigates to `http://localhost:8080/login/enroll-2fa`.
- Viewport 1280×800.

**When** the page's `beforeLoad` checks the AAL level and finds `aal2`
**Then** the browser is redirected to `/app`
**and** the enrollment card is never rendered

### TC-09: User with an existing verified factor is redirected to /login/verify-2fa

**Priority:** P1

**Prerequisites**:
- A valid AAL1 session seeded.
- `getAALStatus()` returns `currentLevel: "aal1"`.
- `listFactors()` returns `{ totp: [{ id: "factor-xyz", status: "verified" }] }`.
- Browser navigates to `http://localhost:8080/login/enroll-2fa`.
- Viewport 1280×800.

**When** `beforeLoad` detects a verified TOTP factor already on the account
**Then** the browser is redirected to `/login/verify-2fa`
**and** the enrollment card is never rendered

---

## Edge cases

### TC-10: Step 2 continue button is disabled while QR fetch is in flight

**Priority:** P1

**Prerequisites**:
- Session and factor-list intercepts as in TC-01.
- `**/auth/v1/factors**` (POST) delayed by 500 ms before responding with a valid enrollment payload.
- Browser at step 2 immediately after transition from step 1.
- Viewport 1280×800.

**When** the step 2 panel renders before the enrollment response arrives
**Then** the continue button (`data-testid="enroll-2fa-step-2-continue"`) has the `disabled` attribute while `qrCode` is `null`
**and** the loading indicator (`data-testid="enroll-2fa-qr-loading"`) showing `"..."` is visible
**and** after the response arrives the continue button becomes enabled and the QR image replaces the loading indicator

### TC-11: OTP input does not accept non-digit characters

**Priority:** P1

**Prerequisites**:
- Browser at step 3 of the wizard.
- Viewport 1280×800.

**When** the user types `abc!@-` into the OTP input (`data-testid="enroll-2fa-code-input"`)
**Then** the input value remains empty (the `InputOTP` component's pattern restricts to digits only)
**and** the verify button remains disabled (because `code.length !== 6`)

### TC-12: Verify button is disabled until exactly 6 digits are entered

**Priority:** P1

**Prerequisites**:
- Browser at step 3 of the wizard.
- Viewport 1280×800.

**When** the user has typed 5 digits into the OTP input
**Then** the verify button (`data-testid="enroll-2fa-verify-button"`) has the `disabled` attribute
**and** when the user types the 6th digit the button becomes enabled
**and** if the user then clears the input the button becomes disabled again

### TC-13: Double-submitting the verify form dispatches exactly one challenge+verify pair

**Priority:** P1

**Prerequisites**:
- Session, enrollment, and challenge intercepts as in TC-03.
- `**/auth/v1/factors/factor-abc/verify**` delayed by 400 ms before returning HTTP 200.
- `**/rest/v1/rpc/generate_mfa_backup_codes**` returns a valid list.
- Browser at step 3 with `123456` entered.
- Viewport 1280×800.

**When** the user double-clicks "Overiť" in rapid succession
**Then** exactly one challenge request and one verify request reach the Supabase MFA endpoints
**and** the button has the `disabled` attribute for the duration of the in-flight request (the `submitting` state guard prevents the second click)

### TC-14: Network abort during verify shows generic error and re-enables the button

**Priority:** P1

**Prerequisites**:
- Session, enrollment, and challenge intercepts as in TC-03.
- `**/auth/v1/factors/factor-abc/verify**` intercepted to call `route.abort()`.
- Browser at step 3 with `123456` entered.
- Viewport 1280×800.

**When** the user clicks "Overiť" and the verify request is aborted
**Then** the error element (`data-testid="enroll-2fa-error"`) is visible with the text "Nastala chyba. Skúste to znova."
**and** the verify button is re-enabled after the failure (the `finally` block clears `submitting`)
**and** the wizard stays on step 3

### TC-15: Verify button label changes to "Overujem..." while the request is in flight

**Priority:** P2

**Prerequisites**:
- Session, enrollment, and challenge intercepts as in TC-03.
- `**/auth/v1/factors/factor-abc/verify**` delayed by 500 ms before returning HTTP 200.
- `**/rest/v1/rpc/generate_mfa_backup_codes**` returns a valid list.
- Browser at step 3 with `123456` entered.
- Viewport 1280×800.

**When** the user clicks "Overiť"
**Then** within 100 ms the button label changes to "Overujem..."
**and** the button has the `disabled` attribute for the duration
**and** after the response the wizard advances to step 4

### TC-16: Backup codes copy button shows "Skopírované" feedback then reverts

**Priority:** P2

**Prerequisites**:
- Browser is at step 4 with backup codes rendered (flow as in TC-03).
- Clipboard API available (Playwright grants clipboard permissions by default in chromium).
- Viewport 1280×800.

**When** the user clicks the "Skopírovať" button (`data-testid="enroll-2fa-backup-copy-button"`)
**Then** the button label changes to "Skopírované"
**and** within 2 seconds the label reverts to "Skopírovať"
**and** the clipboard contents match the backup codes joined by newlines

### TC-17: Backup codes download button triggers a .txt file download named "subenai-backup-codes.txt"

**Priority:** P2

**Prerequisites**:
- Browser is at step 4 with backup codes rendered.
- Playwright `page.waitForEvent("download")` listener is registered before the click.
- Viewport 1280×800.

**When** the user clicks the "Stiahnuť ako .txt" button (`data-testid="enroll-2fa-backup-download-button"`)
**Then** a download event fires with the suggested filename `"subenai-backup-codes.txt"`
**and** the downloaded file's text content matches the backup codes joined by newlines

### TC-18: Page carries noindex,nofollow robots directive and correct title

**Priority:** P2

**Prerequisites**:
- Session seeded as in TC-01 so `beforeLoad` does not redirect.
- Browser navigates to `http://localhost:8080/login/enroll-2fa`.
- Viewport 1280×800.

**When** the page finishes loading
**Then** the `<meta name="robots">` tag has content `"noindex,nofollow"`
**and** the page `<title>` is `"Dvojfaktorové overenie · SubenAI"`

### TC-19: Mobile viewport (375×667) keeps the enrollment card inside the viewport

**Priority:** P2

**Prerequisites**:
- Session seeded as in TC-01.
- Browser navigates to `http://localhost:8080/login/enroll-2fa` at step 1.
- Viewport 375×667 (iPhone SE).

**When** the page finishes loading
**Then** the card element (`data-testid="enroll-2fa-card"`) is fully within the viewport width (no horizontal overflow)
**and** the step title, body text, and "Pokračovať" button are all visible without horizontal scrolling

---

## Missing `data-testid` values to add to source

The following elements are referenced by TCs above but lack a `data-testid` in the current source (`src/routes/login_.enroll-2fa.tsx`). They must be added to the source file before the generator can produce stable locators:

- The step-1 title: `<h2 data-testid="enroll-2fa-step-1-title">` — present in source; already assigned.
- The step-1 body: `<p data-testid="enroll-2fa-step-1-body">` — present; already assigned.
- The form at step 3: `<form data-testid="enroll-2fa-step-3">` — **present; already assigned.**
- The step-4 backup-code individual `<li>` items use dynamic IDs (`enroll-2fa-backup-code-{c}`) — the generator must assert the list container (`enroll-2fa-backup-codes-list`) and count child items rather than asserting individual codes whose values are unknown at plan time.
- **No missing `data-testid` values detected.** All elements asserted in this plan have corresponding `data-testid` attributes in the source file.

---

## Open questions

- **`beforeLoad` intercept mechanics.** The `beforeLoad` guard calls `supabase.auth.mfa.listFactors()` and `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` — both go through the Supabase REST API. The generator must confirm the exact URL patterns (`**/auth/v1/factors**` GET for list, and the AAL endpoint) so the intercepts in TC-07 through TC-09 target the right routes.
- **Step 3 OTP input `data-testid` propagation.** The `InputOTP` component receives `data-testid="enroll-2fa-code-input"` as a prop but it may be applied to the container rather than the actual `<input>` element. The generator must verify whether Playwright should target the container or the underlying input slot for `.fill()` / `.type()` actions, and adjust the POM accordingly.
- **Backup-code uniqueness after test run.** `generate_mfa_backup_codes` is a `SECURITY DEFINER` RPC that writes to `mfa_backup_codes`. Tests that reach step 4 against a real Supabase instance will insert rows. Decide whether to use a dedicated test-user account whose backup codes are cleared between runs, or mock the RPC universally (recommended for CI).
- **Challenge endpoint URL pattern.** The Supabase JS client calls challenge and verify as `POST /auth/v1/factors/{factorId}/challenge` and `POST /auth/v1/factors/{factorId}/verify`. The generator must parameterize the intercept with the factor ID returned by the enrollment mock rather than hardcoding `factor-abc`.
