# Test sessions detail (/app/tests/$testId Results tab + session side-sheet) — test plan

**Area:** app
**Component(s) under test:** `src/routes/app.tests.$testId.tsx` (Results tab), `src/components/app/tests/SessionsList.tsx`, `src/routes/app.tests.$testId.sessions.$sessionId.tsx` (side-sheet)
**Project:** e2e-chromium
**Spec file:** `e2e/specs/app/test-sessions-detail.spec.ts`
**Source stories:** E49 Phase 1 — respondent drill-down
**Last updated:** 2026-05-22

---

## Preconditions (shared)

- Educator session seeded (via `setupEducator`).
- One published test seeded: `id = "e49-test-001"`, owned by the educator.
- Five sessions seeded against `e49-test-001`:
  - `sess-completed-named` — status `completed`, respondent has both name and e-mail, score `85`.
  - `sess-completed-email-only` — status `completed`, respondent has e-mail only, no name, score `60`.
  - `sess-completed-anon` — status `completed`, respondent has no name and no e-mail, score `40`.
  - `sess-in-progress` — status `in_progress`, no answers yet, no score, no `finished_at`.
  - `sess-abandoned` — status `abandoned`, partial answers, no score.
- A second educator owns a separate test `e49-test-other` with a session `sess-foreign-001` (used by the IDOR TC).
- KPI expectations derived from seed: total respondents `5`, completed `3`, average score `(85 + 60 + 40) / 3 = 61.67`.

---

## Happy paths

### TC-01: Results tab renders KPI cards and sessions list root

**Prerequisites:** Editor open at `/app/tests/e49-test-001?tab=results`.
**When:** The page loads.
**Then:** `[data-testid="test-sessions-list-root"]` is visible.
**and:** `[data-testid="test-editor-kpi-total"]` shows the text "Spolu respondentov" and the value `5`.
**and:** `[data-testid="test-editor-kpi-completed"]` shows the text "Dokončené" and the value `3`.
**and:** `[data-testid="test-editor-kpi-avg-score"]` shows the text "Priemerné skóre" and the rounded average derived from the three completed sessions.
**and:** Five session rows are rendered (`[data-testid="test-sessions-list-row-<id>"]` for each seeded session).

---

### TC-02: Status filter narrows the list to "Prebiehajúce"

**Prerequisites:** Editor open at `/app/tests/e49-test-001?tab=results`.
**When:** The user opens `[data-testid="test-sessions-list-status-filter"]` (whose default option label is "Všetky stavy") and selects the option labelled "Prebiehajúce".
**Then:** Only `[data-testid="test-sessions-list-row-sess-in-progress"]` is visible.
**and:** Rows for `sess-completed-named`, `sess-completed-email-only`, `sess-completed-anon` and `sess-abandoned` are NOT in the DOM.

---

### TC-03: Search by e-mail filters rows to the matching respondent

**Prerequisites:** Editor open at `/app/tests/e49-test-001?tab=results`; status filter set to "Všetky stavy".
**When:** The user types the e-mail of the `sess-completed-email-only` respondent into `[data-testid="test-sessions-list-search-input"]` (whose placeholder reads "Hľadať meno alebo e-mail…").
**Then:** Only `[data-testid="test-sessions-list-row-sess-completed-email-only"]` is rendered.
**and:** No other session rows are in the DOM.

---

### TC-04: Sort by "Najvyššie skóre" reorders rows score-desc

**Prerequisites:** Editor open at `/app/tests/e49-test-001?tab=results`; status filter set to "Dokončené" so only the three completed sessions are visible.
**When:** The user opens `[data-testid="test-sessions-list-sort-select"]` and selects the option labelled "Najvyššie skóre".
**Then:** The first row in the table is `sess-completed-named` (score `85`).
**and:** The second row is `sess-completed-email-only` (score `60`).
**and:** The third row is `sess-completed-anon` (score `40`).

---

### TC-05: Pagination prev/next cycles through pages

**Prerequisites:** Editor open at `/app/tests/e49-test-001?tab=results`; the user selects page size `2` via `[data-testid="test-sessions-list-page-size-select"]` so the five seeded sessions span three pages.
**When:** The page renders.
**Then:** `[data-testid="test-sessions-list-pagination-info"]` indicates page 1 of 3.
**and:** `[data-testid="test-sessions-list-pagination-prev"]` is disabled.
**When:** The user clicks `[data-testid="test-sessions-list-pagination-next"]`.
**Then:** `[data-testid="test-sessions-list-pagination-info"]` indicates page 2 of 3.
**and:** Two different session rows are rendered (not the same set as page 1).
**When:** The user clicks `[data-testid="test-sessions-list-pagination-next"]` again.
**Then:** `[data-testid="test-sessions-list-pagination-info"]` indicates page 3 of 3.
**and:** `[data-testid="test-sessions-list-pagination-next"]` is disabled.
**and:** `[data-testid="test-sessions-list-pagination-prev"]` is enabled.

