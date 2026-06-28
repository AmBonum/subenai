# E54 — Docs Portal + Login Surfacing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface a login entry point in the site nav and give both
anonymous and signed-in users a real, browsable documentation portal,
fully tested.

**Architecture:** One `/docs` tree, audience-gated. Public `/docs` +
`/docs/$slug` render committed markdown files (react-markdown via the
existing `BlogPostBody` renderer — NOT the DB-backed blog data layer).
Authenticated `/docs/app/$slug` renders the existing explainer i18n
(`app-explainers.json`). `SiteHeader` gains login + docs entries.

**Tech Stack:** TanStack Start file routes, React 19, Tailwind v4,
react-markdown + remark-gfm, Vitest + RTL + jest-axe, Playwright (POM).

**Design spec:** `tasks/PLAN-2026-06-28-E54-docs-portal-login.md`.

**Correction vs spec:** the blog is DB-backed; we reuse only its markdown
*renderer* (`BlogPostBody`), with file-based doc content.

---

## File map

| File | Responsibility |
|---|---|
| `src/components/layout/SiteHeader.tsx` (modify) | add login + docs nav entries (desktop + mobile) |
| `src/content/docs/*.md` (create) | public doc bodies + frontmatter |
| `src/content/docs/index.ts` (create) | typed index of public docs (slug→meta+body), glob-loaded |
| `src/components/docs/DocsLayout.tsx` (create) | shared shell (sidebar nav + breadcrumb + slot) |
| `src/components/docs/DocsIndex.tsx` (create) | public hub listing |
| `src/components/docs/DocsArticlePage.tsx` (create) | render a public markdown doc |
| `src/components/docs/DocsExplainerPage.tsx` (create) | render an auth doc from explainer i18n |
| `src/lib/docs/manifest.ts` (modify) | add `DocEntry` discriminant + public-slug reserve guard |
| `src/lib/docs/public-index.ts` (create) | public-doc index accessor + reserved-slug assertion |
| `src/routes/docs.index.tsx` (create) | `/docs` public hub route |
| `src/routes/docs.$slug.tsx` (create) | `/docs/$slug` public article route |
| `src/routes/docs.app.$slug.tsx` (modify) | render `DocsExplainerPage` instead of stub |
| `scripts/generate-sitemap.mjs` (modify) | add public /docs URLs |

---

## Task 1 (E54.1): Login + docs entries in SiteHeader

**Files:**
- Modify: `src/components/layout/SiteHeader.tsx`
- Test: `tests/components/layout/site-header-auth.test.tsx` (exists — extend)

Context: header already does `const { isAuthenticated } = useAuth()` and
`{isAuthenticated && <HeaderUserMenu />}` (~line 200). Add the inverse for
login, plus a public docs link. `ROUTES` is imported from `@/config/routes`.

- [ ] **Step 1: Add `docs` + `login` route constants if missing**

Check `src/config/routes.ts` for `docs` and `login`. If absent, add:
```ts
docs: "/docs",
login: "/login",
```
Run: `grep -nE '"/docs"|"/login"|login:|docs:' src/config/routes.ts`

- [ ] **Step 2: Write failing test — login link when signed out**

In `tests/components/layout/site-header-auth.test.tsx`, mock `useAuth` to
`{ isAuthenticated: false, isAdmin: false }` and assert:
```tsx
expect(screen.getByTestId("header-nav-login")).toHaveAttribute("href", "/login");
expect(screen.getByTestId("header-nav-docs")).toHaveAttribute("href", "/docs");
expect(screen.queryByTestId("header-user-menu")).toBeNull();
```
And a signed-in case (`isAuthenticated: true`): `header-nav-login` is absent,
`header-user-menu` present.

- [ ] **Step 3: Run test — expect FAIL**

Run: `npx vitest run tests/components/layout/site-header-auth.test.tsx`
Expected: FAIL (testids not found).

- [ ] **Step 4: Implement — desktop actions block**

In the desktop right-side actions (near `{isAuthenticated && <HeaderUserMenu />}`):
```tsx
<Link
  to={ROUTES.docs}
  data-testid="header-nav-docs"
  className="hidden text-sm font-medium text-muted-foreground hover:text-foreground lg:inline-flex"
>
  {tFor("nav")("docs")}
</Link>
{!isAuthenticated && (
  <Link
    to={ROUTES.login}
    data-testid="header-nav-login"
    className="hidden text-sm font-medium text-foreground hover:opacity-80 lg:inline-flex"
  >
    {tFor("nav")("login")}
  </Link>
)}
{isAuthenticated && <HeaderUserMenu />}
```
Add the same two links to the mobile sheet section with testids
`header-mobile-docs` / `header-mobile-login` (login wrapped in
`<SheetClose asChild>`).

- [ ] **Step 5: Add i18n keys**

In `src/i18n/locales/sk/marketing.json` under the `nav` namespace used by
`tFor("nav")`: `"docs": "Dokumentácia"`, `"login": "Prihlásiť sa"`.
(Confirm the exact nav namespace key path with
`grep -n '"nav"' src/i18n/locales/sk/marketing.json`.)

