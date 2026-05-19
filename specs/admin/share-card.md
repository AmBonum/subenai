# Admin CMS Share Card — test plan

**Area:** admin
**Component(s) under test:** `src/routes/admin/share-card.lazy.tsx`
**Locale keys:** `src/i18n/locales/sk/cms.json` → `shareCard.*`
**DB table:** `share_card_config` (singleton, id = 1; column: `branding` JSONB)

---

## Happy paths

### TC-01: Page renders the form with all three inputs, preview, and save button

**Prerequisites:** Admin session active. `share_card_config` row seeded with a non-empty
`title_fallback` so the save button is enabled.

**When** the admin navigates to `/admin/share-card`.

**Then** the form root is visible.

**and** the OG template URL input is visible.

**and** the title fallback input is visible.

**and** the description fallback textarea is visible.

**and** the preview panel is visible.

**and** the save button labelled `"Uložiť"` is visible and enabled.

---

### TC-02: Edit text fields and submit → success toast fires

**Prerequisites:** Admin session active. `share_card_config` row seeded with a non-empty
`title_fallback`.

**When** the admin navigates to `/admin/share-card`.

**and** fills the OG template URL input with `"https://example.com/og.png"`.

**and** fills the title fallback input with `"Subenai – test IQ"`.

**and** fills the description fallback textarea with `"Otestuj sa teraz."`.

**and** clicks the save button.

**Then** a success toast containing `"Share karta uložená."` appears.

---

## Negative scenarios

### TC-03: Empty title fallback → save button is disabled and error message appears

**Prerequisites:** Admin session active. `share_card_config` row seeded with an empty
`title_fallback`.

**When** the admin navigates to `/admin/share-card`.

**Then** the save button is disabled.

**and** the inline validation message `"Predvolený názov je povinný."` is visible.
