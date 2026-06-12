# /app/templates — test plan

**Component(s) under test:** `src/routes/app.templates.tsx`, `src/components/app/templates/TemplateCard.tsx`, `src/components/app/templates/TemplatesTabs.tsx`
**Supabase table:** `templates` (read via `usePublicTemplates` / `useMyTemplates`)
**Route:** `/app/templates` (`?tab=public|mine`, default `public`)

---

## Context

E44 split the library into two tabs: **Verejné** (platform defaults with
`owner_id = null` plus published public templates) and **Moje** (the educator's
own copies). Cards render ownership/purpose/question-count badges, an optional
public-page link (`/sablony/<slug>`), the primary "Použiť" CTA, and an action
menu (Duplikovať / Upraviť / Vymazať / Odoslať na zverejnenie).

---

## Happy paths

### TC-01: Empty public tab

**Prerequisites:** Authenticated educator session; `templates` seeded with 0 rows.

**When** the user navigates to `/app/templates`
**Then** `templates-root` is visible, the header contains "Šablóny"
**and** `templates-list-empty-state-public` is visible with the copy
"Pre tento filter nemáme žiadne verejné šablóny. Skús zmeniť kategóriu alebo vyhľadávací výraz."
**and** `templates-list-empty-state-mine` is NOT present

### TC-02: Populated public tab

**Prerequisites:** 2 public default templates seeded (`owner_id: null`, `status: "published"`).

**Then** each `templates-card-<id>` renders its title, purpose badge (Slovak label
from `purposes.*`), ownership badge "Predvolené", and — when `slug` is set —
`templates-card-<id>-public-page-link` pointing at `/sablony/<slug>`

### TC-03: "Použiť" navigates to the wizard

**When** the user clicks `templates-card-<id>-use-button`
**Then** the URL becomes `/app/tests/new?step=1&templateId=<id>`

### TC-04: Search filter

**When** the user types into `templates-list-search-input`
**Then** only title-matching cards remain; a non-matching query surfaces the
public empty state

### TC-05: Category filter

**When** the user picks a purpose in `templates-list-category-filter`
(options `templates-list-category-option-<purpose>`)
**Then** only cards with that `gdpr_purpose` remain

### TC-06: Question-count badge plurals

**Then** `templates-card-<id>-questions-count` renders Slovak plurals:
1 → "1 otázka", 2–4 → "{n} otázky", 5+ → "{n} otázok"

### TC-07: Mine tab

**When** the user switches to `templates-tab-mine`
**Then** owned copies render with ownership badge "Moja kópia"
**and** with no copies the mine empty state shows
"Ešte si si žiadnu šablónu nezduplikoval. Začni z verejnej knižnice." with the
"Pozrieť verejné" CTA

---

## Responsive (@mobile)

Cards stack into a single column on Pixel 7; the "Použiť" CTA is ≥44 px tall;
no horizontal overflow.
