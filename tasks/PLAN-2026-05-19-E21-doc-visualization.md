# E21 — Documentation visualization + senior rework

> **Status**: in-progress 2026-05-19. Closes the doc-side deliverables
> the user originally asked for back in the /schools rework that were
> deferred as "Out of scope E20+" (E19 plan § Out of scope).
> Testing coverage is NOT in scope — owned by a separate agent.

## Goal

Bring the 5 user-facing documentation surfaces (`/privacy`, `/cookies`,
`/about`, `/changelog`, `/app/help`) to senior-level quality matching
the E19 `/schools` rework: full SEO meta + JSON-LD, inline SVG
illustrations where they replace prose walls, accessible section
landmarks, consistent cross-linking, and a shared TOC pattern for the
long legal-prose pages.

Plus close the housekeeping action items from earlier sessions
(teacher pillar deployment + `related_course_slug` backfill) via a
SQL runbook the user executes against prod Supabase.

## Story tracker

| # | Story | Status |
|---|---|---|
| E21.1 | SQL backfill runbook — teacher pillar + 10 pillar cross-links | ☐ |
| E21.2 | `DocTocSidebar` shared component (sticky desktop, mobile dropdown) | ☐ |
| E21.3 | `/privacy` rework — PrivacyPolicy JSON-LD, OG/Twitter, canonical, 4 inline SVGs (data flow, controller/processor split, retention bars, rights timeline), DSR link callout, section anchors + aria-labelledby | ☐ |
| E21.4 | `/cookies` rework — WebPage JSON-LD, OG/Twitter, canonical, cookie-category donut SVG, current-consent display, DNT/GPC note | ☐ |
| E21.5 | `/about` enhancement — fix broken `<code>` → `<Link>` for `/changelog` + `/sponsors`, add money-flow + sponsorship-loop SVGs, add FAQ section reusing `HomeFaqSection` | ☐ |
| E21.6 | `/changelog` visual — version-timeline strip SVG, filter chips by kind, RSS feed link in `<head>` | ☐ |
| E21.7 | `/app/help` senior — two-level collapsible (`HomeFaqSection` reuse), topic categories, empty-state SVG, cross-links to `/privacy` `/cookies` `/changelog` `/app/dsr` | ☐ |
| E21.8 | Footer + cross-link audit — add `/about` to footer, normalise mutual discoverability | ☐ |
| E21.9 | Blog pillar hero SVG system — 10 topic-themed illustrations rendered above each pillar article | ☐ |

## Cross-cutting

- **Inline SVG pattern**: same approach as `EduWorkflowSteps.tsx` —
  abstract geometric, lime/primary tokens via `currentColor`,
  `aria-hidden="true"`, no text nodes inside SVG (zero i18n surface),
  capped at sensible dimensions (typically 200×120 for section
  illustrations, 600×200 for hero strips).
- **JSON-LD pattern**: extend `src/lib/seo/` with `privacy-jsonld.ts`
  and `cookies-jsonld.ts` mirroring `schools-jsonld.ts` factory style.
- **TOC pattern**: `<DocTocSidebar>` accepts an array of
  `{ id, label }`; renders `<nav aria-label="On this page">` as
  sticky on `lg:`, collapsible disclosure on `<lg`. Sections each
  carry `id="<slug>"` + `scroll-mt-24` for deep-link landing.
- **Test-id convention**: `{page}-{section|component}-{element}`
  kebab-case (e.g. `privacy-toc-sidebar`, `cookies-categories-donut`).

## Out of scope (defer to future)

- Real product screenshots (requires Playwright capture infra)
- DPA PDF generation endpoint
- Multi-language localisation
- Multi-tenant school portal (separate E22+ epic)
- Testing coverage to 70% (owned by separate agent)

## Done definition

- All 9 stories ✅
- Lint 0/0, all unit tests green, `npm run build` ✓
- Bundle-size delta < 30 KB (10 blog SVG illustrations included)
- Every reworked page has: canonical, OG, Twitter, JSON-LD
  appropriate to surface, aria-labelledby on section headings,
  test-ids on all asserted elements
- Footer links to /about (gap closed)
- Fresh-context CR run on new SEO libs + DocTocSidebar before PR
