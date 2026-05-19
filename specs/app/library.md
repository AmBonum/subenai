# `/app/library` — test plan

**Area:** `specs/app/`
**Component(s) under test:** `src/routes/app.library.tsx`, `src/lib/platform/mock-store.ts` (`useQuestions`), `src/i18n/locales/sk/questions.json` (`user_library.*`)
**Routes:** `/app/library`
**API endpoints:** none — library reads from `SEED_QUESTIONS` in the client-side mock-store (no PostgREST round-trip until AH-12)
**Data dependencies:** `SEED_QUESTIONS` (120 seeded questions, 10 categories, 15 types, 3 difficulties)
**Source stories:** Phase 6 of testing-coverage epic
**Last updated:** 2026-05-19

---

## Context

`/app/library` renders a filterable grid of questions sourced from the
client-side mock-store. Three filter controls sit in a toolbar Card:

- **Search** (`data-testid="library-search-input"`) — substring match on `prompt`
- **Branch select** (`data-testid="library-branch-filter"`) — `all` or any `category` value
- **Difficulty select** (`data-testid="library-difficulty-filter"`) — `all | easy | medium | hard`

When `filtered.length === 0` the component renders a single Card with
`data-testid="library-empty-state"`. Otherwise it renders up to 60 Cards
(one per question) each with `data-testid="library-row-<id>"` and a type
badge with `data-testid="library-row-preview-<id>"`.

The route uses `staticData` default (no `hideSiteHeader`), so the app
shell nav is present. `useQuestions` reads a module-level in-memory store;
it never calls Supabase, so `setupAppShell` is the only mock layer needed.

## Out of scope

- Visual layout / Tailwind styling.
- The "showing capped" footer (requires > 60 filtered results — trivially
  true for the unfiltered list but not the focus of these TCs).
- Row-level actions (there are none — the card is read-only in this phase).
- Server-side RLS on the future `questions` table.
- The `/app` sidebar active-link state (covered by `app/shell.spec.ts`).

---

## Happy paths

### TC-01: Page renders with toolbar and populated question grid

**Prerequisites:**
- Educator session primed (`setupEducator`), onboarded = true (default).
- Viewport 1280×800.

**When** the user navigates to `/app/library`
**Then** the library root (`data-testid="library-root"`) is visible
**and** the page heading reads "Knižnica otázok"
**and** the search input (`data-testid="library-search-input"`) is visible
**and** the branch filter (`data-testid="library-branch-filter"`) is visible
**and** the difficulty filter (`data-testid="library-difficulty-filter"`) is visible
**and** the first question card (`data-testid="library-row-qp_0001"`) is visible (non-empty grid)

### TC-02: Search filters the question list

**Prerequisites:**
- Educator session primed, onboarded = true. On `/app/library`.

**When** the user types "Otázka #1:" into the search input
**Then** the question cards rendered are fewer than the unfiltered total
**and** the card for question #1 (`data-testid="library-row-qp_0001"`) is still visible
**and** the empty-state card (`data-testid="library-empty-state"`) is NOT visible

### TC-03: Unmatched search shows empty state

**Prerequisites:**
- Educator session primed, onboarded = true. On `/app/library`.

**When** the user types a string that matches no question prompt (e.g. "xyzzy_no_match_42")
**Then** the empty-state card (`data-testid="library-empty-state"`) is visible
**and** it contains the Slovak text "Žiadne otázky neboli nájdené pre zvolené filtre."
**and** the first question card (`data-testid="library-row-qp_0001"`) is NOT visible
