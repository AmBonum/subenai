# PLAN — /app + Header Redesign (Educator-Retention)

**Date:** 2026-05-19
**Status:** AWAITING APPROVAL
**Owner:** project owner
**Inputs:** 5 parallel senior-agent reports (codebase audit, UX/IA, UX copy, marketing positioning, dev architecture)
**Locked decisions (project owner, this session):**
- Persona: **Educator** (Slovak teacher / lector / HR trainer building scam-awareness tests)
- Goal: **Retention of existing /app users** (not new-user acquisition)
- Header pattern: **Top mega-menu** (locked — no permanent sidebar on public site)

---

## TL;DR

Educator retention loop = **"the project is still alive, I have new data I haven't seen, here's my next move."** The redesign delivers it via:
1. **Mega-menu** that surfaces `Pre školy a lektorov` as a top-level item + `Changelog/Čo je nové` as a returning-visitor magnet.
2. **/app sidebar** reorganized from 14-item flat list into 3 grouped sections (Tvorba / Výsledky / Account-footer) + dashboard rebuilt around "what changed since last login."
3. **First-time-login** onboarding state (DB-backed via `profiles.onboarded_at`), 3-question skippable step that personalizes the dashboard.
4. **5 retention loops** ranked by leverage. Top 2 (weekly digest + course-recommended-after-poor-result) ship first; others phased.
5. **Bug fixes** along the way: dead `/docs` link in AppShell, double-header bug on /app, /app E2E specs all skipped.

**Phasing:** 0-6 PRs over ~6 sessions. Phase 0 fixes bugs (must come first). Phases 1-3 ship UI + onboarding. Phases 4-6 ship retention loops in dependency order. Total surface: ~4 new tables, ~4 new lazy routes, ~80 new i18n keys × 3 locales.

---

## Phase 0 — Fix what's already broken (Pre-redesign hygiene)

Codebase audit found 4 bugs that make any redesign feel half-baked. Ship these in one or two small commits **before any redesign PR lands**.

| Bug | Source | Fix |
|---|---|---|
| `/docs` sidebar link in `AppShell.tsx:118` is a 404 (route never existed; admin sidebar already removed it) | Codebase agent §E | Remove link from `AppShell.tsx` + drop `docs` key from app-shell i18n. |
| Double-header on every `/app` route: `SiteHeader` renders globally from `__root.tsx`, `AppShell` renders its own header below. Both in DOM. | Codebase agent §C + Dev architect §H.1 | Add a `hideSiteHeader` flag from route loader. `__root.tsx` reads it and omits `<SiteHeader />` on /app + /admin. Simple, no parent/child surgery. |
| `/app/templates` "Preview" button is a no-op placeholder | Codebase agent §B | Hide the button until backend lands. CLAUDE.md style rule: don't ship broken UI. |
| All `e2e/specs/app/*` skipped with `test.skip(true, "AH-11 fixture")` | Codebase agent §E | Out of scope for redesign. **Flag for separate epic** — note in this PLAN's "Followups" section, don't block on it. |
| `auth.reset-password` has a race window where `hasSession` can briefly be null (no `onAuthStateChange` listener) | Codebase agent §A | Tiny fix: add listener. Bundle with Phase 0. |

**Phase 0 PR**: ~50 lines of edits, no schema changes, no new components. Ship this before anything else.

---

## Phase 1 — Mega-menu header

### Decisions (consensus across 4 agents)

| Decision | Agent consensus | Source |
|---|---|---|
| Use Radix `NavigationMenu` (already installed) | Architect §C | Single primitive, accessible, keyboard nav free |
| `delayDuration={150}` | Architect §C | Half of Radix default; feels less sluggish |
| Mobile: existing Sheet + `Accordion` for panel items | Architect §C | No new mobile primitive; reuse |
| Surface `Pre školy a lektorov` as top-level item | UX §B + Marketing §C (both insistent) | Biggest conversion lever for educator persona |
| Surface `/changelog` ("Čo je nové") prominently | Marketing §C | Returning-visitor magnet; highest-leverage existing asset |
| Remove `/admin` from public chrome (footer, sitemap) | Marketing §F | Reduces visitor confusion; admins use bookmark |
| Locale switcher: keep visible but quiet (icon-only top-right) | Marketing §C | Brand signal, not nav priority |
| Header CTA stays `Spustiť rýchly test`; **NOT** `Podporiť projekt` | Marketing §C | Anti-paywall positioning |

