# `/app/audiences` — test plan

**Area:** `specs/app/`
**Component(s) under test:** `src/routes/app.audiences.tsx`
**Routes:** `/app/audiences`
**API endpoints:**
- `GET /rest/v1/respondent_groups` — list query (`useAudiences`)
- `POST /rest/v1/respondent_groups` — create mutation (`useCreateAudience`)
- `PATCH /rest/v1/respondent_groups?id=eq.<id>` — update mutation (`useUpdateAudience`)
- `DELETE /rest/v1/respondent_groups?id=eq.<id>` — delete mutation (`useDeleteAudience`)
**Data dependencies:** `respondent_groups` table (seeded via `seedAudience` factory)
**Last updated:** 2026-05-19

---

## Context

`/app/audiences` is an authenticated educator page that manages named cohorts
("skupiny respondentov") used when targeting a test at a specific group. The
page has three main surfaces:

1. **Page header** — eyebrow "Audiencie", title "Skupiny respondentov", and a
   "Nová skupina" button that opens the inline editor.
2. **List** — a 2-column grid of audience cards, each showing the name, member
   count badge, tags, and Upraviť / Vymazať action buttons. When no audiences
   exist, an empty-state card is shown instead.
3. **Inline editor** — a card that slides in below the list when the user
   creates or edits an audience. Fields: name (required) + tags (optional,
   via Enter-key or add button). Cancel and Save buttons in the footer.

Deleting an audience opens the shared `ConfirmDialog` ("Vymazať skupinu?") and
removes the card on confirm.

The "Importovať e-maily" button is disabled with a "Pripravujeme" tooltip —
it is out of scope for this test plan.

---

## Out of scope

- The disabled "Importovať e-maily" import flow.
- Tag-input keyboard-only interactions (Enter key on tag input) — covered by
  component unit tests.
- Member-email management — not yet implemented.
- RLS / server-side auth — covered by Phase 9 pgTAP suite.

---

## Happy paths

### TC-01: Empty state renders when no audiences are seeded

**Prerequisites:**
- Educator session primed via `setupAppShell`.
- `respondent_groups` table seeded with zero rows.

**When** the user navigates to `/app/audiences`
**Then** the page root (`data-testid="audiences-root"`) is visible
**and** the "Nová skupina" button (`data-testid="audiences-new-group-button"`) is visible
**and** the empty-state card (`data-testid="audiences-empty-state"`) is visible and contains the text "Zatiaľ žiadne skupiny."
**and** no audience row cards are in the DOM

---

### TC-02: List renders when audiences are seeded

**Prerequisites:**
- Educator session primed via `setupAppShell`.
- Two audiences seeded via `seedAudience` (distinct names and at least one
  with `tags: ["tagA"]`).

**When** the user navigates to `/app/audiences`
**Then** the empty-state card is NOT in the DOM
**and** a card row for each seeded audience is visible (`data-testid="audiences-list-row-<id>"`)
**and** each card shows the correct name (`data-testid="audiences-row-name-<id>"`)

---

### TC-03: Create new audience — inline editor opens, fill and save

**Prerequisites:**
- Educator session primed via `setupAppShell`.
- `respondent_groups` starts empty.

**When** the user clicks "Nová skupina"
**Then** the inline editor (`data-testid="audiences-editor-root"`) becomes visible
**and** the name input (`data-testid="audiences-editor-name-input"`) is visible

**When** the user types a name into the name input
**and** clicks Save (`data-testid="audiences-editor-save-button"`)
**Then** the editor closes (editor root is no longer in the DOM)
**and** the new audience row card appears in the list

---

### TC-04: Edit existing audience — name updated

**Prerequisites:**
- Educator session primed via `setupAppShell`.
- One audience seeded (`seedAudience({ name: "Pôvodný názov" })`).

**When** the user navigates to `/app/audiences`
**and** clicks the "Upraviť" button for that audience (`data-testid="audiences-row-edit-<id>"`)
**Then** the inline editor becomes visible
**and** the name input is pre-filled with "Pôvodný názov"

**When** the user clears the name input and types a new name "Nový názov"
**and** clicks Save
**Then** the editor closes
**and** the row card for that audience shows "Nový názov" in its name element

---

### TC-05: Delete audience — confirm dialog removes the card

**Prerequisites:**
- Educator session primed via `setupAppShell`.
- One audience seeded.

**When** the user navigates to `/app/audiences`
**and** clicks the "Vymazať" button for that audience (`data-testid="audiences-row-delete-<id>"`)
**Then** the confirm dialog (`data-testid="app-shell-confirm-dialog-root"`) is visible
**and** the dialog title reads "Vymazať skupinu?"

**When** the user clicks the confirm button (`data-testid="app-shell-confirm-dialog-confirm"`)
**Then** the confirm dialog closes
**and** the audience row card is removed from the DOM
**and** the empty-state card is visible
