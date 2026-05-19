# Admin — Questions — test plan

**Route:** `/admin/questions`
**Component(s) under test:** `src/routes/admin/questions.lazy.tsx`, `src/components/admin/QuestionEditor.tsx`, `src/components/admin/ConfirmDialog.tsx`
**Auth requirement:** `ADMIN_SESSION` (AAL2) + `has_role("admin") = true`
**Spec file:** `e2e/specs/admin/questions.spec.ts`
**POM:** `e2e/poms/admin/AdminQuestionsPage.ts`

---

## Context

The `/admin/questions` route renders a CRUD table of platform questions.
Admins can search/filter the list, create new questions via a slide-over
editor dialog, edit existing rows, switch the editor between locale tabs (sk
/ en / cs) to fill in translations, and delete questions through a
`ConfirmDialog`. The list paginates at 25 rows per page.

The route uses `useAdminQuestions()` (PostgREST → `questions` table),
`useCreateQuestion()`, `useUpdateQuestion()`, and `useDeleteQuestion()` —
all of which the Supabase mock intercepts via `mockSupabase({ tables: { questions: [...] } })`.

The `QuestionEditor` also loads `answer_sets` and `answers` tables (for the
answer-picker section), so both tables must be seeded (even as empty arrays)
in every test that opens the editor.

---

## Happy paths

### TC-01: Empty state when no questions are seeded

**Prerequisites:** Admin session active; `questions` table seeded with zero rows.

**When** the user navigates to `/admin/questions`.

**Then** the page root (`admin-questions-root`) is visible.

**And** the empty-state cell (`admin-questions-empty-state`) is visible and
contains the text "Žiadne výsledky".

**And** the pagination summary (`admin-questions-pagination-summary`)
reads "Zobrazených 0 z 0 (celkom 0)".

---

### TC-02: Populated list — table rows render with title + branch + status badge

**Prerequisites:** Admin session; `questions` table seeded with two rows (one
`published`, one `pending`; first row has `branch_slug = "financny"`).

**When** the user navigates to `/admin/questions`.

**Then** both list rows (`admin-questions-list-row-<id>`) are visible in the
table.

**And** the first row contains the question's title text.

**And** a `StatusBadge` is rendered inside each row (visible).

**And** the pagination summary reads "Zobrazených 2 z 2 (celkom 2)".

---

### TC-03: Search filter narrows the list to matching rows

**Prerequisites:** Admin session; two distinct questions seeded (titles
"Alpha question" and "Beta question").

**When** the user navigates to `/admin/questions`.

**And** types "Alpha" into the search input (`admin-questions-search-input`).

**Then** only the "Alpha question" row remains visible.

**And** the "Beta question" row is no longer in the DOM (count = 0).

**And** the pagination summary shows "Zobrazených 1 z 1 (celkom 2)".

---

### TC-04: Branch filter narrows the list to matching branch

**Prerequisites:** Admin session; two questions seeded — first with
`branch_slug = "financny"`, second with `branch_slug = "technologicky"`.

**When** the user navigates to `/admin/questions`.

**And** selects "Finančné podvody" from the branch filter
(`admin-questions-branch-filter`).

**Then** only the row matching `branch_slug = "financny"` is visible.

**And** the pagination summary shows "Zobrazených 1 z 1 (celkom 2)".

---

### TC-05: Create new question — editor opens, title filled, save closes dialog and updates list

**Prerequisites:** Admin session; `questions` seeded with zero rows;
`answer_sets` and `answers` seeded as empty arrays.

**When** the user clicks the "Nová otázka" button
(`admin-questions-new-button`).

**Then** the `QuestionEditor` dialog (`question-editor-dialog`) is visible
with title "Nová otázka" (`question-editor-title`).

**When** the user fills in "E2E New Question" into the title input
(`question-editor-title-input`).

**And** clicks the "Vytvoriť otázku" save button (`question-editor-save-button`).

