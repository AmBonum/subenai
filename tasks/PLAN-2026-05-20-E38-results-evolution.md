# E38 — Results page evolution (export, account linking, charts, filters, drill-down sub-route)

**Status:** 🟡 Plan draft — awaiting approval before implementation.
**Owner:** Claude Code session, branch `claude/sad-faraday-915d3d`.
**Last updated:** 2026-05-20.
**Related epics:** E34 (edu dashboard MVP — the modal + CSV export we're replacing), E20 (account / `/app` shell), E31 (existing auth + Supabase RLS).

---

## North-star outcome

A test author who shares an edu test can:

1. **Drill into a single respondent's answers on a dedicated sub-route** with a richer layout, real keyboard navigation, and proper SEO/SSR meta (today it's a modal + window.print).
2. **Export the whole results set as PDF or JSON** in one click (CSV stays as the third option).
3. **Be prompted to claim the test set with an account** if they're anonymous — and once they sign up or sign in, every existing test set they own + its respondents shows up in `/app/tests` automatically without re-uploading.
4. **Read the data at a glance through charts** (score distribution, time-to-finish, category breakdown) — with a small toggle row to show/hide optional charts.
5. **Slice the respondents table with per-column filters** (pass/fail, date range, score range, email contains, category-score thresholds).

Today they can: see a modal with one respondent, download CSV, log out. Everything else above is missing.

---

## Existing surface — what we keep, what we replace

### Keep

- `functions/api/results-data.ts` — already returns the full payload (rows + stats + answers JSONB). New views read the same endpoint.
- `AuthorPasswordGate` — the password-based "I'm the author of this set" flow. Stays as the **fallback** path for sets without a linked owner.
- `AggregateStats` — keep the cards, augment with charts beside them.
- `RespondentsTable` — keep the row layout, replace its modal hand-off with a `<Link to="/test/builder/$id/results/$attemptId">`. Sort logic stays, gets joined by filter logic.
- `rowsToCsv` — CSV export stays unchanged (it has its own privacy header + tests). PDF + JSON are sibling helpers next to it.

### Replace

- `RespondentDetailModal` → new file route `test.builder.$id.results.$attemptId.tsx`. Modal component deleted, its tests rewritten as route tests.
- `window.confirm` → already replaced by `ConfirmDialog`, no change needed.
- Static "author-password only" gate → soft-prompt the author to claim the set on first sign-in, fall back to password gate if they decline.

---

## Phase breakdown

| # | Phase | What lands | Blocks |
|---|---|---|---|
| A | **Schema + RPC groundwork** | `test_sets.owner_id` column (nullable, FK to `auth.users`); RPC `claim_test_set(set_id, password)` (sets `owner_id` if caller knows the author password); RPC `list_my_test_sets()` (returns sets where `owner_id = auth.uid()`). RLS update on `attempts` so an authenticated owner can read attempts via `owner_id` in addition to the existing password-cookie path. | All other phases. |
| B | **Detail sub-route** | `test.builder.$id.results.$attemptId.tsx` — new file route. Renders the same per-question detail as the modal but full-page, with SSR-safe head (`noindex,nofollow` — these are private), keyboard nav (←/→ to prev/next respondent), and "Back to results" smart link. POM file added. Modal deleted; `RespondentsTable.actions[*].view_button` becomes a `<Link>`. | Phase C (uses same data hook). |
| C | ✅ **Charts row** | New `<ResultsCharts>` component below `<AggregateStats>`. Three visualisations via Recharts (already a dep): score-distribution histogram (BarChart on `stats.histogram`), pass/fail donut (PieChart, green pass + red fail with legend), time-to-finish histogram (BarChart, 4 fixed minute buckets via pure `buildTimeBuckets()`). Each card has an sr-only summary so screen readers don't depend on the SVG. Pure data-shaping in `src/lib/edu/charts.ts` for testability. **Out:** show/hide toggles (deferred — full charts always-on is the simpler v1; adding a chip row would have introduced sessionStorage + consent gating that wasn't worth the surface). | Independent. |
| D | ✅ **Filterable table** | Per-column filters on `RespondentsTable`. Filter UI: name/email free-text (existing), score range (numeric min/max 0–100), pass/fail (3-way: all/pass/fail), date range (two date inputs). All filters AND together. Active-filter count chip + "Clear filters" button. URL search-params reflect filters so a state can be linked or refreshed. **Out:** per-category min-correct threshold (deferred — requires drill-down `answers` shape stabilisation across historical rows). | Independent. |
| E | ✅ **Export PDF + JSON** | JSON button shipped in earlier slice (E38 Phase E partial). PDF button now alongside via `@react-pdf/renderer` route-split chunk (~488 KB gzipped, only downloaded on first click — main bundle unchanged). PDF layout: title (creator label) + generated-at line + red-border GDPR caveat + 5-cell aggregate stats grid + score-distribution histogram + filter summary (when active) + filtered respondents table with header repeated per page + footer with page number. Honours URL filters from Phase D — `Zobrazené X z Y (zúžené filtrom)` line above the table when active. **Out:** "include drill-down" per-row appendix (deferred — needs `answers` JSONB shape stabilisation; current PDF is dashboard-scoped). CSV stays unchanged. | Phase D (PDF respects filters). ✅ |
| F | **Claim flow + /app surface** | On `/test/builder/$id/results`, if `phase === "needs_auth"` AND the visitor is signed in, call `claim_test_set` automatically; if successful, skip the password gate. If the visitor is NOT signed in, show a small "Sign in / sign up to claim this set permanently" callout next to the password gate. New `/app/tests` view (or augment the existing one) lists owned sets via `list_my_test_sets`, each linking to `/test/builder/$id/results`. | Phases A + B. |
| G | **Tests + lint + build + CHANGELOG** | New unit tests: route loader + per-question rendering for the detail page, filter logic, claim RPC integration, PDF generation smoke, JSON export bytes. New e2e specs under `e2e/specs/results/` for: drill-down route, filter combinations, claim-then-list-in-app. Lint 0/0; build ✓; CHANGELOG entry; /cookies update for any new storage keys (filter persistence). | F. |

