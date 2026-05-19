# /app/templates — test plan

**Component(s) under test:** `src/routes/app.templates.tsx`
**Supabase table:** `templates` (read via `useTemplates`)
**Route:** `/app/templates`

---

## Happy paths

### TC-01: Empty state when no templates are available

**Prerequisites:** Authenticated educator session; `templates` table seeded with 0 rows.

**When** the user navigates to `/app/templates`
**Then** `data-testid="templates-root"` is visible
**and** the page heading contains "Šablóny"
**and** `data-testid="templates-list-empty-state"` is visible
**and** the empty-state card contains the text "Pre tento filter nemáme žiadne šablóny."
**and** `data-testid="templates-list-search-input"` is visible
**and** `data-testid="templates-list-category-filter"` is visible

---

### TC-02: Populated state — template cards render name and category badge

**Prerequisites:** Authenticated educator session; `templates` table seeded with 2 rows:
- `{ id: "tpl_001", title: "Onboarding kvíz", description: "...", question_ids: ["q1","q2"], gdpr_purpose: "HR" }`
- `{ id: "tpl_002", title: "Zákaznícka spokojnosť", description: "...", question_ids: ["q3"], gdpr_purpose: "CX" }`

**When** the user navigates to `/app/templates`
**Then** `data-testid="templates-root"` is visible
**and** `data-testid="templates-list-empty-state"` is NOT present
**and** `data-testid="templates-list-row-tpl_001"` is visible and contains text "Onboarding kvíz"
**and** `data-testid="templates-list-row-tpl_001"` contains the category text "HR"
**and** `data-testid="templates-list-row-tpl_002"` is visible and contains text "Zákaznícka spokojnosť"
**and** `data-testid="templates-list-row-tpl_002"` contains the category text "CX"

---

## Edge cases

### TC-03: Click "Použiť šablónu" navigates to /app/tests/new with templateId param

**Prerequisites:** Authenticated educator session; `templates` table seeded with 1 row:
- `{ id: "tpl_001", title: "Onboarding kvíz", description: "...", question_ids: ["q1"], gdpr_purpose: "HR" }`

**When** the user navigates to `/app/templates`
**and** the user clicks `data-testid="templates-row-use-tpl_001"` (labelled "Použiť šablónu")
**Then** the page URL changes to `/app/tests/new` with query params `step=1` and `templateId=tpl_001`