- [ ] **Step 6: Run tests — expect PASS**

Run: `npx vitest run tests/components/layout/site-header-auth.test.tsx`

- [ ] **Step 7: a11y assertion**

Add to the same test file:
```tsx
import { expectNoA11yViolations } from "../../utils/axe";
it("header has no a11y violations (signed out)", async () => {
  const { container } = renderHeader({ isAuthenticated: false });
  await expectNoA11yViolations(container);
});
```

- [ ] **Step 8: lint + commit**

Run: `npm run lint && npx vitest run tests/components/layout/site-header-auth.test.tsx`
```bash
git add src/components/layout/SiteHeader.tsx src/config/routes.ts src/i18n/locales/sk/marketing.json tests/components/layout/site-header-auth.test.tsx
git commit -m "feat(E54.1): login + docs entries in site header"
```

---

## Task 2 (E54.2): Docs engine — manifest discriminant + public index + DocsLayout

**Files:**
- Modify: `src/lib/docs/manifest.ts`
- Create: `src/lib/docs/public-index.ts`
- Create: `src/components/docs/DocsLayout.tsx`
- Test: `tests/lib/docs-public-index.test.ts`, `tests/components/docs/DocsLayout.test.tsx`

- [ ] **Step 1: Discriminate `DocEntry`** — change `manifest.ts` `DocStub`
to `{ kind: "stub" }` and add `export type DocEntry = { kind: "stub" } |
{ kind: "explainer"; explainerKey: string }`. Map each `APP_DOCS` slug to
`{ kind: "explainer", explainerKey: "<underscored key>" }` where an
`app-explainers.json` `explainers.<key>` exists; leave the rest
`{ kind: "stub" }`. (Explainer keys: dashboard, tests, edu_tests,
templates, library, audiences, history, insights, notifications, teams,
profile, help.) Keep `lookupDoc` signature.

- [ ] **Step 2: Public index + reserved-slug guard** — `public-index.ts`
loads `src/content/docs/*.md` via `import.meta.glob('../../content/docs/*.md',
{ eager: true, query: '?raw', import: 'default' })`, parses frontmatter,
and exports `getPublicDoc(slug)`, `listPublicDocs()`. Throw at module load
if any slug is in `RESERVED = new Set(["app","admin"])`.

- [ ] **Step 3: Tests** — `docs-public-index.test.ts`: a known fixture slug
resolves; an unknown slug returns null; a reserved slug throws.
`DocsLayout.test.tsx`: renders children + breadcrumb + sidebar items;
`expectNoA11yViolations`.

- [ ] **Step 4: DocsLayout** — shared shell: `<nav data-testid="docs-sidebar">`
of section links + `<div data-testid="docs-content">{children}</div>` +
breadcrumb. Tailwind, mobile-collapsible.

- [ ] **Step 5: run + commit**

Run: `npm run lint && npx vitest run tests/lib/docs-public-index.test.ts tests/components/docs/DocsLayout.test.tsx`
```bash
git add src/lib/docs/ src/components/docs/DocsLayout.tsx tests/lib/docs-public-index.test.ts tests/components/docs/DocsLayout.test.tsx src/content/docs/
git commit -m "feat(E54.2): docs engine — manifest discriminant, public index, layout"
```

> **SPIKE (do first, ≤15 min):** confirm `import.meta.glob('?raw')` works in
> the TanStack Start + Cloudflare SSR build (`npm run build`). If it does
> not, fall back to the courses pattern: author docs as
> `src/content/docs/<slug>.ts` exporting `{ meta, body }` and a hand-written
> `index.ts` barrel. The rest of the plan is unchanged — only the loader in
> `public-index.ts` differs.

---

## Task 3 (E54.3): DocsExplainerPage — render auth docs from i18n

**Files:**
- Create: `src/components/docs/DocsExplainerPage.tsx`
- Modify: `src/routes/docs.app.$slug.tsx`
- Test: `tests/components/docs/DocsExplainerPage.test.tsx`

- [ ] **Step 1: Failing test** — given a fake explainer entry
`{ title, lead, sections: { a: { heading, items: ["x"] } } }`, the component
renders `docs-explainer-title` = title, the lead, and one section heading +
list item. A second test: an entry with NO `sections` renders title + lead
and does not crash (R2 defensive).

- [ ] **Step 2: Implement** — `DocsExplainerPage({ explainerKey })` reads
`tFor("explainers")` / the app-explainers bundle by key, renders
`<h1 data-testid="docs-explainer-title">`, lead `<p>`, and
`Object.entries(sections ?? {})` → `<section data-testid="docs-explainer-section">`
with heading + `<ul>` of items. Wrap in `DocsLayout`.

- [ ] **Step 3: Wire route** — in `docs.app.$slug.tsx`, replace
`<DocsStubPage area="app" slug={slug} />` with: look up the manifest entry;
if `entry.kind === "explainer"` render `<DocsExplainerPage explainerKey={entry.explainerKey} />`,
else keep `<DocsStubPage area="app" slug={slug} />` (sub-slugs without
content stay stubs for now).

