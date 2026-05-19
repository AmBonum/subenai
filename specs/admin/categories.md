# Admin Categories — test plan

**Area:** admin
**Route:** `/admin/categories`
**Component(s) under test:** `src/routes/admin/categories.lazy.tsx`
**Auth requirement:** ADMIN_SESSION (AAL2, `has_role` mock returns `true`)
**Data sources:** `categories` table (branches) + `topics` table

---

## Context

The Categories page manages two independent lists — branches (`categories` table) and topics
(`topics` table). Each list has an "add" button that opens a shared Dialog with a name input and,
for topics, a branch-select dropdown. Editing an existing row re-opens the same Dialog pre-filled.
Delete is guarded by a `ConfirmDialog`; deleting a branch that has descendant topics is blocked
and shows an inline error card. All filtering/mutation is client-side via TanStack Query.

---

## Happy paths

### TC-01: Empty state — both lists render with no rows when tables are empty

**Prerequisites:** Admin is signed in; `categories` table is empty; `topics` table is empty.

**When** the admin navigates to `/admin/categories`.

**Then** the page root (`admin-categories-root`) is visible.
**and** the branches list (`admin-categories-branches-list`) is in the DOM with zero `<li>` children (an empty `<ul>` has no height so visibility is not asserted).
**and** the topics list (`admin-categories-topics-list`) is in the DOM with zero `<li>` children.
**and** the "Nová branža" button (`admin-categories-new-branch-button`) is visible.
**and** the "Nová téma" button (`admin-categories-new-topic-button`) is visible.

---

### TC-02: Populated list — branch and topic rows render with name and slug

**Prerequisites:** Admin is signed in; one branch seeded (`id: "cat_001"`, `name: "E-shop"`,
`slug: "eshop"`); one topic seeded (`id: "top_001"`, `name: "SEO"`, `slug: "eshop-seo"`).

**When** the admin navigates to `/admin/categories`.

**Then** the branch row (`admin-categories-branch-row-cat_001`) is visible.
**and** the branch row contains the text `"E-shop"`.
**and** the branch row contains the text `"/eshop"`.
**and** the topic row (`admin-categories-topic-row-top_001`) is visible.
**and** the topic row contains the text `"SEO"`.
**and** the topic row contains the text `"/eshop-seo"`.

---

### TC-03: Create new branch — dialog opens, name is filled, save adds a row

**Prerequisites:** Admin is signed in; `categories` table is empty; `topics` table is empty.

**When** the admin navigates to `/admin/categories`.
**and** clicks the "Nová branža" button (`admin-categories-new-branch-button`).

**Then** the create/edit dialog is visible with the name input (`category-dialog-name-input`) empty.
**and** the save button (`category-dialog-save-button`) is disabled (empty name).

**When** the admin types `"Logistika"` into the name input.

**Then** the save button becomes enabled.

**When** the admin clicks the save button.

**Then** the dialog closes.
**and** the branches list contains at least one row with the text `"Logistika"`.

---

### TC-04: Edit existing branch — dialog opens pre-filled, changed name reflected in row

**Prerequisites:** Admin is signed in; one branch seeded (`id: "cat_e2e_edit"`, `name: "Gastro"`,
`slug: "gastro"`); `topics` table is empty.

**When** the admin navigates to `/admin/categories`.
**and** clicks the edit button for the branch row (`admin-categories-branch-row-edit-cat_e2e_edit`).

**Then** the dialog is visible and the name input contains `"Gastro"`.

**When** the admin clears the name input and types `"Gastronomia"`.
**and** clicks the save button (`category-dialog-save-button`).

**Then** the dialog closes.
**and** the branch row (`admin-categories-branch-row-cat_e2e_edit`) contains the text `"Gastronomia"`.

---
