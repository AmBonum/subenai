# Account Security Page — test plan

**Route:** `/app/account/security`
**Component(s) under test:** `src/routes/app.account.security.tsx`, `src/components/auth/BackupCodesManager.tsx`
**Playwright project:** `e2e-chromium`
**Spec file:** `e2e/specs/app/account-security.spec.ts`
**Last updated:** 2026-06-11 (fake-surface removal + real password change)

---

## Context

The security page exposes two surfaces to an authenticated educator:

1. **Password card** — a REAL password-change form wired to
   `supabase.auth.updateUser({ password })` (PUT `/auth/v1/user`): new
   password + confirm inputs, strength indicator, recommendation list,
   inline Slovak error states (mismatch, min 8 chars, `same_password`,
   `weak_password`, `reauthentication_needed` → links `/forgot-password`),
   a success toast "Heslo bolo zmenené.", and a permanent fallback link to
   `/forgot-password`. For OAuth-only accounts (no `email` identity in
   `app_metadata.providers` / `identities`) the form is replaced by an
   explanatory note ("Prihlasuješ sa cez Google").
2. **2FA card** — when no verified TOTP factor exists, shows an
   "Aktivovať 2FA" CTA; when a verified factor exists, shows the active
   badge, a deactivate button, and the `BackupCodesManager`.

The former hardcoded "Aktívne sedenia" card (three fabricated devices with
a no-op revoke toast) was DELETED on 2026-06-11 — a security surface must
not render fictional data. TC-01 asserts it stays gone.

Session: `EDUCATOR_SESSION` (AAL1, no verified TOTP factors). The
`setupEducator` helper primes consent + auth + all table mocks in one call.
The auth fixture fulfills every method on `**/auth/v1/user**`; password
tests register a per-test route override to capture the PUT payload or
return GoTrue error bodies.

---

## Happy paths

### TC-01: Page renders password form, forgot-password fallback and 2FA CTA; no fabricated sessions card

**Prerequisites:** Authenticated as educator (no verified TOTP factor). Viewport 1280×800.

**When** the user navigates to `/app/account/security`.

**Then** the password form is visible.

**And** the `/forgot-password` fallback link is visible.

**And** the legacy sessions list (`app-account-security-sessions-list`) has count 0 and the text "Aktívne sedenia" does not appear.

**And** the "Aktivovať 2FA" button is visible; the 2FA active badge and deactivate button are hidden.

---

### TC-02: Clicking "Aktivovať 2FA" navigates to /login/enroll-2fa

**Prerequisites:** Authenticated as educator (no verified TOTP factor). Viewport 1280×800.

**When** the user navigates to `/app/account/security` and clicks "Aktivovať 2FA".

**Then** the browser URL changes to `/login/enroll-2fa`.

---

### TC-03: Submit stays disabled until both password inputs are non-empty

**When** the user fills only the new-password field, the submit stays disabled; after filling the confirm field it becomes enabled.

---

### TC-04: Mismatching passwords show "Heslá sa nezhodujú." and skip the API call

**When** the user submits two different passwords.

**Then** the inline error reads exactly "Heslá sa nezhodujú." and no PUT reaches `/auth/v1/user`.

---

### TC-05: Valid submission PUTs the password and confirms via toast

**When** the user submits a valid matching pair (≥ 8 chars).

**Then** PUT `/auth/v1/user` carries `{ password: <value> }`, the Sonner toast "Heslo bolo zmenené." appears, and both inputs are cleared.

---

### TC-06: reauthentication_needed maps to the Slovak message linking /forgot-password

**Prerequisites:** PUT `/auth/v1/user` stubbed to 403 `{ error_code: "reauthentication_needed" }`.

**Then** the inline error contains "Z bezpečnostných dôvodov" and a link with `href="/forgot-password"`.

---

### TC-07: OAuth-only account sees the explanatory note instead of the form

**Prerequisites:** GET `/auth/v1/user` stubbed with `app_metadata.providers = ["google"]`, `identities = [{ provider: "google" }]`.

**Then** the note "Prihlasuješ sa cez Google" renders and the password form has count 0.

---

### TC-08 (@mobile): Password form renders full-width on Pixel 7 without horizontal overflow
