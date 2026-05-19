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

### TC-04: Publish button transitions status badge from "Koncept" to "Publikované"

**Prerequisites:** Editor open at `/app/tests/tst_002`; test status is "draft".  
**When:** The user clicks the publish button.  
**Then:** The status badge shows "Publikované".

---

### TC-05: Archive button is visible for a non-archived test and triggers archive

**Prerequisites:** Editor open at `/app/tests/tst_002`; test status is "draft".  
**When:** The page loads.  
**Then:** The archive button is visible.  
**When:** The user clicks the archive button.  
**Then:** The archive button disappears (status is now "archived" — the component hides the button when `test.status === "archived"`).
