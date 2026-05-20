# E36 — `/app` senior audit & polish

**Owner:** Claude (synthesis) — multi-agent audit + implementation
**Date opened:** 2026-05-20
**Status:** 🟡 **IN PROGRESS** — Phase A starts 2026-05-20
**Branch:** `claude/compassionate-allen-543547` (worktree)
**Predecessor:** E34 (respondent flow audit) closed `/test/builder/*`; E36 closes `/app/*` author surface

---

## TL;DR

E34 audited the **consume** surface (every share-link respondent + the
results dashboard). E36 audits the **author console** — everything an
authenticated user touches once they hit `/app`. The bar is the same:
senior UX, responsive on mobile + tablet, end-to-end integration
coverage, no half-finished surfaces.

Discovery surfaced one **P0 blocker** that ships first: the AppShell
sidebar is `hidden ... lg:block` with **no mobile drawer fallback**. On
phones and tablets in portrait, users see the page header + main
content but **cannot navigate between `/app` subpages without typing
the URL**. Every other concern (header user-pill, deeper test
coverage, SEO meta) is downstream of fixing this.

Three workstreams, executed **A → B → C** (UX first, tests confirm,
auth polish last):

- **Phase A** — Responsive, mobile/tablet UX, header user identity
- **Phase B** — Integration test coverage (mobile viewports, full CRUD, error states, RBAC)
- **Phase C** — Auth UX polish + SEO + logout flow

---

## Scope — which surfaces

Every authenticated route under `/app/**`:

| Route | File | Surface |
|---|---|---|
| `/app` (layout) | `src/routes/app.tsx` | Auth gate + onboarding gate |
| `/app` (dashboard) | `src/routes/app.index.tsx` | Stats, last test, draft tests |
| `/app/onboarding` | `src/routes/app.onboarding.tsx` + `.lazy.tsx` | One-shot preferences flow |
| `/app/tests` | `src/routes/app.tests.index.tsx` | Tests list + filters |
| `/app/tests/new` | `src/routes/app.tests.new.tsx` | 4-step create wizard |
| `/app/tests/$testId` | `src/routes/app.tests.$testId.tsx` | Test editor (tabs) |
| `/app/templates` | `src/routes/app.templates.tsx` | Template library |
| `/app/library` | `src/routes/app.library.tsx` | Question library |
| `/app/audiences` | `src/routes/app.audiences.tsx` | Respondent groups CRUD |
| `/app/history` | `src/routes/app.history.tsx` | Activity timeline |
| `/app/notifications` | `src/routes/app.notifications.tsx` | Notification list |
| `/app/digest` | `src/routes/app.digest.tsx` + `.lazy.tsx` | Weekly/monthly digest |
| `/app/peer` | `src/routes/app.peer.tsx` + `.lazy.tsx` | Peer comparison |
| `/app/recommendations` | `src/routes/app.recommendations.tsx` + `.lazy.tsx` | AI recs |
| `/app/retest` | `src/routes/app.retest.tsx` + `.lazy.tsx` | Retest reminders |
| `/app/teams` | `src/routes/app.teams.tsx` | Team management |
| `/app/account/profile` | `src/routes/app.account.profile.tsx` | Profile edit |
| `/app/account/security` | `src/routes/app.account.security.tsx` | Password + 2FA |
| `/app/legal/dsr` | `src/routes/app.legal.dsr.tsx` | GDPR DSR history |
| `/app/sets/$setId` | `src/routes/app.sets.$setId.tsx` | Result-set detail |
| `/app/help` | `src/routes/app.help.tsx` | Help + FAQ |

Plus the public-site header (`src/components/layout/SiteHeader.tsx`)
because it's the entry-point to `/app` and Phase A2 + C1 land there.

---

## Discovery — gaps found during E36 pre-flight (2026-05-20)

