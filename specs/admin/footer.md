# Admin Footer CMS — test plan

**Area:** admin
**Route:** `/admin/footer`
**Component(s) under test:** `src/routes/admin/footer.lazy.tsx`
**Auth requirement:** ADMIN_SESSION (AAL2, `has_role` mock returns `true`)
**Data sources:** `cms_footer` table (single row `id = 1`, columns `columns` + `socials`)

---

## Context

The Footer CMS page renders a live-edit form for the public site footer. It holds two
independent sections: **columns** (each column has a title and a list of `label`/`url`
links) and **social handles** (platform + URL pairs). All mutations are optimistic —
every field change fires `useUpdateCmsFooter` immediately without a separate save step,
and clicking the submit button triggers a `toast.success` confirmation. Adding and
removing columns changes the column card count rendered by `footer.columns.map(...)`.

---

## Happy paths

### TC-01: Page renders the footer form with at least one seeded column and the add-column button

**Prerequisites:** Admin is signed in; `cms_footer` table seeded with one column
(`id: "col_1"`, `title: "Spoločnosť"`, `links: []`) and no socials.

**When** the admin navigates to `/admin/footer`.

**Then** the form root (`cms-footer-form-root`) is visible.
**and** the column card at index 0 (`cms-footer-column-0`) is visible.
**and** the title input for column 0 (`cms-footer-column-0-title`) has value `"Spoločnosť"`.
**and** the "Pridať stĺpec" button (`cms-footer-form-add-column`) is visible.
**and** the save button (`cms-footer-form-save`) is visible.

---

### TC-02: Edit column title — typing into the title input fires the mutation and the toast appears on save

**Prerequisites:** Admin is signed in; `cms_footer` table seeded with one column
(`id: "col_1"`, `title: "Spoločnosť"`, `links: []`) and no socials.

**When** the admin navigates to `/admin/footer`.
**and** clears the column-0 title input (`cms-footer-column-0-title`) and types `"O nás"`.
**and** clicks the save button (`cms-footer-form-save`).

**Then** the toast with text `"Päta uložená."` is visible.

---

### TC-03: Add a new column — the column card count increases by one

**Prerequisites:** Admin is signed in; `cms_footer` table seeded with one column
(`id: "col_1"`, `title: "Spoločnosť"`, `links: []`) and no socials.

**When** the admin navigates to `/admin/footer`.
**and** clicks the "Pridať stĺpec" button (`cms-footer-form-add-column`).

**Then** the column card at index 1 (`cms-footer-column-1`) is visible (the new empty column).

---
