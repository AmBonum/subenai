# Test editor (/app/tests/$testId) — test plan

**Area:** app  
**Component(s) under test:** `src/routes/app.tests.$testId.tsx`, `src/components/admin/StatusBadge.tsx`  
**Project:** e2e-chromium  
**Spec file:** `e2e/specs/app/test-editor.spec.ts`

---

## Preconditions (shared)

- Educator session seeded (via `setupEducator`).
- One draft test seeded: `id = "tst_002"`, `title = "Editor target"`, `status = "draft"`, `share_id = "e2e-share-1234"`.
- No sessions or test_questions seeded.

---

## Happy paths

### TC-01: Editor renders page header title and status badge

**Prerequisites:** Editor open at `/app/tests/tst_002`.  
**When:** The page loads.  
**Then:** The root container `[data-testid="test-editor-root"]` is visible.  
**and:** The page-header title contains "Editor target".  
**and:** The status badge shows "Koncept" (Slovak for draft).

---

### TC-02: Tab switching updates the visible panel

**Prerequisites:** Editor open at `/app/tests/tst_002`; results tab is active by default.  
**When:** The results panel is shown.  
**Then:** `[data-testid="test-editor-results-panel"]` is visible.  
**When:** The user clicks the analytics tab trigger.  
**Then:** `[data-testid="test-editor-analytics-panel"]` is visible.  
**When:** The user clicks the settings tab trigger.  
**Then:** `[data-testid="test-editor-settings-panel"]` is visible.

---

### TC-03: Title edit in settings tab persists via save button

**Prerequisites:** Editor open at `/app/tests/tst_002`; settings tab active.  
**When:** The user clears the title input and types "Updated via e2e".  
**and:** The user clicks the save button.  
**Then:** The save button is not in a permanently disabled/errored state (mutation fired without error).  
**and:** The title input retains "Updated via e2e".

---

### TC-04: Publish button transitions status badge from "Koncept" to "Publikované" via `publish_test`

**Prerequisites:** Editor open at `/app/tests/tst_002`; test status is "draft"; `publish_test` RPC mocked with a recording resolver that flips the seeded row to `published`.  
**When:** The user clicks the publish button (rendered only while `status === "draft"`).  
**Then:** The status badge shows "Publikované".  
**and:** The `publish_test` RPC was called exactly once with `{ p_test_id: "tst_002" }` (E50 — publish is the atomic SECURITY DEFINER RPC, never a client-side UPDATE).  
**and:** The publish button is replaced by the "Zrušiť publikovanie" button.

---

### TC-05: Archive opens a warning ConfirmDialog; archiving swaps the action to unarchive

**Prerequisites:** Editor open at `/app/tests/tst_002`; test status is "draft".  
**When:** The page loads.  
**Then:** The archive button is visible.  
**When:** The user clicks the archive button.  
**Then:** The shared `ConfirmDialog` opens with `data-severity="warning"` and copy warning that "verejný odkaz okamžite prestane fungovať" (the live /t/ link dies).  
**When:** The user confirms.  
**Then:** The archive button disappears and "Obnoviť z archívu" (`test-editor-unarchive-button`) appears.

---

## E50 — status-machine exits + zero-sessions empty states

The header action set is a function of `test.status`:

| status    | visible lifecycle actions                                  |
|-----------|------------------------------------------------------------|
| draft     | "Publikovať" + "Archivovať"                                |
| published | "Zrušiť publikovanie" + "Archivovať"                       |
| archived  | "Obnoviť z archívu" only — publish from archived is BLOCKED (the `publish_test` RPC raises `test_archived`); the user must unarchive (→ draft) first |

### TC-12: Unpublish opens a warning dialog and returns the test to "Koncept"

**Prerequisites:** Editor open on a seeded PUBLISHED test.  
**When:** The page loads.  
**Then:** "Zrušiť publikovanie" is visible and the publish button is NOT rendered.  
**When:** The user clicks "Zrušiť publikovanie".  
**Then:** The `ConfirmDialog` opens with `data-severity="warning"` and copy warning "Verejný odkaz prestane pre nových respondentov fungovať".  
**When:** The user confirms.  
**Then:** The status badge returns to "Koncept" and the publish button reappears.

---

### TC-13: Unarchive restores an archived test to "Koncept" with draft actions

**Prerequisites:** Editor open on a seeded ARCHIVED test.  
**When:** The page loads.  
**Then:** Only "Obnoviť z archívu" is rendered among the lifecycle actions (no publish, no archive).  
**When:** The user clicks "Obnoviť z archívu".  
**Then:** The status badge shows "Koncept" and publish + archive become available.

---

### TC-14: Published test with 0 sessions shows the copy-link empty state

**Prerequisites:** Editor open on a seeded PUBLISHED test with zero sessions; Results tab (default).  
**Then:** `test-sessions-list-empty` shows "Test zatiaľ nemá respondentov." plus the "Kopírovať odkaz" CTA (`test-sessions-list-empty-copy-link-button`); the publish CTA is NOT rendered.

---

### TC-15: Draft test with 0 sessions shows the publish empty state; the CTA publishes

**Prerequisites:** Editor open on the seeded DRAFT test with zero sessions; `publish_test` RPC mocked (flips the row).  
**Then:** `test-sessions-list-empty` shows "Test ešte nie je publikovaný."; the copy-link CTA is NOT rendered.  
**When:** The user clicks "Publikovať test" (`test-sessions-list-empty-publish-button`).  
**Then:** The status badge transitions to "Publikované".

---

### TC-16: Settings tab renders the intake-fields card and the audience chip

**Prerequisites:** Editor open on the seeded DRAFT test; Settings tab.  
**Then:** The intake card (`test-editor-intake-root`) renders with "Meno" + "E-mail" toggles unchecked and their "Povinné" checkboxes disabled.  
**When:** The user toggles "Meno".  
**Then:** The toggle is checked and the "Povinné" checkbox unlocks (the change persists `tests.intake_fields` with the exact IntakeStep shape — ids `name`/`email`).  
**and:** The audience chip (`test-editor-audience-chip`) shows the group NAME, or "Bez skupiny" when `audience_group_id` is null.