| # | Gap | File | Severity |
|---|---|---|---|
| 1 | App sidebar `hidden ... lg:block` — **no mobile drawer**, no nav <lg | [AppShell.tsx:195](src/components/user/AppShell.tsx) | **P0** |
| 2 | Public header shows **no user identity** when authenticated, only "Go to App" link | [SiteHeader.tsx:181-189](src/components/layout/SiteHeader.tsx) | **P0** |
| 3 | E2E never runs on mobile viewport — all specs at Desktop Chrome | `playwright.config.ts` | **P0** |
| 4 | Non-lazy route variants (`app.digest.tsx`, `app.peer.tsx`, …) have **0 test-ids**; lazy variants fully covered | `src/routes/app.*.tsx` | P1 |
| 5 | `shell.spec.ts` has 3 tests, `teams.spec.ts` has 1 — both too thin | `e2e/specs/app/shell.spec.ts`, `teams.spec.ts` | P1 |
| 6 | No RBAC matrix (educator/admin/anonymous against each route) | celostatne | P1 |
| 7 | No error-state coverage (network fail, RLS denial, 404 detail route) | celostatne | P1 |
| 8 | No Vitest component tests for `/app` hooks (`useTests`, `useAudiences`, …) | `tests/**` | P2 |
| 9 | Admin link appears post-RPC without skeleton/placeholder — flash on each navigation | [AppShell.tsx:233](src/components/user/AppShell.tsx) | P2 |
| 10 | Logout is a single click with no confirm, no toast, no cache clear | [AppShell.tsx:181-189](src/components/user/AppShell.tsx), `src/lib/auth/signout.ts` | P2 |

---

## Phases

### Phase A — UX / UI / responsive (P0 visible to users)

| ID | Story | Effort | Files |
|---|---|---|---|
| A1 | Mobile drawer for app sidebar — Sheet-based, hamburger in app header, focus-trap, scroll-lock, swipe-to-close, `data-testid="app-shell-mobile-trigger"` + `app-shell-mobile-drawer` | S | `AppShell.tsx`, new `AppMobileNav.tsx` |
| A2 | Public header user pill — avatar+initials, dropdown (Meno, Do aplikacie, Profil, Odhlasit). Mobile sheet section. Keyboard nav, aria-expanded, escape-to-close | S | `SiteHeader.tsx`, new `HeaderUserMenu.tsx` |
| ~~A3~~ | ~~Per-page mobile/tablet audit~~ ✅ — Screenshot-based audit via new `e2e/audit/app-screenshots.audit.ts` (uses existing setupEducator fixture, no real auth needed). 54 PNGs generated (18 routes × 3 viewports). 3 P0 mobile bugs fixed: (a) `app.tests.index.tsx` filter chips horizontal scroll wrap, (b) `app.teams.tsx` invite form stacks vertically <sm, (c) `components/app/page-header.tsx` title flex-wrap. Onboarding route gate redirects onboarded sessions so its UI couldn't be captured — flagged for `onboarded:false` audit variant in B-phase. Library "squashed" was a false-positive (375×7111 tall, not narrow). | M | `tests.index.tsx`, `teams.tsx`, `page-header.tsx`, new `e2e/audit/app-screenshots.audit.ts` |
| ~~A4~~ | ~~Add `data-testid` to non-lazy route variants~~ ✅ **NOT-APPLICABLE** — audit reveals these are pure route registration files (auth guard + meta only, no rendered JSX). Pairing with `.lazy.tsx` for code-splitting is the intentional pattern. Gap #4 from discovery is a false-positive flag. | — | — |

**Phase A acceptance**
- AppShell sidebar accessible on mobile via drawer; reaches every nav item
- Public header shows authenticated user identity + 1-click profile access
- Every `/app` route renders without horizontal scroll at 375px width
- All interactive elements ≥44×44px tap target at mobile
- Lint 0/0, all existing tests still green, build ✓

### Phase B — Integration test coverage (P0→P1)

| ID | Story | Effort | Files |
|---|---|---|---|
| B1 | Mobile viewport Playwright project — Pixel 7 (375×667) + iPad Pro 11 (834×1194). Selective spec subset | XS | `playwright.config.ts` |
| B2 | Expand each `/app` spec to 5–8 tests covering: load → CRUD → filter → empty → error → mobile-viewport | L | 18 specs + corresponding POM extensions |
| B3 | Shell spec (drawer toggle, focus-trap, scroll-lock, active state). Teams spec (create/invite/role/delete). | M | `shell.spec.ts`, `teams.spec.ts` |
| B4 | RBAC matrix tests — anonymous/educator/admin × every `/app/*` route | S | new `e2e/specs/app/rbac-matrix.spec.ts` |
| B5 | Error-state tests — network fail, RLS denial, 404 detail | M | new `e2e/specs/app/error-states.spec.ts` + per-page additions |

**Phase B acceptance**
- Every `/app` page has full-CRUD or full-readonly coverage (no half-tested entity)
- All specs pass on `e2e-chromium`, `e2e-mobile-chromium`, `e2e-tablet-chromium`
- RBAC matrix covers 100% of `/app/*` routes against 3 personas
- Error-state spec covers every list page + every detail route

### Phase C — Auth UX deepening + SEO (P1)

