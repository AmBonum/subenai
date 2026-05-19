# Custom test composer — test plan

**Route:** `/test/zostav`
**Component(s) under test:** `src/routes/test.zostav.lazy.tsx`, `src/components/composer/build/PackPreloadChips.tsx`, `src/components/composer/build/QuestionPicker.tsx`, `src/components/composer/build/ComposerSettings.tsx`
**Project:** `e2e-chromium`
**Prerequisites (all TCs):** Consent pre-seeded ("all"). No auth required — the composer is an anonymous flow.

---

## Happy paths

### TC-01: Page renders with all three sections and disabled action buttons

**Prerequisites:** Navigate to `/test/zostav` with consent pre-seeded.

**When** the page finishes loading

**Then** the page heading "Zostav vlastný test pre tím" is visible
**and** the pack-chips section (step 1) is visible
**and** the question-picker section (step 2) is visible
**and** the settings section (step 3) is visible
**and** the "Spustiť pre seba" button is disabled (fewer than 5 questions selected)
**and** the submit/share button is disabled
**and** the URL copy button is not in the page

---

### TC-02: Selecting ≤ 10 questions enables URL copy button; selecting > 10 hides it

**Prerequisites:** Navigate to `/test/zostav` with consent pre-seeded.

**When** the user searches the question picker for a known question and selects 6 questions (≤ urlShareMaxQuestions = 10)

**Then** the "Spustiť pre seba" button is enabled
**and** the submit/share button "Zdieľať s tímom" is enabled
**and** the URL copy button "Skopírovať draft cez URL (bez DB)" is visible

**When** the user additionally selects 5 more questions (total 11, > urlShareMaxQuestions)

**Then** the URL copy button "Skopírovať draft cez URL (bez DB)" is no longer visible

---

### TC-03: "Spustiť pre seba" starts an inline self-run with selected questions

**Prerequisites:** Navigate to `/test/zostav` with consent pre-seeded. Select at least 5 questions by toggling the eshop pack chip (14 questions, enough to meet the minimum).

**When** the user clicks the "Spustiť pre seba" button

**Then** the composer form is replaced by the test flow UI (the TestFlow component renders)
**and** the page does not navigate away from `/test/zostav`

---

### TC-04: URL share — clicking the copy button shows the share toast

**Prerequisites:** Navigate to `/test/zostav` with consent pre-seeded. Select 6 questions individually so that the URL copy button is visible.

**When** the user clicks "Skopírovať draft cez URL (bez DB)"

**Then** the share toast "Odkaz s draftom skopírovaný — pošli ho tímu na úpravu." appears
**and** the toast disappears after ~3 seconds

---

### TC-05: DB share — submitting POSTs to /api/test-sets and navigates to /test/zostava/$id

**Prerequisites:** Navigate to `/test/zostav` with consent pre-seeded. Mock `POST /api/test-sets` to return `{ id: "test-set-e2e" }` with HTTP 201. Select enough questions to meet the minimum (≥ 5) but more than 10 so the DB path is forced.

**When** the user clicks "Zdieľať s tímom"

**Then** the page navigates to `/test/zostava/test-set-e2e`

---

## Negative scenarios

### TC-06: Stale-pack notice — toggling a pack with renamed questions surfaces the amber notice and dismissing it hides it

**Prerequisites:** Navigate to `/test/zostav` with consent pre-seeded.

**When** the user toggles the eshop pack chip (slug "eshop") — which in the real bank is valid, so no drift notice appears — 
**Note:** This TC instead uses a `?config=` URL that encodes question IDs including one renamed ID to trigger the stale drift notice.
Navigate to `/test/zostav?config=<encoded>` where the encoded config includes 5 real question IDs plus 1 non-existent ID (`q-vanished-e2e`).

**Then** the amber stale notice "Z odkazu sa nepodarilo načítať" is visible

**When** the user clicks the dismiss button (aria-label "Zatvoriť upozornenie")

**Then** the amber notice is no longer visible
