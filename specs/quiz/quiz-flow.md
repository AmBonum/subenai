# Quiz flow (`/test`) — test plan

**Area:** quiz
**Component(s) under test:** `src/routes/test.index.tsx`, `src/components/quiz/flow/TestFlow.tsx`,
`src/components/quiz/flow/QuestionCard.tsx`, `src/components/quiz/results/ResultsView.tsx`
**Project:** `e2e-chromium` (all TCs are browser-driven UI assertions)
**Spec file:** `e2e/specs/quiz/quiz-flow.spec.ts`

---

## Background

The `/test` route renders `TestFlow` in three sequential phases driven by local React state:

| Phase | Trigger | Visible surface |
|---|---|---|
| `intro` | Initial render — questions loading from `get_quick_test_questions` RPC | Ready card: "Pripravený?" heading + "Odpovedaj rýchlo. Čas beží." body (`data-testid="test-loading"`) |
| `playing` | 900 ms after questions resolve | `QuestionCard` with prompt, option buttons, progress indicator, countdown timer |
| `done` | Last answer submitted | `ResultsView` with animated score, breakdown, share section, restart button |

The RPC (`get_quick_test_questions`) must be mocked for deterministic, fast tests.
The `attempts` Supabase INSERT that happens inside `ResultsView.persistResult` must also be mocked
to return 201 so the share URL renders.

---

## Prerequisites (all TCs)

- Viewport: 1280×800 (Desktop Chrome default)
- Consent pre-seeded to `"all"` via `primeConsent` so the banner never overlaps the quiz
- `get_quick_test_questions` RPC mocked to return a deterministic 10-question array via `mockSupabase`
- `attempts` Supabase table mocked to accept INSERT and return the inserted row with a `share_id`

---

## Happy paths

### TC-01: `/test` page renders the ready card

**Given** the user navigates to `/test`
**When** the page loads (questions may still be fetching)
**Then** the ready card is visible (`data-testid="test-loading"`)
**and** the heading "Pripravený?" is visible inside the card
**and** the body text "Odpovedaj rýchlo. Čas beží." is visible

### TC-02: First question is shown after the intro delay

**Given** the user is on `/test` with 10 mocked questions loaded
**When** the 900 ms intro delay elapses
**Then** the question card is visible (`data-testid="quiz-flow-question-card"`)
**and** the progress indicator reads "Otázka 1 / 10" (`data-testid="quiz-flow-progress"`)
**and** the countdown timer is visible (`data-testid="quiz-flow-timer"`)
**and** the question prompt is visible (`data-testid="quiz-flow-prompt"`)
**and** exactly 3 answer option buttons are present (options `a`, `b`, `c` — `data-testid="quiz-flow-option-a"` etc.)

### TC-03: Answering all 10 questions advances to the results view

**Given** the user is on the first question
**When** the user clicks the correct option on each of the 10 questions (option `b` in the mock — all 10 questions use the same deterministic set)
**Then** after the last answer and its 1300 ms feedback delay, the results view is visible
**and** the animated score value is visible (`data-testid="quiz-results-score-value"`)
**and** the breakdown section is visible (`data-testid="quiz-results-breakdown"`)

### TC-04: Results view shows share section after the attempts INSERT resolves

**Given** the results view is displayed and the `attempts` mock returned 201 with a `share_id`
**When** the share link input renders (the `persistResult` effect fires on mount)
**Then** the share section is visible (`data-testid="quiz-results-share-section"`)
**and** the share URL input contains a URL matching `/r/` followed by 8 characters

### TC-05: Restart button returns to question 1

**Given** the results view is displayed
**When** the user clicks the restart button (`data-testid="quiz-results-restart"`)
**Then** the question card reappears (`data-testid="quiz-flow-question-card"`)
**and** the progress indicator reads "Otázka 1 / 10"

---

## Negative scenarios

_(Out of scope for this plan — covered by integration/error-states spec to be added later.)_

---

## Edge cases

_(Out of scope for this plan — TC-05 covers the most critical state-reset path.)_
