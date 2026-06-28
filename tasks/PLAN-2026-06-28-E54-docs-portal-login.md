# PLAN — E54: Docs portal + login surfacing

**Status:** 🟡 Design approved 2026-06-28, awaiting implementation-plan kickoff
**Branch:** `feature/E54-docs-portal-login`
**Brainstorm:** approved by owner 2026-06-28 (this doc is the design spec)

---

## Problem / reality

Two gaps, both discovered by inspecting the live code (not assumptions):

1. **Login is built but undiscoverable.** Full auth exists —
   `src/routes/login.tsx`, `signup.tsx`, 2FA enroll/verify, forgot-password,
   `auth.callback.tsx`, Supabase. But `SiteHeader` renders **no sign-in
   entry point** for signed-out visitors; the only way to `/login` is typing
   the URL.

2. **Docs are scaffolded but empty + auth-only.** `src/lib/docs/manifest.ts`
   keys every `/docs/app/*` and `/docs/admin/*` slug, but **every slug
   renders the shared `DocsStubPage` ("coming soon")**. Real explanatory
   content exists only as **inline explainer i18n**
   (`src/i18n/locales/sk/app-explainers.json`, `admin.json` →
   `explainers.*`), surfaced as in-app popovers for **signed-in** users.
   There is **no public docs route at all** — `/docs/app` is gated by
   `requireSupabaseAuth` and marked `noindex`.

## Goal

- Surface a sensible **login entry point** in the site navigation.
- Give **both unauthenticated and authenticated** users a real,
  browsable documentation portal ("where / what / how things work").
- Cover it with tests per CLAUDE.md (unit + a11y + e2e/POM).

## Scope of THIS spec (phase 1)

Owner decision (brainstorm): build the **infrastructure + login + auth-docs
rendering + first public batch now**, fill remaining public content
incrementally.

In scope:
1. Login + "Dokumentácia" entries in `SiteHeader` (desktop + mobile).
2. Docs **engine** — replace the stub renderer with real renderers.
3. Public docs route `/docs` (index) + `/docs/$slug` — **indexable**.
4. Auth docs `/docs/app/$slug` render the **existing explainer i18n**
   (content already exists; no writing needed).
5. **First batch** of public MDX docs.
6. Tests + SEO wiring.

Out of scope (deferred, incremental):
- Complete public-doc content for every public section.
- Admin docs (`/docs/admin/*`) — stay stubs; sensitive, not requested.

## Approach (chosen: hybrid content model)

Auth docs render from the **existing explainer i18n** (no rewrite — and the
same JSON keeps powering inline explainers). Public docs are authored as
**MDX** (`src/content/docs/*.mdx`), reusing the blog MDX pipeline
(`BlogPostBody`) — the right tool for long-form, SEO-indexable content.

Rejected: all-MDX (needless migration of explainer content that also feeds
inline popovers) and all-i18n-JSON (verbose + poor authoring/SEO for
long-form public copy).

## Architecture

### Routing / IA — one `/docs` tree, audience-gated per subtree

| Route | Audience | Index? | Renderer |
|---|---|---|---|
| `/docs` | public | yes | `DocsIndex` (hub: public sections + "app docs" link when signed in) |
| `/docs/$slug` | public | yes | `DocsArticlePage` (MDX) |
| `/docs/app` + `/docs/app/$slug` | authenticated (existing `requireSupabaseAuth`) | no | `DocsExplainerPage` (from explainer i18n) — **replaces stub** |
| `/docs/admin/*` | admin (existing gate) | no | `DocsStubPage` (unchanged) |

TanStack static-segment priority means `/docs/app` and `/docs/admin` win
over the dynamic `/docs/$slug`; reserve `app`/`admin` as forbidden public
slugs (assert in the public-docs index builder).

### Components (`src/components/docs/`)

- `DocsLayout` — shared shell: section sidebar nav + breadcrumb + content
  slot. One purpose: chrome around any doc body.
- `DocsIndex` — public hub listing public sections; shows an "app
  documentation" entry only when the viewer is signed in.
- `DocsArticlePage` — renders a public MDX doc (reuses `BlogPostBody` for
  the MDX body; own header/meta).