---

## Open questions that block plan finalisation

1. **PDF library choice** — `@react-pdf/renderer` is the cleanest fit (declarative JSX-to-PDF, no DOM dependency, works in workers if we ever move it server-side). But it adds ~250 KB gzipped to the bundle. The alternative is `pdfmake` (~150 KB) with a more imperative API. **Recommendation:** `@react-pdf/renderer`, route-level code-split via the existing lazy route so the cost only lands on `/results` viewers. Tell me to use the other if you prefer.
2. **Charts library** — Is Recharts already in the bundle? If yes, use it; if not, evaluate. `chart.js` is ~70 KB but imperative; `recharts` is ~90 KB and idiomatic with React; `visx` is small but the API is verbose. **Recommendation:** Recharts.
3. **Claim flow UX** — Two options:
   - **a)** Anonymous author lands on `/results`, password-gate appears, with a "Sign up to claim this set" sub-link. They sign up → on success the set is claimed → `/results` reloads.
   - **b)** Always force sign-up first if the set has no owner; password-gate only as fallback for users who refuse.
   **Recommendation:** (a) — non-coercive, lets the existing flow keep working, and the sign-up nudge is one line of copy.
4. **`/app/tests` augmentation vs new view** — There's already an `/app/tests` route (`src/routes/app.tests.index.tsx`). Verify whether it already lists tests the user authored, or whether it lists tests the user *took*. Plan assumes it currently lists tests-taken; new feature would add a "Created by you" tab or section.
5. **History of pre-claim attempts** — When a set is claimed *after* respondents have already filled it, do those existing attempts stay visible to the new owner? **Recommendation:** Yes — claiming is "I am the author", not "I am a new author from now on." The schema already allows it; RLS update needs to honour it.
6. **Filter persistence scope** — Should filter state be per-set (each set remembers its own filters) or global (one set of filter prefs)? **Recommendation:** Per-set, in URL search-params (no storage write at all) — shareable, refreshable, no consent gating needed.

---

## Out of scope for this epic

- Email digests / notifications on new respondents (would be E39+).
- Multi-author / team-share of a set (current model is one owner).
- Bulk operations across multiple sets in `/app` (single-set actions only).
- Localised PDF — English layout text for now; Slovak headings only.
- Real-time updates of the results page (current pull-on-mount stays; refresh = manual).

---

## Story DoD checklist (per CLAUDE.md)

- [ ] Implementation per phases A–G.
- [ ] Unit + e2e tests per Phase G.
- [ ] `/privacy` + `/cookies` updated for any new data surface (filter URL state, claim RPC writes, PDF generation reads).
- [ ] CHANGELOG entry with user-facing summary in Slovak.
- [ ] Lint 0/0, all tests green, build ✓.
- [ ] Fresh-context CR by `general-purpose` agent.
- [ ] Branch merged to `main` only when all stories are `✅ Done`.

---

## Estimate

Phases A + B + E (smallest viable cut — drill-down route + JSON export + schema + claim RPC) is roughly a half-day of focused work. Adding C (charts) + D (filters) doubles it. F (claim + /app surface) adds another half-day because it touches auth + RLS. G (tests + closeout) adds a quarter-day.

**Total: ~2 working days for full epic.** Can be sliced — see "Suggested shipping order" below.

---

## Suggested shipping order

If you want to ship incrementally and see value sooner:

1. **PR #1 — Drill-down sub-route + JSON export** (Phases B + part of E). Smallest, no schema change. Replaces the modal, adds JSON download. Builds confidence that the route works.
2. **PR #2 — Claim flow + /app surface** (Phases A + F). Schema migration + RPCs + the /app integration. Highest user value.
3. **PR #3 — Charts + filters + PDF** (Phases C + D + rest of E). Pure UI polish on top of the working data model.
4. **PR #4 — Final tests + CHANGELOG + closeout** (Phase G).

Tell me which slice to start with after you confirm the plan, or say "ship all in one" and I'll do the whole sequence as separate commits on this branch.
