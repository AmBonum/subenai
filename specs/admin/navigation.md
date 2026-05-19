# Admin Navigation — test plan

**Area:** admin
**Route:** `/admin/navigation`
**Component(s) under test:** `src/routes/admin/navigation.lazy.tsx`
**Auth requirement:** ADMIN_SESSION (AAL2, `has_role` mock returns `true`)
**Data sources:** `cms_navigation` table — singleton row `{ id: 1, items: CmsNavItem[] }`

---

## Context

The Navigation page manages an ordered flat list of `CmsNavItem` entries stored as a JSON
`items` column in the singleton `cms_navigation` row. The component reads the list via
`useCmsNavigation` (TanStack Query), renders it in a table, and lets the admin add, edit,
reorder (move up / move down), and remove items entirely in-memory before flushing to Supabase
via `useUpdateCmsNavigation`. Adding an item immediately appends a blank row and opens the
Dialog editor for it; editing an existing row re-opens the same Dialog pre-filled. The Dialog
validates that the URL is either a root-relative path (`/…`) or an `https://` URL before
calling `toast.success` and closing.

---

## Happy paths

### TC-01: Empty state — empty-state paragraph renders when navigation has no items

**Prerequisites:** Admin is signed in; `cms_navigation` table seeded with
`{ id: 1, items: [] }`.

**When** the admin navigates to `/admin/navigation`.

**Then** the page root (`cms-nav-root`) is visible.
**and** the empty-state paragraph (`cms-nav-empty`) is visible and contains the text
`"Navigácia je prázdna."`.
**and** the "Pridať položku" button (`cms-nav-add-button`) is visible.

---

### TC-02: Populated list — nav items render in position order with label, URL, and controls

**Prerequisites:** Admin is signed in; `cms_navigation` table seeded with two items:
- `{ id: "nav_a1", label: "Domov", url: "/", position: 1, visible: true, open_in_new_tab: false, auth_only: false }`
- `{ id: "nav_b2", label: "Blog", url: "/blog", position: 2, visible: false, open_in_new_tab: true, auth_only: false }`

**When** the admin navigates to `/admin/navigation`.

**Then** the empty-state paragraph (`cms-nav-empty`) is not in the DOM.
**and** the table row for `"nav_a1"` (`cms-nav-item-nav_a1`) is visible.
**and** that row contains the text `"Domov"`.
**and** that row contains the text `"/"`.
**and** the table row for `"nav_b2"` (`cms-nav-item-nav_b2`) is visible.
**and** that row contains the text `"Blog"`.
**and** that row contains the text `"/blog"`.
**and** the move-up button for `"nav_a1"` (`cms-nav-item-nav_a1-move-up`) is disabled (first item).
**and** the move-down button for `"nav_b2"` (`cms-nav-item-nav_b2-move-down`) is disabled (last item).

---

### TC-03: Add new nav item via dialog — form saved, row appears in list

**Prerequisites:** Admin is signed in; `cms_navigation` table seeded with `{ id: 1, items: [] }`.

**When** the admin navigates to `/admin/navigation`.
**and** clicks the "Pridať položku" button (`cms-nav-add-button`).

**Then** the editor dialog (`cms-nav-item-form`) is visible.
**and** the label input (`cms-nav-item-form-label`) is empty.
**and** the URL input (`cms-nav-item-form-url`) is empty.

**When** the admin types `"Kontakt"` into the label input.
**and** types `"/kontakt"` into the URL input.
**and** clicks the save button (`cms-nav-item-form-save`).

**Then** the dialog closes.
**and** the table now contains a row with the text `"Kontakt"`.
**and** the row also contains the text `"/kontakt"`.

---

### TC-04: Edit existing item — change label, save, row reflects the update

**Prerequisites:** Admin is signed in; `cms_navigation` table seeded with one item:
`{ id: "nav_edit1", label: "O nás", url: "/o-nas", position: 1, visible: true, open_in_new_tab: false, auth_only: false }`.

**When** the admin navigates to `/admin/navigation`.
**and** clicks the edit button for the row (`cms-nav-item-edit-nav_edit1`).

**Then** the editor dialog (`cms-nav-item-form`) is visible.
**and** the label input (`cms-nav-item-form-label`) contains the value `"O nás"`.
**and** the URL input (`cms-nav-item-form-url`) contains the value `"/o-nas"`.

**When** the admin clears the label input and types `"O nás — nové"`.
**and** clicks the save button (`cms-nav-item-form-save`).

**Then** the dialog closes.
**and** the row (`cms-nav-item-nav_edit1`) contains the text `"O nás — nové"`.

---
