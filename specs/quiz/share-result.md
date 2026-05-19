# Share result page (/r/$shareId) — test plan

**Area:** `specs/quiz/`
**Component(s) under test:** `src/routes/r.$shareId.tsx`, `src/components/quiz/review/AnswerReviewSection.tsx`, `src/components/quiz/review/AnswerReviewCard.tsx`
**Routes:** `/r/$shareId`
**API endpoints:** Supabase REST — `GET /rest/v1/attempts?share_id=eq.<id>&select=...` (anon key, RLS read-only)
**Data dependencies:** `attempts` table row keyed by `share_id`; static question bundle for review card lookup.
**Source stories:** Phase 8 session 1 — peer share results (read-only anon view).
**Last updated:** 2026-05-19

---

## Context

`/r/$shareId` is an anonymous, read-only page that renders a shared quiz result.
It fetches a single row from the `attempts` table by `share_id`, then renders:
a score card, percentile line, personality card, category breakdown, a toggle that
lazy-loads the answer review section, social share widgets, a CTA to take the test,
and a self-service delete flow (the only writable surface on the page).

The page has no authentication requirement. Any visitor with the URL can view and
delete the result. Deletion is a Supabase DELETE via the anon key (RLS permits it
because the `share_id` column is the sole access control token).

Slovak strings the plan asserts against (verbatim from `src/i18n/locales/sk/quiz.json`
`share.*` namespace):

- loading indicator: `"Načítavam výsledok…"`
- not-found heading: `"Výsledok neexistuje"`
- not-found body: `"Link je neplatný alebo bol zmazaný."`
- not-found CTA: `"Otestuj sa"`
- header label (viewer context): `"Cudzí výsledok"`
- review toggle (with count): `"Pozri si moje odpovede ({n})"` e.g. `"Pozri si moje odpovede (3)"`
- breakdown card heading: `"Rozloženie"`
- delete button: `"Vymazať tento výsledok"`
- delete confirm button: `"Áno, definitívne vymazať"`
- delete done message: `"Výsledok bol vymazaný. Refresh stránky potvrdí, že už neexistuje."`
- CTA to take the test: `"Otestuj sa aj ty"`
- missing question placeholder: `"Otázka už nie je dostupná — bola odstránená z banky po tom, čo si test dokončil/a."`

## Relationship to existing Vitest suite

`tests/routes/r-shareId.test.tsx` covers four unit-level cases (review toggle,
empty answers, malformed answers, not-found). These E2E tests do NOT duplicate
that coverage. Instead they verify the full browser render pipeline: Supabase
network interception, lazy-loaded `AnswerReviewSection`, the delete network
round-trip, and the missing-question regression path — none of which are
exercisable in jsdom.

## Out of scope

- Social share buttons (covered by their own component tests).
- IG Story image download (requires canvas + binary blob — too brittle for E2E).
- Percentile accuracy (a data concern, not a UI contract).
- Demographics fields — not present on this route.

---

## Happy paths

### TC-01: Valid share renders score card, personality card, and breakdown

**Prerequisites:**
- Browser with consent pre-seeded to "all".
- Supabase `attempts` REST endpoint stubbed to return a valid row with
  `share_id="TESTAAAA"`, `final_score=75`, `percentile=70`,
  `personality="internet_ninja"`, `breakdown={phishing:80,url:70,fake_vs_real:60,scenario:90}`,
  `answers=[]`.

**When** the user navigates to `/r/TESTAAAA`
**Then** the score `75` is visible in `data-testid="share-result-score"`
**and** the percentile value `70` is visible in `data-testid="share-result-percentile"`
**and** `data-testid="share-result-personality-card"` is visible
**and** `data-testid="share-result-breakdown-card"` is visible with heading `"Rozloženie"`
**and** `data-testid="share-result-cta-test"` link is visible with text `"Otestuj sa aj ty"`

---

### TC-02: Unknown shareId renders the not-found state

**Prerequisites:**
- Browser with consent pre-seeded to "all".
- Supabase `attempts` REST endpoint stubbed to return `data: null, error: null`
  (row not found) for `share_id="NOTFOUND"`.

**When** the user navigates to `/r/NOTFOUND`
**Then** `data-testid="share-result-not-found"` is visible
**and** the heading `"Výsledok neexistuje"` is visible
**and** the body text `"Link je neplatný alebo bol zmazaný."` is visible
**and** `data-testid="share-result-not-found-cta"` link with text `"Otestuj sa"` is visible
**and** `data-testid="share-result-page"` is NOT in the document (the success page did not render)

---

## Edge cases

### TC-03: Delete flow — confirm and complete transitions to deleted state

**Prerequisites:**
- Browser with consent pre-seeded to "all".
- Supabase `attempts` REST GET endpoint stubbed to return a valid row with
  `share_id="DLTAAAAA"` (same payload shape as TC-01).
- Supabase `attempts` REST DELETE endpoint stubbed to return HTTP 204 (success).

**When** the user navigates to `/r/DLTAAAAA`
**and** `data-testid="share-result-page"` is visible
**and** the user clicks `data-testid="share-result-delete-button"`
**Then** `data-testid="share-result-delete-confirm-button"` becomes visible with text `"Áno, definitívne vymazať"`
**and** `data-testid="share-result-delete-cancel-button"` is visible
**When** the user clicks `data-testid="share-result-delete-confirm-button"`
**Then** `data-testid="share-result-delete-done"` becomes visible with text containing `"Výsledok bol vymazaný."`

### TC-04: Review section — known-bundle questions render cards; UUID-only questions render missing-question placeholder

**Prerequisites:**
- Browser with consent pre-seeded to "all".
- Supabase `attempts` REST endpoint stubbed to return a row with:
  - `share_id="REVAAAAA"`
  - `answers` containing two records:
    1. `questionId="q-iq-bb-001"` (exists in the static bundle)
    2. `questionId="00000000-0000-0000-0000-000000000001"` (UUID not in the bundle)

**When** the user navigates to `/r/REVAAAAA`
**and** `data-testid="share-result-review-toggle"` is visible
**and** the user clicks `data-testid="share-result-review-toggle"`
**Then** `data-testid="share-result-review-region"` becomes visible (not hidden)
**and** `data-testid="share-result-review-toggle"` has `aria-expanded="true"`
**and** the review section contains at least one answer card rendered from the static bundle
**and** the review section contains one `"Otázka už nie je dostupná"` placeholder card for the UUID question
