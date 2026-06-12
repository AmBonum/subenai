# Admin Settings — test plan

**Route:** `/admin/settings`  
**Component(s) under test:** `src/routes/admin/settings.lazy.tsx`  
**i18n source:** `src/i18n/locales/sk/admin.json` — `settings.*` keys  
**Project:** `e2e-chromium`

---

## Context

E40 close-out replaced the old placeholder form with a **read-only GDPR/compliance
dashboard**. The page surfaces build-time env-var state (DPA flow, draft watermark),
the DPA template version, the contact-data retention window, the sub-processor
register (art. 28(3)(g) GDPR), a link to the per-admin notification preferences,
and the E40 runbook link. There are no editable controls — changing a value requires
a redeploy and/or SQL migration, per the runbook.

No Supabase table mocks are required; all values are compiled in.

---

## Happy paths

### TC-01: Page renders the root, read-only notice, and all four DPA rows

**Prerequisites:** Admin session active; navigate to `/admin/settings`.

**When** the page loads

**Then** the settings root (`admin-settings-root`) is visible  
**and** the read-only notice (`admin-settings-readonly-notice`) is visible and contains
"Tieto hodnoty sú nastavené pri build-time"  
**and** the DPA section (`admin-settings-dpa-section`) renders the four rows:
`admin-settings-dpa-flow`, `admin-settings-dpa-watermark`, `admin-settings-dpa-version`,
`admin-settings-dpa-retention`

---

### TC-02: Sub-processor register lists the active third parties

**Prerequisites:** Admin session active; navigate to `/admin/settings`.

**When** the page loads

**Then** the sub-processor section (`admin-settings-subprocessors-section`) is visible  
**and** the list (`admin-settings-subprocessors-list`) renders
`admin-settings-subprocessor-supabase-inc`, `admin-settings-subprocessor-cloudflare-inc`,
and `admin-settings-subprocessor-resend-inc`

---

### TC-03: Navigation links

**Prerequisites:** Admin session active; navigate to `/admin/settings`.

**When** the page loads

**Then** the runbook link (`admin-settings-runbook-link`) points at
`https://github.com/AmBonum/subenai/blob/main/tasks/E40-runbook.md`

**When** the user clicks the notifications link (`admin-settings-notifications-link`)

**Then** the URL becomes `/admin/settings/notifications`