---

### TC-06: Clicking "Otvoriť detail" opens the session side-sheet

**Prerequisites:** Editor open at `/app/tests/e49-test-001?tab=results`.
**When:** The user clicks `[data-testid="test-sessions-list-row-sess-completed-named-open"]` (link label "Otvoriť detail").
**Then:** The URL changes to `/app/tests/e49-test-001/sessions/sess-completed-named`.
**and:** `[data-testid="session-detail-root"]` is visible.
**and:** The Results tab list root (`[data-testid="test-sessions-list-root"]`) remains in the DOM behind the sheet.

---

## Side-sheet behavior

### TC-07: Side-sheet identity precedence prefers name over e-mail

**Prerequisites:** Direct navigation to `/app/tests/e49-test-001/sessions/sess-completed-named`.
**When:** The sheet renders.
**Then:** `[data-testid="session-detail-respondent-identity"]` shows the respondent's seeded name (not the e-mail).
**and:** The heading "Detail respondenta" is visible inside `[data-testid="session-detail-root"]`.

---

### TC-08: Side-sheet falls back to e-mail when name is missing

**Prerequisites:** Direct navigation to `/app/tests/e49-test-001/sessions/sess-completed-email-only`.
**When:** The sheet renders.
**Then:** `[data-testid="session-detail-respondent-identity"]` shows the respondent's seeded e-mail.
**and:** The literal string "Anonymný respondent" is NOT present in `[data-testid="session-detail-respondent-identity"]`.

---

### TC-09: Side-sheet shows "Anonymný respondent" when name and e-mail are both missing

**Prerequisites:** Direct navigation to `/app/tests/e49-test-001/sessions/sess-completed-anon`.
**When:** The sheet renders.
**Then:** `[data-testid="session-detail-respondent-identity"]` contains the verbatim text "Anonymný respondent".

---

### TC-10: Side-sheet metadata block renders status, score, timestamps, duration and audit ref

**Prerequisites:** Direct navigation to `/app/tests/e49-test-001/sessions/sess-completed-named`.
**When:** The sheet renders.
**Then:** `[data-testid="session-detail-status-badge"]` is visible and reflects the "Dokončené" status.
**and:** `[data-testid="session-detail-score"]` contains the label "Skóre" and the seeded score `85`.
**and:** `[data-testid="session-detail-started-at"]` is labelled "Začaté" and contains a formatted timestamp.
**and:** `[data-testid="session-detail-finished-at"]` is labelled "Dokončené" and contains a formatted timestamp.
**and:** `[data-testid="session-detail-duration"]` is labelled "Trvanie" and contains a formatted duration derived from `finished_at - started_at` (e.g. `12 min 34 s` or `2 min 05 s` — verbatim format string from the component).
**and:** `[data-testid="session-detail-audit-ref"]` is labelled "IP audit ref" and contains only the last 6 characters of the seeded audit reference.

---

### TC-11: Side-sheet Q&A list renders correct/incorrect markers, expected value and per-question time

**Prerequisites:** Direct navigation to `/app/tests/e49-test-001/sessions/sess-completed-named`; the seeded session has at least one correct and one incorrect answer with both `value` and `expected_value` populated.
**When:** The sheet renders.
**Then:** For each answered question, `[data-testid="session-detail-answer-row-<question_id>"]` is visible.
**and:** Each row contains a label "Odpoveď respondenta" next to `[data-testid="session-detail-answer-row-<question_id>-value"]`.
**and:** Each row contains a label "Očakávaná odpoveď" next to `[data-testid="session-detail-answer-row-<question_id>-expected"]`.
**and:** Each row contains a label "Čas" next to `[data-testid="session-detail-answer-row-<question_id>-time"]`.
**and:** Rows for correct answers carry `[data-testid="session-detail-answer-row-<question_id>-correctness"]` with the verbatim text "Správna odpoveď".
**and:** Rows for incorrect answers carry `[data-testid="session-detail-answer-row-<question_id>-correctness"]` with the verbatim text "Nesprávna odpoveď".

---

### TC-12: Close button returns the user to the Results tab

**Prerequisites:** Side-sheet open at `/app/tests/e49-test-001/sessions/sess-completed-named` (opened via TC-06 flow).
**When:** The user clicks `[data-testid="session-detail-close"]` (accessible name "Zavrieť").
**Then:** `[data-testid="session-detail-root"]` is no longer in the DOM.
**and:** The URL is back at `/app/tests/e49-test-001` with the Results tab active.
**and:** `[data-testid="test-sessions-list-root"]` remains visible.

---

## Edge cases / empty states