### Decision needed from project owner

**D1: Mega-menu top-level item count and labels.**
- UX agent proposed **6 items**: Test · Testy · Školenia · Pre školy a firmy · O projekte · Podporiť
- Marketing agent proposed **5 items**: Test · Testy · Školenia · Pre školy · Projekt (Podporiť becomes the right-pill; not a nav item)
- Copywriter wrote labels for **5 items**: Rýchly test · Sady testov · Školenia · Pre školy a lektorov · Podpora projektu

**My recommendation: 5 items.** Marketing's argument that "Podporiť projekt as nav item erodes the anti-paywall positioning" is more important than UX's argument that "Podporiť as nav-text is the rightmost pre-CTA emphasis." The copywriter's labels are the cleanest. Confirm or override.

### Component architecture (from Architect §C)

```
src/components/layout/
  SiteHeader.tsx                ← replace flat nav list with <MegaMenu>
  mega-menu/
    MegaMenu.tsx                ← new: NavigationMenu root
    MegaMenuItem.tsx            ← trigger + content panel pair
    MegaMenuPanel.tsx           ← link grid + optional featured card
    mega-menu.types.ts          ← MegaMenuItemDef interface
```

Mega-menu content is **static TypeScript** for v1 (translated via `tFor("header")`). Future upgrade: drive from `cms_navigation` DB table (already exists, currently empty). Add `useNavigationItems()` hook with static fallback in a separate follow-up.

### Copy (from Copywriter §B — paste-ready)

Each top-level item has a label + 1-line hover description, in sk/en/cs. See **Copy Appendix A** below for full JSON.

### Bundle impact estimate
- Mega-menu code: +4-6 KB gzip in entry chunk (Architect §F)
- Acceptable. No new dependencies.

### Risks
- **Test ID rename breaks Playwright specs.** `e2e/poms/shared/SiteHeader.ts` uses `header-nav-link-{slug}`. New IDs: `header-mega-trigger-{slug}` + `header-mega-link-{slug}-{i}`. POM must be updated in same PR. Run `grep -r "navLink(" e2e/` before implementing.
- **Touch device hover edge cases.** Radix handles `pointerover` correctly. Verify on real iOS 17+ before merge.

---

## Phase 2 — Bug fixes follow-up + AppShell sidebar reorg

### Sidebar reorg (consensus, slight divergence)

**Current:** 14 flat sidebar items (Dashboard, Tests, Tests-New, Templates, Library, Audiences, Teams, Notifications, History, Help, Docs (broken), Profile, Security, DSR).

**Proposed structure** — from UX + Copy + Architect, synthesized:

```
─── Tvorba ─────────────────  (group label — Copywriter wording)
  Prehľad             /app
  Moje testy          /app/tests
  Šablóny             /app/templates
  Knižnica otázok     /app/library
  (Nový test moves to a `+` button on `/app/tests` — NOT a sidebar item)

─── Výsledky ────────────────  (group label — Copywriter wording)
  Výsledky            /app/results   ← NEW cross-test view
  Skupiny             /app/audiences
  História            /app/history
  Notifikácie [3]     /app/notifications

─── (pinned to bottom — Account footer) ───
  Tím a roly          /app/teams
  Účet                /app/account/profile  (tabs: Profile · Security · DSR)
  Pomoc               /app/help
  Odhlásiť sa
```

**Removed from sidebar (still reachable elsewhere):**
- `Docs` — was a 404, drop entirely
- `Bezpečnosť` + `GDPR žiadosť` — merge as tabs inside `/app/account/profile`
- `Tests-New` (slot) — replaced by `+ Nový` button on `/app/tests`

