# Admin CMS Header — test plan

**Area:** admin
**Component(s) under test:** `src/routes/admin/header.lazy.tsx`
**Locale keys:** `src/i18n/locales/sk/cms.json` → `headerAdmin.*`
**DB table:** `cms_header` (singleton, id = 1; columns: `logo`, `nav` JSONB)

---

## Happy paths

### TC-01: Page renders the form with all four inputs and the save button

**Prerequisites:** Admin session active. `cms_header` row seeded with empty strings.

**When** the admin navigates to `/admin/header`.

**Then** the form root is visible.

**and** the logo URL input is visible.

**and** the CTA label input is visible.

**and** the CTA URL input is visible.

**and** the mobile trigger label input is visible.

**and** the save button labelled `"Uložiť hlavičku"` is visible and enabled.

---

### TC-02: Edit fields and submit → success toast fires

**Prerequisites:** Admin session active. `cms_header` row seeded with empty strings.

**When** the admin navigates to `/admin/header`.

**and** clears the logo URL input and types `"https://new.example.com/logo.png"`.

**and** clears the CTA label input and types `"Nový CTA"`.

**and** clicks the save button.

**Then** a success toast containing `"Hlavička uložená."` appears.

---

## Negative scenarios

### TC-03: Mutation error → error toast fires

**Prerequisites:** Admin session active. `cms_header` table mocked to return a 500
error on PATCH.

**When** the admin navigates to `/admin/header`.

**and** types any value into the logo URL input (triggering an immediate optimistic
`mutate` call).

**Then** an error toast is visible within 4 s.
