# Admin Security — test plan

**Route:** `/admin/security`
**Component(s) under test:** `src/routes/admin/security.lazy.tsx`
**Auth requirement:** admin role + AAL2 session (`ADMIN_SESSION` via `setupAdmin`)
**i18n source:** `src/i18n/locales/sk/admin.json` → `security.*`

---

## Prerequisites (all TCs)

- Admin session seeded via `setupAdmin(context, page, extras)`.
- `mfa_backup_codes` table mocked with appropriate row count.
- `generate_mfa_backup_codes` RPC mocked when the backup regen flow is exercised.

---

## Happy paths

### TC-01: Security page renders overview cards with factor status and backup-code count

**Prerequisites:**
- Admin session with one verified TOTP factor (`ADMIN_SESSION` — factor id `ADMIN_FACTOR_ID`, friendly name "primary").
- `mfa_backup_codes` seeded with 5 unused rows (count = 5).

**When** the admin navigates to `/admin/security`.

**Then** the page root (`admin-security-root`) is visible.

**and** the factor card (`admin-security-factor-card`) is visible.

**and** the factor's friendly name (`admin-security-factor-friendly-name`) shows "primary".

**and** the factor status badge (`admin-security-factor-status`) shows "Aktívne".

**and** the backup card (`admin-security-backup-card`) is visible.

**and** the backup count paragraph (`admin-security-backup-count`) contains "Zostáva 5 záložných kódov".

**and** the low-backup warning (`admin-security-backup-warning`) is NOT in the DOM.

**and** the info card (`admin-security-info-card`) is visible.

---

### TC-02: No-factor empty state shows enrollment CTA

**Prerequisites:**
- Admin session whose auth `/factors` endpoint returns `{ all: [], totp: [] }` (override via `page.route`).
- `mfa_backup_codes` seeded with 0 rows.

**When** the admin navigates to `/admin/security`.

**Then** the no-factor banner (`admin-security-factor-none`) is visible.

**and** the enrollment CTA link (`admin-security-factor-none-cta`) is visible and contains "Spustiť enrollment".

**and** the reset button (`admin-security-factor-reset-button`) is NOT in the DOM.

---

### TC-03: Backup-code regeneration flow reveals the new-codes panel

**Prerequisites:**
- Admin session with one verified TOTP factor.
- `mfa_backup_codes` seeded with 5 unused rows.
- `generate_mfa_backup_codes` RPC returns `["AAAA-1111","BBBB-2222","CCCC-3333","DDDD-4444","EEEE-5555","FFFF-6666","GGGG-7777","HHHH-8888"]`.

**When** the admin navigates to `/admin/security`.

**and** clicks "Vygenerovať nové záložné kódy" (`admin-security-backup-regen-button`).

**Then** the confirm dialog (`app-shell-confirm-dialog-root`) is visible.

**and** the dialog title (`app-shell-confirm-dialog-title`) shows "Vygenerovať nové kódy?".

**When** the admin clicks the confirm button (`app-shell-confirm-dialog-confirm`).

**Then** the new-codes panel (`admin-security-new-codes-panel`) is visible.

**and** the first code item (`admin-security-new-code-AAAA-1111`) is visible.

**and** the copy button (`admin-security-new-codes-copy`) is visible with label "Skopírovať".

**and** the download button (`admin-security-new-codes-download`) is visible with label "Stiahnuť .txt".

**and** the dismiss button (`admin-security-new-codes-dismiss`) is visible with label "Hotovo".

---

## Edge cases

### TC-04: Low-backup warning renders when fewer than 3 codes remain

**Prerequisites:**
- Admin session with one verified TOTP factor.
- `mfa_backup_codes` seeded with 2 unused rows (count = 2, which is below the `LOW_BACKUP_THRESHOLD` of 3).

**When** the admin navigates to `/admin/security`.

**Then** the backup count paragraph (`admin-security-backup-count`) contains "Zostáva 2 záložných kódov".

**and** the low-backup warning paragraph (`admin-security-backup-warning`) is visible.

**and** the warning contains "Máte málo nepoužitých kódov — odporúčame vygenerovať novú sadu."