| ID | Story | Effort | Files |
|---|---|---|---|
| C1 | Final polish on header avatar dropdown — animation, persistent across nav, mobile parity | XS | `HeaderUserMenu.tsx` |
| C2 | Standardize SEO meta on `/app/*` — `noindex, nofollow`, canonical to public counterpart where exists | S | `app.tsx`, each route's `head()` |
| C3 | Logout flow — confirm dialog (only if dirty state?), clear React Query cache, redirect to `/`, toast "Odhlasenie uspesne" | S | `src/lib/auth/signout.ts`, `AppShell.tsx`, `SiteHeader.tsx` |
| C4 | This plan file + register in any index | XS | this file |

**Phase C acceptance**
- Public header dropdown is keyboard-fully-navigable, screen-reader announces state
- Every `/app/*` route emits `noindex, nofollow` in head
- Logout never leaves stale data in cache; toast confirms; user lands on `/`

---

## Locked decisions (owner sign-off 2026-05-20)

| ID | Decision | Locked | Note |
|---|---|---|---|
| D1 | Phase ordering | **A → B → C** | UX visible to user first; tests confirm post-fix state; auth polish last |
| D2 | Audit depth | **All 20 pages deep** | Not top-N; every authenticated surface gets the same rigor |
| D3 | Story format | **Single E36 PLAN file** | Modern convention (E33, E34 pattern), not split into `stories/E36.x.md` |
| D4 | Mobile drawer impl | **Sheet from `shadcn/ui`** (TBD A1) | Existing in repo, used in `SiteHeader` mobile nav — reuse for consistency |
| D5 | Public header user pill | **Avatar+initials with DropdownMenu** (TBD A2) | Existing `DropdownMenu` primitive in `src/components/ui/dropdown-menu.tsx` |
| D6 | Mobile viewport device | **Pixel 7 + iPad Pro 11** (TBD B1) | Real-world devices, not Galaxy/iPhone fake-defaults |
| D7 | RBAC matrix structure | **3 personas × N routes** (TBD B4) | Table-driven test using `test.each` |
| D8 | Logout confirm dialog | **TBD** — auto-skip when no dirty form | A2 / C3 both touch this; final pattern locked at C3 |

---

## Delegation plan

| Story | Mode | Agents | Why |
|---|---|---|---|
| A1, A2 | Inline | — | Single-file edits, known path |
| A3 | Parallel 4× `general-purpose` | 5 pages each (delivered as 4 separate diffs) | True parallelism, isolated files |
| A4 | Inline | — | One-shot grep + edit |
| B1 | Inline | — | Single config edit |
| B2 | Parallel 4× `general-purpose` | ~5 specs each | Per-page spec expansion is isolated |
| B3 | Inline (shell) + 1× `general-purpose` (teams) | — | Teams needs broader fixture setup |
| B4 | Inline | — | New spec, single file |
| B5 | 1× `general-purpose` | — | Cross-page error injection pattern needs research |
| C1–C4 | Inline | — | Final polish, no parallelism needed |

**Skills invoked**
- `design:accessibility-review` after A3 (axe-core sweep per page)
- `engineering:testing-strategy` before B2 (lock the test pattern across pages)
- `feature-dev:code-reviewer` after each phase — fresh-context CR before merge

---

## Non-goals (out of scope for E36)

- **New features.** E36 is audit + polish. Any new functionality
  discovered as missing gets logged as a follow-up (E37+), not bolted on.
- **Vitest component tests for `/app` hooks.** Captured as gap #8 but
  deferred — E2E gives us the user-facing guarantee; unit tests are a
  separate "testing-coverage" epic candidate.
- **Backend / RLS changes.** RBAC tests verify existing policies; they
  do not extend them.
- **i18n expansion.** Slovak strings stay verbatim per CLAUDE.md.
- **`/admin` audit.** Different surface, different gate (`has_role` RPC),
  out of scope.

---

## DoD checklist

- [ ] Every story in Phase A marked `~~A.N Title~~ ✅`
- [ ] Every story in Phase B marked `~~B.N Title~~ ✅`
- [ ] Every story in Phase C marked `~~C.N Title~~ ✅`
- [ ] Lint 0/0, all tests green, build ✓ at end of each phase
- [ ] Fresh-context CR done per phase (subagent, "review only")
- [ ] `CHANGELOG.md` entry under "Nezverejnené" → moved to next release on merge
- [ ] Privacy / cookies docs reviewed (Phase C2 may touch `noindex` on `/app/*` which is privacy-relevant)
- [ ] No `CONSENT_VERSION` bump (this epic doesn't change consent surface)
- [ ] Status above flipped to `✅ DELIVERED <date>`