### TC-13: Empty list state when the test has no sessions at all

**Prerequisites:** A second seeded test `e49-test-empty` owned by the educator with zero sessions; editor open at `/app/tests/e49-test-empty?tab=results`.
**When:** The page loads.
**Then:** `[data-testid="test-sessions-list-empty"]` is visible.
**and:** The empty-state element contains the verbatim text "Test zatiaľ nemá respondentov.".
**and:** No `[data-testid="test-sessions-list-row-..."]` nodes are in the DOM.
**and:** `[data-testid="test-editor-kpi-total"]` shows `0`.

---

### TC-14: Empty filter state when filters exclude every row

**Prerequisites:** Editor open at `/app/tests/e49-test-001?tab=results`.
**When:** The user types a clearly non-matching string (e.g. `zzz-no-match-zzz`) into `[data-testid="test-sessions-list-search-input"]`.
**Then:** `[data-testid="test-sessions-list-empty"]` is visible.
**and:** The empty-state element contains the verbatim text "Žiadny respondent nezodpovedá filtru.".
**and:** No `[data-testid="test-sessions-list-row-..."]` nodes are in the DOM.

---

### TC-15: In-progress session with no answers shows the in-progress empty state in the sheet

**Prerequisites:** Direct navigation to `/app/tests/e49-test-001/sessions/sess-in-progress`.
**When:** The sheet renders.
**Then:** `[data-testid="session-detail-empty-in-progress"]` is visible.
**and:** It contains the verbatim text "Respondent ešte neodoslal odpovede.".
**and:** `[data-testid="session-detail-finished-at"]` is either absent or rendered without a timestamp value.
**and:** No `[data-testid="session-detail-answer-row-..."]` nodes are in the DOM.

---

### TC-16: Unknown session id renders the not-found state

**Prerequisites:** Direct navigation to `/app/tests/e49-test-001/sessions/sess-does-not-exist`.
**When:** The route loads.
**Then:** `[data-testid="session-detail-not-found"]` is visible.
**and:** It contains the verbatim text "Tento výsledok sme nenašli alebo k nemu nemáte prístup.".
**and:** No respondent identity, KPI mirror or answer rows are rendered inside the sheet.

---

## Security

### TC-17: IDOR — opening another educator's session id under an owned test shows not-found

**Prerequisites:** Educator session is the owner of `e49-test-001`; the unrelated session `sess-foreign-001` belongs to `e49-test-other` (different owner).
**When:** The user navigates directly to `/app/tests/e49-test-001/sessions/sess-foreign-001`.
**Then:** `[data-testid="session-detail-not-found"]` is visible.
**and:** It contains the verbatim text "Tento výsledok sme nenašli alebo k nemu nemáte prístup.".
**and:** None of `[data-testid="session-detail-respondent-identity"]`, `-score`, `-started-at`, `-finished-at`, `-audit-ref` or any `[data-testid="session-detail-answer-row-..."]` node is in the DOM (no data leak).

---

## Accessibility

### TC-18: Side-sheet traps focus and closes on Escape

**Prerequisites:** Side-sheet open at `/app/tests/e49-test-001/sessions/sess-completed-named`.
**When:** The user presses `Tab` repeatedly until focus would otherwise leave the sheet.
**Then:** Focus remains on focusable descendants of `[data-testid="session-detail-root"]` (the trap holds — focus cycles back to the first focusable element rather than escaping to the underlying Results tab).
**and:** `[data-testid="session-detail-close"]` is reachable by keyboard.
**When:** The user presses `Escape`.
**Then:** `[data-testid="session-detail-root"]` is no longer in the DOM.
**and:** The URL returns to `/app/tests/e49-test-001` with the Results tab active.

---

## Mobile

### TC-19: `@mobile` — sheet stacks, filter bar wraps, no horizontal scroll

**Prerequisites:** Viewport set to `375 × 667` (iPhone SE); editor open at `/app/tests/e49-test-001?tab=results`.
**When:** The page loads.
**Then:** `document.documentElement.scrollWidth` equals `document.documentElement.clientWidth` (no horizontal scrollbar at the document root).
**and:** `[data-testid="test-sessions-list-status-filter"]`, `[data-testid="test-sessions-list-search-input"]`, `[data-testid="test-sessions-list-sort-select"]` and `[data-testid="test-sessions-list-page-size-select"]` are all visible and stacked/wrapped (each starts at `x` close to the viewport left edge, not laid out side-by-side overflowing).
**When:** The user clicks `[data-testid="test-sessions-list-row-sess-completed-named-open"]`.
**Then:** `[data-testid="session-detail-root"]` is visible and its bounding rect width equals the viewport width (full-screen stacked sheet on mobile, not a side-by-side drawer).
**and:** Horizontal scroll remains absent on the document root while the sheet is open.