**New routes implied:**
- `/app/results` — cross-test result view (NEW, lazy)
- `/app/account` becomes a tab container with sub-routes for `/profile` `/security` `/dsr`

### Decision needed

**D2: Sidebar grouping discoverability.**
- UX §F flagged that Slovak SaaS users prefer denser, more information-rich UI. Collapsing 14 items to grouped sections may feel like "kde sú moje funkcie?" to existing users.
- Mitigation: ship all groups expanded by default; A/B test progressive disclosure later.

**My recommendation: ship expanded by default.** Confirm.

### Brand label rebrand (Copywriter §G)

| Current | Proposed |
|---|---|
| `SubenAI · Workspace` (sidebar brand subtitle) | `SubenAI · Pre lektorov` |

**My recommendation: ship it.** Persona-flag on every page load. High-leverage, zero-cost. Confirm.

### Dashboard rebuild (UX §C + Marketing §E + Copy §C)

Current dashboard: 4 stat cards (active tests, total sessions, respondents, completion rate). Marketing called these "vanity metrics."

**New dashboard layout** (top to bottom):

1. **"Vitaj späť" intro strip** — only on first session after `onboarded_at` is set; auto-dismiss after 1 view.
2. **"Tvoj posledný test" card** — if any test has new respondents since last login, surface here with one-click "Pozri výsledky."
3. **"Nové od poslednej návštevy"** strip — list of: new courses, new question categories, top dashboard delta numbers. Copy: `"Čo sa zmenilo od pondelka: {n} dokončení, {m} nových slabín."`
4. **"Pokračovať v rozrobenom"** — drafts not yet published.
5. **Retention cards** (one per active loop — see Phase 4-6): digest summary, course recommendation, retest reminder.

**Empty state** (no tests yet): persona-led empty state with template CTA — see Copy Appendix B.

### Decision needed

**D3: Retention cards on dashboard vs. sidebar links?**
- UX §C: surface retention surfaces as own sidebar items (`Notifikácie`, plus future `Digest`/`Recommendations`/`Retest`).
- Architect §H.8: dashboard cards instead of sidebar items — keeps each retention PR self-contained, doesn't bloat sidebar.

