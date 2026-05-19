# App — Set Detail (`/app/sets/$setId`) — test plan

**Route:** `/app/sets/$setId`
**Component(s) under test:** `src/routes/app.sets.$setId.tsx`
**i18n namespace:** `user_set_detail` (resolved from `src/i18n/questions.ts`)
**Data source:** in-memory `adminRepo` / `mockAnswerSets` + `mockAnswers`

---

## Prerequisites (all TCs)

- Authenticated educator session (`setupEducator`).
- Cookie consent primed (handled by `setupEducator`).

---

## Happy paths

### TC-01: Valid set renders title, correct column header, and incorrect column header

**Prerequisites:**
- Navigate to `/app/sets/as_001` (first mock set, id `as_001`, name "SMS podvody — základná sada").

**When** the page loads for a known set id.

**Then:**
- The page root (`set-detail-root`) is visible.
- The page header wrapper (`set-detail-title`) is visible.
- The `app-shell-page-header-title` heading contains the set name "SMS podvody — základná sada".
- The correct-answers column card (`set-detail-correct-column`) is visible and its heading reads "Správne odpovede".
- The incorrect-answers column card (`set-detail-incorrect-column`) is visible and its heading reads "Nesprávne odpovede".

---

### TC-02: Correct and incorrect answer rows are rendered

**Prerequisites:**
- Navigate to `/app/sets/as_001`.
- The set has 4 correct answers (`ans_as_001_c1` … `ans_as_001_c4`) and 6 incorrect answers (`ans_as_001_w1` … `ans_as_001_w6`).

**When** the page has fully loaded.

**Then:**
- `set-detail-correct-row-0` is visible.
- `set-detail-incorrect-row-0` is visible.
- At least 4 correct rows (`set-detail-correct-row-{0..3}`) are rendered.
- At least 1 incorrect row (`set-detail-incorrect-row-0`) is rendered.
- The empty-correct message is NOT visible.
- The empty-incorrect message is NOT visible.

---

## Negative scenarios

### TC-03: Unknown set id renders not-found card

**Prerequisites:**
- Navigate to `/app/sets/as_does_not_exist`.

**When** the page loads and no set matches the route param.

**Then:**
- The page root (`set-detail-root`) is visible.
- The not-found card (`set-detail-not-found`) is visible.
- The not-found title (`set-detail-not-found-title`) reads "Sada sa nenašla".
- The not-found description (`set-detail-not-found-description`) contains "as_does_not_exist".
- The correct-answers column (`set-detail-correct-column`) is NOT rendered.
- The incorrect-answers column (`set-detail-incorrect-column`) is NOT rendered.

---

## Edge cases

### TC-04: Back button navigates to /app/library

**Prerequisites:**
- Navigate to `/app/sets/as_001`.

**When** the user clicks the back button (`set-detail-back-button`).

**Then:**
- The current URL is `/app/library` (or has `/app/library` as its path).