- `DocsExplainerPage` — renders an auth doc from an explainer entry
  (`title`, `lead`, `sections[]`). Replaces `DocsStubPage` for `/docs/app`.
- `DocsStubPage` — kept for `/docs/admin/*` only.

### Content model / data flow

- **Public:** `src/content/docs/*.mdx` with frontmatter
  `{ title, description, order, category }`. A build-time index (mirroring
  the blog frontmatter index) feeds `DocsIndex` and validates slugs. Route
  loader resolves MDX by slug → 404 on miss.
- **Auth:** route loader looks up `explainers.<slug>` in the app-explainers
  i18n (already in the bundle) → `DocsExplainerPage`. `manifest.ts` `APP_DOCS`
  stays the slug allow-list; `DocEntry` gains a discriminant so the route
  knows "render explainer" vs (future) "render mdx".

### Login surfacing (`SiteHeader`)

- Signed-out → `header-nav-login` link/button → `/login` (desktop + mobile).
- Signed-in → existing `HeaderUserMenu` (unchanged).
- Add a public `header-nav-docs` link → `/docs` for discoverability.
- Auth state is already available in the header (it renders `HeaderUserMenu`
  conditionally today) — reuse that signal; no new global state.

### SEO

- Public `/docs` + `/docs/$slug`: **indexable**, sitemap entries, JSON-LD
  (reuse blog SEO helpers). Auth/admin remain `noindex,nofollow`.

## Testing (CLAUDE.md DoD)

- **Vitest:** public-docs frontmatter index + reserved-slug guard;
  explainer→`DocsExplainerPage` mapping; `manifest` slug validation;
  `SiteHeader` renders login link when signed-out / user menu when signed-in;
  `DocsIndex` hides app-docs link when signed-out.
- **a11y:** `expectNoA11yViolations` (the E53-batch jest-axe helper) on
  `DocsArticlePage`, `DocsExplainerPage`, `DocsIndex`, and `SiteHeader`.
- **e2e (Playwright, POM in `e2e/poms/docs/`):** signed-out visitor reads
  `/docs` + a public `/docs/$slug`; signed-out hitting `/docs/app/<slug>`
  redirects to `/login`; signed-in (audit-bot) reads the same and sees real
  explainer content (not the stub); header login link navigates to `/login`;
  header docs link navigates to `/docs`. POM-only locators.
- **Coverage** stays above the ratcheted thresholds.

## Data-testids (new)

`header-nav-login`, `header-mobile-login`, `header-nav-docs`,
`header-mobile-docs`, `docs-index-root`, `docs-index-section-link`,
`docs-index-app-link`, `docs-article-root`, `docs-article-title`,
`docs-explainer-root`, `docs-explainer-title`, `docs-explainer-section`.

## Risks

- **R1 — slug collision** between a public MDX slug and `app`/`admin`.
  Mitigation: reserved-slug assertion in the index builder + a unit test.
- **R2 — explainer i18n shape drift.** `DocsExplainerPage` must tolerate
  explainer entries with/without optional `sections`. Render defensively;
  unit-test both shapes.
- **R3 — first public batch picked without owner input.** First batch =
  what-is-subenai, take-the-test, understand-results, courses, account/sign-up,
  FAQ; confirm titles at implementation time. Remaining sections deferred.

## Story breakdown (implementation plan seed)

- **E54.1** — Login + docs nav entries in `SiteHeader` (+ tests). Independent,
  ships first.
- **E54.2** — Docs engine: `DocsLayout`, route restructure, manifest
  `DocEntry` discriminant, public index builder + reserved-slug guard.
- **E54.3** — `DocsExplainerPage` rendering auth docs from explainer i18n
  (replaces stub for `/docs/app/$slug`).
- **E54.4** — Public docs: `/docs` index + `/docs/$slug` MDX route +
  `DocsArticlePage` + first MDX batch + SEO/sitemap/JSON-LD.
- **E54.5** — Test + a11y + e2e/POM suite; coverage check.

Sequencing: E54.1 → E54.2 → (E54.3 ∥ E54.4) → E54.5.