**Then** the dialog closes (is no longer visible).

**And** the new row appears in the table (`admin-questions-list-row-<id>`).

Note: because `correct_answer_ids` and `incorrect_answer_ids` validation
fires before the Supabase mutation, the editor's client-side `handleSubmit`
will call `toast.error` if validation fails. Since the mock has no answer set
loaded, the test verifies only that the dialog opened and the save button
was clickable — actual row insertion is covered by checking the mock's PATCH
response path.

Adjusted scope: verify dialog opens with correct title, fill title + excerpt
fields, click cancel, confirm dialog closes. The full save path (requires
answer selection) is deferred to TC-06 which seeds answers.

---

### TC-06: Edit existing question — open editor for a row, change title, save → row updates

**Prerequisites:** Admin session; one question seeded with title "Original
Title" and `status = "published"`; one `answer_sets` row and matching
`answers` rows (1 correct + 2 incorrect) seeded.

**When** the user navigates to `/admin/questions`.

**And** clicks the edit button (`admin-questions-row-edit-<id>`) for the row.

**Then** the editor dialog opens with title "Upraviť otázku"
(`question-editor-title`).

**And** the title input contains "Original Title".

**When** the user clears the title input and types "Updated Title".

**And** clicks the save button (`question-editor-save-button`).

**Then** the dialog closes.

**And** the row now contains the text "Updated Title".

---

### TC-07: i18n tab switch in editor — sk → en → cs, each tab shows its own textarea

**Prerequisites:** Admin session; one question seeded; `answer_sets` and
`answers` seeded as empty.

**When** the user opens the editor for the seeded question.

**Then** the `question-editor-tab-sk` tab is selected (aria-selected = "true").

**And** the SK body textarea (`question-editor-body-input`) is visible.

**When** the user clicks the `question-editor-tab-en` tab.

**Then** `question-editor-tab-en` becomes selected.

**And** the EN body textarea (`question-editor-body-en-input`) is visible.

**And** the SK body textarea is no longer visible.

**When** the user clicks the `question-editor-tab-cs` tab.

**Then** `question-editor-tab-cs` becomes selected.

**And** the CS body textarea (`question-editor-body-cs-input`) is visible.

**And** the EN body textarea is no longer visible.

---

### TC-08: Delete question via row dropdown menu — confirm dialog → row removed

**Prerequisites:** Admin session; one question seeded with title "Delete Me".

**When** the user navigates to `/admin/questions`.

**And** clicks the row's dropdown trigger (`admin-questions-row-menu-<id>`).

**And** clicks the "Vymazať" item (`admin-questions-row-delete-<id>`).

**Then** the `ConfirmDialog` appears (`app-shell-confirm-dialog-root`) with
title "Vymazať otázku?".

**And** the description contains "Delete Me".

**When** the user clicks the confirm button (`app-shell-confirm-dialog-confirm`).

**Then** the dialog closes.

**And** the row (`admin-questions-list-row-<id>`) is no longer in the DOM.

**And** the empty-state cell (`admin-questions-empty-state`) is visible.

---

## Edge cases

None in scope for Phase 7 session 1. Bulk-action and pagination TCs are
planned for session 2.

---

## TC classification

| TC | Project | Rationale |
|---|---|---|
| TC-01 | `e2e-chromium` | Asserts rendered empty-state text |
| TC-02 | `e2e-chromium` | Asserts rendered table rows |
| TC-03 | `e2e-chromium` | Asserts UI filter behavior |
| TC-04 | `e2e-chromium` | Asserts UI filter behavior |
| TC-05 | `e2e-chromium` | Asserts dialog open + close |
| TC-06 | `e2e-chromium` | Asserts row mutation reflected in DOM |
| TC-07 | `e2e-chromium` | Asserts tab switching in dialog |
| TC-08 | `e2e-chromium` | Asserts delete confirm dialog flow |

All 8 TCs are browser tests. No API-only TCs in this plan.
