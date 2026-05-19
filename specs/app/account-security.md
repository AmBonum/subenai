# Account Security Page — test plan

**Route:** `/app/account/security`
**Component(s) under test:** `src/routes/app.account.security.tsx`, `src/components/auth/BackupCodesManager.tsx`
**Playwright project:** `e2e-chromium`
**Spec file:** `e2e/specs/app/account-security.spec.ts`

---

## Context

The security page exposes three surfaces to an authenticated educator:

1. **Password card** — a form with two password inputs and a strength indicator.
2. **Sessions card** — a static list of three sessions; non-current sessions carry a "Odhlásiť" revoke button.
3. **2FA card** — when no verified TOTP factor exists, shows an "Aktivovať 2FA" CTA; when a verified factor exists, shows the active badge, a deactivate button, and the `BackupCodesManager`.

Session: `EDUCATOR_SESSION` (AAL1, no verified TOTP factors). The `setupEducator` helper primes consent + auth + all table mocks in one call.

---

## Happy paths

### TC-01: Page renders password form, sessions list, and 2FA activate CTA (no enrolled factor)

**Prerequisites:** Authenticated as educator (no verified TOTP factor). Viewport 1280×800.

**When** the user navigates to `/app/account/security`.

**Then** the password form is visible.

**And** the sessions list is visible.

**And** the "Aktivovať 2FA" button is visible.

**And** the 2FA active badge and deactivate button are hidden.

---

### TC-02: Clicking "Aktivovať 2FA" navigates to /login/enroll-2fa

**Prerequisites:** Authenticated as educator (no verified TOTP factor). Viewport 1280×800.

**When** the user navigates to `/app/account/security`.

**And** clicks the button labelled "Aktivovať 2FA".

**Then** the browser URL changes to `/login/enroll-2fa`.

---

### TC-03: Clicking "Odhlásiť" on a non-current session shows the revocation toast

**Prerequisites:** Authenticated as educator (no verified TOTP factor). Viewport 1280×800.

**When** the user navigates to `/app/account/security`.

**And** clicks the "Odhlásiť" button for session `s2` (non-current, "iPhone · Safari").

**Then** a Sonner toast is visible with the text "Sedenie ukončené".
