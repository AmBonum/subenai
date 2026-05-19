# Admin CMS Pages — test plan

**Routes under test:** `/admin/pages` (list) · `/admin/pages/$pageId` (editor)
**Component(s) under test:**
- `src/routes/admin/pages.index.lazy.tsx`
- `src/routes/admin/pages.$pageId.lazy.tsx`

**Project:** `e2e-chromium`
**Spec file:** `e2e/specs/admin/pages.spec.ts`

---

## Prerequisites (all TCs)

- Admin session (AAL2) is active — `setupAdmin(context, page, extras)` wires the session and
  mocks `has_role: true`.
- Cookie consent is pre-seeded via `setupAdmin` → `primeConsent`.
- The `cms_pages` Supabase table is mocked through `mockSupabase({ tables: { cms_pages: [...] } })`.

---

## Happy paths

### TC-01: Empty state when no pages are seeded

**Prerequisites:** `cms_pages` table is empty (`[]`).

**When** the admin navigates to `/admin/pages`.

**Then** the page root element (`cms-pages-list-root`) is visible.

**and** the empty-state cell (`cms-pages-list-empty`) is visible with text "Zatiaľ žiadne stránky."

---

### TC-02: Populated list — rows render with title, slug, and status badge

**Prerequisites:** `cms_pages` seeded with one draft row (title "Domovská stránka", slug "domov") and
one published row (title "O nás", slug "o-nas").

**When** the admin navigates to `/admin/pages`.

**Then** both table rows (`cms-pages-list-row-<id>`) are visible.

**and** each row shows the correct title text.

**and** the draft row's badge text equals "Koncept".

**and** the published row's badge text equals "Publikované".

---

### TC-03: Click the edit link on a row navigates to the editor

**Prerequisites:** `cms_pages` seeded with one draft page.

**When** the admin navigates to `/admin/pages`.

**and** clicks the edit icon link (`cms-pages-list-edit-<id>`) for the seeded row.

**Then** the URL changes to `/admin/pages/<id>`.

---

## Editor happy paths

### TC-04: Editor renders metadata fields and action buttons for a seeded page

**Prerequisites:** `cms_pages` seeded with one draft page (non-empty slug and title).

**When** the admin navigates directly to `/admin/pages/<id>`.

**Then** the editor root (`cms-page-editor-root`) is visible.

**and** the title input (`cms-page-editor-title-input`) is visible and carries the seeded title as its value.

**and** the slug input (`cms-page-editor-slug-input`) is visible and carries the seeded slug as its value.

**and** the description textarea (`cms-page-editor-description-input`) is visible.

**and** the save button (`cms-page-editor-save`) is visible and enabled.

**and** the publish button (`cms-page-editor-publish`) is visible (page is draft).

---

### TC-05: Editing the title updates the query cache and re-enables the save button

**Prerequisites:** `cms_pages` seeded with one draft page whose title is "Pôvodný názov".

**When** the admin navigates to `/admin/pages/<id>`.

**and** clears the title input and types "Nový názov".

**Then** the title input value is "Nový názov".

**and** the save button is enabled (title is non-empty, slug valid).

**and** the title error message (`cms-page-editor-title-error`) is hidden.

---

### TC-06: Publish toggle changes the hidden status probe from "draft" to "published"

**Prerequisites:** `cms_pages` seeded with one draft page.

**When** the admin navigates to `/admin/pages/<id>`.

**and** the hidden status probe (`cms-page-editor-status`) reads "draft".

**and** clicks the publish button (`cms-page-editor-publish`).

**Then** the hidden status probe reads "published".

**and** the unpublish button (`cms-page-editor-unpublish`) is now visible (publish button gone).

---

### TC-07: Back link navigates to /admin/pages list

**Prerequisites:** `cms_pages` seeded with one draft page.

**When** the admin navigates to `/admin/pages/<id>`.

**and** clicks the back link (`cms-page-editor-back`).

**Then** the URL changes to `/admin/pages`.

---

## Edge cases

_(none required for this batch — the seven TCs above cover the critical paths.)_
