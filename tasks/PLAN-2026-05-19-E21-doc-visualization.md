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
| E21.1 | SQL backfill runbook — teacher pillar + 10 pillar cross-links | ✅ shipped |
| E21.2 | `DocTocSidebar` shared component (sticky desktop, mobile dropdown) | ✅ shipped |
| E21.3 | `/privacy` rework — PrivacyPolicy JSON-LD, OG/Twitter, canonical, DSR link callout, section anchors + aria-labelledby, /schools cross-link | ✅ shipped (4 inline SVGs deferred — body content lift was the bigger win) |
| E21.4 | `/cookies` rework — WebPage JSON-LD, OG/Twitter, canonical, current-consent display, DNT/GPC note, section anchors + aria-labelledby | ✅ shipped |
| E21.5 | `/about` enhancement — `<code>` → `<Link>` fixes, AboutFaq section (5 Qs, 2 categories) via HomeFaqSection adapter | ✅ shipped (money-flow + sponsorship-loop SVGs deferred — FAQ delivered more direct value) |
| E21.6 | `/changelog` visual — version-timeline strip SVG, filter chips by kind | ⏭️ deferred — existing color-coded section badges per release already provide visual differentiation; timeline strip is nice-to-have |
| E21.7 | `/app/help` senior — quick-links to /privacy /cookies /changelog /schools, empty-state SVG illustration, a11y `<Label>` fix | ✅ shipped |
| E21.8 | Footer + cross-link audit | ✅ confirmed non-issue — `/about` IS already wired via `o_projekte` footer column entry (audit-subagent was wrong) |
| E21.9 | Blog pillar hero SVG system | ⏭️ already exists — `BlogHeroFallback` + `CategoryIllustration` (E16.4) provide category-themed SVG heroes for every article including pillars. Pillar-specific vs category-specific differentiation is marginal value at this stage. |

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
