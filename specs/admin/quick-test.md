# Admin Quick Test Config — test plan

**Area:** admin
**Component(s) under test:** `src/routes/admin/quick-test.lazy.tsx`
**Locale keys:** `src/i18n/locales/sk/cms.json` → `quickTest.*`
**DB table:** `quick_test_config` (singleton, id = 1; column: `config` JSONB)

---

## Happy paths

### TC-01: Page renders config form with current settings prefilled

**Prerequisites:** Admin session active. `quick_test_config` row seeded with
`{ config: { visible: true, title: "Demo test", description: "Popis testu",
branza: "Všeobecný test", time_seconds: 120, pass_percentage: 60,
difficulty: "Ľahká", question_ids: [] } }`.

**When** the admin navigates to `/admin/quick-test`.

**Then** the config form root is visible.

**and** the visibility toggle is visible.

**and** the title input is visible and contains `"Demo test"`.

**and** the description textarea is visible and contains `"Popis testu"`.

**and** the branza select trigger is visible.

**and** the time input is visible and contains `"120"`.

**and** the pass percentage input is visible and contains `"60"`.

**and** the difficulty select trigger is visible.

**and** the save button labelled `"Uložiť"` is visible and enabled.

**and** the empty question list placeholder is visible.

---

### TC-02: Edit title and submit → success toast fires

**Prerequisites:** Admin session active. `quick_test_config` row seeded with
`{ config: { visible: true, title: "Starý názov", description: "", branza:
"Všeobecný test", time_seconds: 120, pass_percentage: 60, difficulty: "Ľahká",
question_ids: [] } }`.

**When** the admin navigates to `/admin/quick-test`.

**and** clears the title input and types `"Nový názov testu"`.

**and** clicks the save button.

**Then** a success toast containing `"Konfigurácia uložená."` appears.

---

## Negative scenarios

### TC-03: Mutation error → error toast fires

**Prerequisites:** Admin session active. `quick_test_config` table mocked to return
a 500 error on PATCH.

**When** the admin navigates to `/admin/quick-test`.

**and** types any value into the title input (triggering an immediate optimistic
`mutate` call).

**Then** an error toast is visible within 4 s.

---

## Edge cases

### TC-04: Branza select changes value optimistically

**Prerequisites:** Admin session active. `quick_test_config` row seeded with
`{ config: { visible: true, title: "", description: "", branza: "Všeobecný test",
time_seconds: 120, pass_percentage: 60, difficulty: "Ľahká", question_ids: [] } }`.

**When** the admin navigates to `/admin/quick-test`.

**and** opens the branza select and chooses `"Senior"`.

**Then** the branza select trigger reflects `"Senior"`.