- [ ] **Step 4: run + commit**

Run: `npm run lint && npx vitest run tests/components/docs/DocsExplainerPage.test.tsx`
```bash
git add src/components/docs/DocsExplainerPage.tsx src/routes/docs.app.\$slug.tsx tests/components/docs/DocsExplainerPage.test.tsx
git commit -m "feat(E54.3): render authenticated docs from explainer i18n"
```

---

## Task 4 (E54.4): Public docs routes + first content batch + SEO

**Files:**
- Create: `src/routes/docs.index.tsx`, `src/routes/docs.$slug.tsx`
- Create: `src/components/docs/DocsIndex.tsx`, `src/components/docs/DocsArticlePage.tsx`
- Create: `src/content/docs/{co-je-subenai,ako-spravit-test,vysledky,kurzy,ucet,faq}.md`
- Modify: `scripts/generate-sitemap.mjs`
- Test: `tests/routes/docs-public.test.tsx`, `tests/components/docs/DocsIndex.test.tsx`

- [ ] **Step 1: First batch markdown** — six files with frontmatter
`---\ntitle: …\ndescription: …\norder: N\ncategory: …\n---` + a few
paragraphs of real Slovak copy each (titles per spec R3). No `noindex`.

- [ ] **Step 2: DocsArticlePage** — renders a public doc: `<h1
data-testid="docs-article-title">`, then the markdown body via the
`BlogPostBody` renderer (`react-markdown` + `remark-gfm`). Wrap in DocsLayout.

- [ ] **Step 3: DocsIndex** — `<div data-testid="docs-index-root">` listing
`listPublicDocs()` as `docs-index-section-link`s; show
`docs-index-app-link` → `/docs/app/dashboard` ONLY when `useAuth().isAuthenticated`.

- [ ] **Step 4: Routes** — `docs.index.tsx` (path `/docs`, indexable head,
renders `DocsIndex`); `docs.$slug.tsx` (loader `getPublicDoc(slug)` →
`notFound()` on miss; indexable head with title/description; renders
`DocsArticlePage`). NO `requireSupabaseAuth`.

- [ ] **Step 5: Tests** — `docs-public.test.tsx`: index lists the six docs;
unknown slug → notFound; `DocsIndex.test.tsx`: app-link hidden when signed
out, shown when signed in; `expectNoA11yViolations` on both pages.

- [ ] **Step 6: Sitemap** — in `generate-sitemap.mjs`, append `/docs` and
each public doc slug. Run `npm run sitemap` and confirm they appear.

- [ ] **Step 7: run + commit**

Run: `npm run lint && npx vitest run tests/routes/docs-public.test.tsx tests/components/docs/DocsIndex.test.tsx`
```bash
git add src/routes/docs.index.tsx src/routes/docs.\$slug.tsx src/components/docs/DocsIndex.tsx src/components/docs/DocsArticlePage.tsx src/content/docs/ scripts/generate-sitemap.mjs tests/
git commit -m "feat(E54.4): public docs portal — index, articles, first batch, sitemap"
```

---

## Task 5 (E54.5): e2e/POM suite + full verification

**Files:**
- Create: `e2e/poms/docs/DocsPortal.ts`, `e2e/specs/docs/docs-portal.spec.ts`

- [ ] **Step 1: POM** — `DocsPortal` with getters: `indexRoot`,
`sectionLinks`, `appLink`, `articleTitle`, and header `loginLink`,
`docsLink`; methods `gotoIndex()`, `gotoArticle(slug)`, `gotoAppDoc(slug)`.

- [ ] **Step 2: Spec (POM-only locators)** —
  1. signed-out: `gotoIndex()` → `indexRoot` visible, `appLink` hidden;
  2. signed-out: `gotoArticle("faq")` → `articleTitle` visible;
  3. signed-out: `gotoAppDoc("dashboard")` → redirected to `/login`;
  4. signed-in (audit-bot per CLAUDE.md): `gotoAppDoc("dashboard")` →
     explainer title visible (not the stub `docs-stub-root`);
  5. header `loginLink` → `/login`; `docsLink` → `/docs`.

- [ ] **Step 3: Full verification loop**

Run, in order, and paste results:
```bash
npm run lint
npm run typecheck:all
npm run test:coverage   # must stay above ratcheted thresholds
npm run build
npm run check:bundle-budget
```

- [ ] **Step 4: commit**

```bash
git add e2e/poms/docs/ e2e/specs/docs/
git commit -m "test(E54.5): e2e POM suite for docs portal + login"
```

---

## Sequencing

E54.1 → E54.2 (run the SPIKE first) → (E54.3 ∥ E54.4) → E54.5.
Each task ends green (lint + its tests). Final task runs the whole loop.

## Mark done

On completion update `tasks/PLAN-2026-06-28-E54-docs-portal-login.md`
status → "🚧 Phase 1 implemented" and check off the story breakdown.