**My recommendation: Hybrid. Notifications stays in sidebar (it's the inbox). Digest + recommendations + retest = dashboard cards only.** Reasons: (a) keeps AppShell.tsx untouched after Phase 2, so retention PRs are independently shippable; (b) dashboard becomes the actual "destination" — what UX called "the changelog for the educator's class"; (c) the user already taps the sidebar to see Notifications, they don't need a separate route for each retention type. Confirm.

---

## Phase 3 — Onboarding state + first-login experience

### Schema (Architect §E)

```sql
ALTER TABLE public.profiles ADD COLUMN onboarded_at timestamptz;
-- existing UPDATE policy on profiles must include this column (verify)
```

DB-backed, cross-device. No localStorage. No new trigger.

### Flow

1. New user signs up → email verify → lands on `/app` for first time.
2. `app.tsx` `beforeLoad` extended to call `requireOnboarded()`; if `onboarded_at` is null, redirect to `/app/onboarding`.
3. `/app/onboarding` shows 3 skippable questions (UX §E):
   - "Koho budeš testovať?" (radio: trieda / kolegovia / klienti / iné / skip)
   - "Ktoré scamy ti najviac vadia?" (multi-select chips)
   - "Chceš novinky o nových scamoch?" (yes / weekly / no — drives digest opt-in default)
4. Submit → write to `profile_preferences` (new table or jsonb column) + set `onboarded_at = now()` → redirect to `/app`.
5. Dashboard shows the **welcome banner** copy (Copywriter §C, `dashboard.intro`).

### Decision needed

**D4: Profile preferences storage.**
- Architect didn't specify. Two options:
  - (A) New table `profile_preferences` (audience kind, scam interests as text[], digest cadence)
  - (B) Add a `preferences jsonb` column to `profiles`

**My recommendation: (B) jsonb column on profiles.** Reasons: zero-FK overhead, easy migration, matches existing pattern (`avatar_initials`, `display_name` all live on `profiles`). Schema in 1 line vs 30. Confirm.

### Auth flow polish (Copywriter §E + Architect §E)

Bundle these with Phase 3 since they touch the same surface:

| Surface | Improvement | Source |
|---|---|---|
| `/login` post-success routing | Extract to `src/lib/auth/post-login-redirect.ts` (currently inlined in `login.tsx:89-104`) | Architect §E |
| `/login/verify-2fa` hint copy | Name specific apps (Authy, GA, 1Password) + 30s rotation hint | Copywriter §E |
| `/forgot-password` success copy | Add "Sender is noreply@subenai.sk" — spam-folder finder | Copywriter §E |
| OAuth-only account tries password | New `auth.oauth_only_collision` flow (title + body + "Continue with Google" CTA + "Use different email" fallback) | Copywriter §E |
| `tooltip_2fa_deferred` | Internal jargon leak — rewrite without "AH-11" reference | Copywriter §G |
| `toast_password_deferred` | Broken-promise toast; **hide the button entirely** until backend ships | Copywriter §G |

---

## Phase 4-6 — Retention loops

Marketing §D ranked retention loops by **referral leverage**:
1. Peer-success-card (referral channel — teachers brag in staff rooms)
2. Weekly digest (forwardable to colleagues)
3. Retest reminder (personal habit, low referral)
4. Course-recommended (folds into digest)

UX §D ranked by **retention impact**:
1. Weekly digest (build first)
2. Course-recommended (#2 by impact, low effort)
3. Retest reminder (builds on #1 infra)
4. Peer-card (defer until research)
5. Streak (skip — Slovak persona kryptonite)

**Synthesis: ship by dependency order, not by either ranking.** Each loop is independently shippable.

### Phase 4 — Digest (UX/Marketing priority #1)

**Schema** (Architect §D.1):
```sql
CREATE TABLE public.user_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  stats jsonb NOT NULL DEFAULT '{}',
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_start)
);

-- RLS: owner-read only; service-role write
CREATE POLICY user_digests_owner_read ON public.user_digests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
```

**Cron:** Monday 07:00 CET. **Only fires if signal exists.** Copy already written by Copywriter §D.1 including the "quiet week" fallback variant (opt-in only).

**Decision needed:**

**D5: Cadence — weekly or monthly?**
- UX §D: weekly
- Marketing §D: monthly ("weekly is a content treadmill that breaks 'honest, not over-promised' voice if the team slips")
- Copywriter §D: weekly subject lines written

**My recommendation: weekly, but ONLY fires if signal exists.** Copywriter already wrote both variants. Marketing's "treadmill" concern is right for editorial digests; this digest is **data-driven, not editorial** (it's "your respondents did X" not "we wrote a newsletter"). Data-driven cadence can be weekly because no human author burden. Confirm.

**New route:** `src/routes/app.digest.tsx` (lazy)

### Phase 5 — Course recommendations (UX priority #2)

**Schema** (Architect §D.2):
```sql
CREATE TABLE public.course_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  training_id uuid NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  reason_key text NOT NULL,
  score_at_rec numeric(5,2),
  dismissed_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, training_id)
);
```

**Trigger:** After a respondent in an educator's edu-mode test scores ≤50% in a topic.

**Copy:** Copywriter §D.2 — names the respondent + skóre + concrete 5-min action.

**Route:** `src/routes/app.recommendations.tsx` (lazy). Or surface as dashboard card (per D3 decision).

**Risk** (Architect §H.3): RLS recursion via `training_id` FK to `trainings`. Verify the trainings policy isn't recursive before merge.

### Phase 6 — Retest reminders (Architect §D.3)

**Schema:**
```sql
CREATE TABLE public.retest_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  last_score numeric(5,2),
  sessions_count integer NOT NULL DEFAULT 1,
  remind_after date NOT NULL,
  dismissed_at timestamptz,
  snoozed_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, test_id)
);
```

**Cron:** Daily. 90-day cycle from last respondent session (matches Slovak curriculum quarter — UX §D).

**Copy:** Copywriter §D.3 — frames retest as *evidence of teaching effectiveness*.

### Phase 7 (deferred until research) — Peer card

**Architect §D.4:** SECURITY DEFINER RPC `get_peer_card(p_user_id uuid)` reading from `attempts_anon` view (PII-safe). Returns user percentile + cohort baseline.

**Copy:** Copywriter §D.4 — anonymized, "učiteľka z gymnázia" framing.

**UX risk flag** (UX §F): emotional valence untested. Could read as "your students are below average." Copy-test with 5 real educators before building.

**Marketing flag** (Marketing §D): highest referral leverage — teachers screenshot and share in staff Viber groups. If/when it ships, must produce a **downloadable PNG** (Marketing §D) of the educator's results card with PII stripped — that's the actual marketing artifact, not the in-app card.

**My recommendation: skip Peer-card from initial 6-PR plan.** Reasons: (a) UX research dependency; (b) PNG-generation infrastructure is heavier than a route + table; (c) digest + recommendations + retest deliver the core retention loop without it. Revisit after Phase 6 ships and we have 3 months of digest open-rate data.

---

## Followups (not in scope, but flagged)

| Item | Source | Severity |
|---|---|---|
| `/app` E2E specs all skipped with `test.skip(true, "AH-11 fixture")` — need an authenticated-session Playwright fixture | Codebase §E | Medium — blocks regression coverage for everything we ship in this plan |
| `app.library.tsx` + `app.tests.new.tsx` + `app.sets.$setId.tsx` use mock-stores (AH-12 schema dependency) | Codebase §E | Medium — distorts what educators see |
| `cms_navigation` table exists but is empty; eventually drive mega-menu from CMS | Architect §H.6 | Low — future upgrade |
| `/support` route renders its own `<Footer>` inline (potential triple-footer with root layout) | Codebase §E | Low — verify on prod |
| Streak / gamification — UX §D.5 + Marketing §D both said NO | (negative result) | Closed |
| Peer-card emotional-valence research | UX §F + Marketing §D | Deferred |
| Peer-card share-PNG generator | Marketing §D | Deferred (gated on Peer-card itself) |

---

## Risk register (consolidated)

| # | Risk | Source | Mitigation |
|---|---|---|---|
| R1 | Mobile mega-menu hover on iOS 17+ tablets at `md` breakpoint may be ambiguous | Architect §H.2 | Verify on real device; Sheet fallback below `md` is safe |
| R2 | Test-ID rename breaks all `header.navLink()` POM calls | Architect §H.5 | Update POM in same PR; grep first |
| R3 | `course_recommendations` RLS recursion via `trainings` FK | Architect §H.3 | Verify `trainings` policy isn't recursive before PR 5 merge |
| R4 | `profiles.onboarded_at` UPDATE policy may use column allowlist | Architect §H.4 | Check `20260517000000_admin_hub_schema.sql` before PR 3 |
| R5 | Slovak users may reject collapsed sidebar groups ("kde sú moje funkcie?") | UX §F | Ship expanded by default; A/B test collapse later |
| R6 | Empty digest emails = retention killer | Copywriter D.1 + UX §F | Cron checks signal exists before firing; opt-in for "quiet week" digests |
| R7 | `Podporiť projekt` as persistent CTA erodes anti-paywall positioning | Marketing §F | Locked: stays as right-rail pill, never header nav |
| R8 | Peer-card emotional valence unvalidated | UX §F + Marketing §D | Defer; research first |
| R9 | Slovak educators allergic to gamification | UX §F + Marketing §F | Closed: no streaks, no badges, no leaderboards |
| R10 | CONSENT_VERSION lock — any new tracking categories require coordinated bump | UX §F + CLAUDE.md | Digest is owner-only data, no tracking; no bump needed |

---

## Phasing recap

| Phase | Scope | Dependency | Estimate (focused agent session) |
|---|---|---|---|
| **0** | Bug fixes (dead /docs, double-header, race window, hide broken Preview) | None | ~1 session, <100 lines |
| **1** | Mega-menu in SiteHeader (desktop + mobile Accordion) | Phase 0 (double-header gone) | ~1 session, ~400 lines |
| **2** | AppShell sidebar reorg + dashboard rebuild + brand label `Pre lektorov` | Phase 1 | ~1.5 sessions |
| **3** | `profiles.onboarded_at` + `/app/onboarding` route + auth-flow copy polish | Phase 0 (DB additive only — can run parallel) | ~1 session |
| **4** | Weekly digest table + cron stub + `/app/digest` | Phase 2 (dashboard shows digest card) + Phase 3 (digest opt-in default from onboarding) | ~1 session |
| **5** | Course recommendations table + edge function stub + dashboard card or route | Phase 4 (retention-queries.ts file exists) | ~1 session |
| **6** | Retest reminders table + cron stub + dashboard card or route | Phase 5 | ~1 session |

**Total: ~7.5 focused sessions.** Each phase is independently shippable; intermediate states are not broken.

---

## Decisions awaiting project owner (numbered)

| # | Decision | My recommendation | Confirm? |
|---|---|---|---|
| **D1** | Mega-menu top-level items: 5 (Marketing/Copy) or 6 (UX) | 5 — Marketing's anti-paywall argument outweighs UX's "rightmost emphasis" | ☐ |
| **D2** | Sidebar groups expanded or collapsed by default | Expanded — Slovak SaaS expectation | ☐ |
| **D3** | Retention surfaces: sidebar links or dashboard cards | Hybrid — Notifications stays in sidebar; Digest/Recommendations/Retest = dashboard cards only | ☐ |
| **D4** | Profile preferences storage: new table or `profiles.preferences` jsonb | (B) jsonb column on profiles — matches existing pattern, no FK overhead | ☐ |
| **D5** | Digest cadence: weekly or monthly | Weekly, but only fires if signal exists (data-driven, not editorial) | ☐ |
| **D6** | Brand sidebar label rebrand: `SubenAI · Workspace` → `SubenAI · Pre lektorov` | Ship it — persona-flag, high leverage, zero cost | ☐ |
| **D7** | Header CTA stays `Spustiť rýchly test`, never `Podporiť projekt` | Locked by Marketing §F; document only | ☐ |
| **D8** | Peer-card: include in initial 6-PR plan or defer | Defer — requires UX research + PNG share infra | ☐ |
| **D9** | Remove `/admin` from public footer + sitemap | Yes — visitor confusion, no cost | ☐ |

---

## Copy Appendix A — Mega-menu items (paste-ready, sk/en/cs)

See Copywriter §B in the source report. JSON structure follows existing `marketing.json` conventions:

```json
"header.menu": {
  "rychly_test": { "label": {…}, "desc": {…} },
  "testy":       { "label": {…}, "desc": {…} },
  "skolenia":    { "label": {…}, "desc": {…} },
  "pre_skoly":   { "label": {…}, "desc": {…} },
  "podpora":     { "label": {…}, "desc": {…} }
}
```

(Full string content in source report; not duplicated here to keep PLAN focused.)

---

## Copy Appendix B — Sidebar + dashboard + retention (paste-ready, sk/en/cs)

See Copywriter §C and §D. Includes:
- 5 sidebar group labels (`tvorba`, `vysledky`, `tim`, `ucet`, `pomoc`)
- 16 sidebar items with labels + tooltips
- Dashboard empty state (3 variants)
- First-login welcome banner
- All 5 retention-loop subject lines + card bodies + CTAs

(Full strings in source report.)

---

## Next step

Project owner reviews this PLAN and answers D1–D9 above. Once approved, **Phase 0 gets dispatched as a single small commit** (bug fixes), then Phase 1 (mega-menu) as a focused agent session. Each subsequent phase one at a time, each with its own approval gate if any decision shifts.
