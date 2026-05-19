# Admin Settings — test plan

**Route:** `/admin/settings`  
**Component(s) under test:** `src/routes/admin/settings.lazy.tsx`  
**i18n source:** `src/i18n/locales/sk/admin.json` — `settings.*` keys  
**Project:** `e2e-chromium`

---

## Context

The page renders global platform preferences in three sections (feature flags, data retention, branding) inside a single form. Because the backend is explicitly deferred, `onSubmit` fires a Sonner info toast rather than a real mutation. No Supabase table mocks are required.

---

## Happy paths

### TC-01: Page renders the settings root, deferred notice, and all form sections

**Prerequisites:** Admin session active; navigate to `/admin/settings`.

**When** the page loads

**Then** the settings root is visible  
**and** the deferred notice card is visible  
**and** the settings form is visible  
**and** the feature-flags switch for `ai_generator` is visible  
**and** the feature-flags switch for `audit_exports` is visible  
**and** the feature-flags switch for `trap_popup` is visible  
**and** the retention input is visible  
**and** the branding primary-color input is visible  
**and** the submit button is visible and enabled

---

### TC-02: Submit fires the info toast

**Prerequisites:** Admin session active; navigate to `/admin/settings`; the form is visible.

**When** the user clicks the submit button labelled "Uložiť"

**Then** a Sonner toast appears within 4 s  
**and** the toast contains the text "Backend pre nastavenia ešte nie je nasadený, hodnoty sa neuložia po obnovení stránky."

---

## Edge cases

### TC-03: Toggle a feature flag switches the switch state

**Prerequisites:** Admin session active; navigate to `/admin/settings`; the `audit_exports` switch is initially **off** (unchecked).

**When** the user clicks the `audit_exports` switch

**Then** the `audit_exports` switch becomes checked (aria-checked = "true")

**When** the user clicks the `audit_exports` switch again

**Then** the `audit_exports` switch returns to unchecked (aria-checked = "false")
