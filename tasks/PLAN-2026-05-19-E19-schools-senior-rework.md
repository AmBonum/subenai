# E19 — `/schools` senior-level rework + documentation visualization

> **Status**: ✅ **DELIVERED** 2026-05-20 — all 8 stories shipped. Status
> closure swept 2026-05-20 (third PLAN file this week to surface the
> "tracker outpaced by impl" antipattern after E18 + E21). Codebase verify
> below — every story has its artifact in main.
>
> **Branch**: `feature/E16-blog` (continuation of the open PR #27 epic — no
> DB schema change, no `/app` surface, no auth changes; expanding the existing
> marketing-side work).
>
> **Strategic decision** (audited 2026-05-19): `/schools` stays a PUBLIC
> marketing page. Auth-gating it would break the public edu-mode value prop
> (`/test/zostav` is already public + password-gated) AND the GDPR Art. 28
> disclosure flow (DPA reference must be crawlable before signup). The
> existing `/app/teams` + `/app/audiences` are author-shaped, not
> school-shaped; a multi-tenant school portal is a separate epic (E20+).

## Goal

Rework `/schools` from a flat prose guide (211 LOC, no images, no
JSON-LD, dead-end cross-links) into a senior-level marketing +
documentation page that converts principals, IT coordinators, and
teachers by speaking to their outcomes, satisfies SEO with full
structured data (FAQPage + HowTo + EducationalOrganization +
BreadcrumbList), and joins the test ↔ školenie ↔ akadémia cross-link
triangle shipped in E17.

## Story Tracker

| # | Story | Status |
|---|---|---|
| E19.1 | SEO head() + structured data (FAQPage + HowTo + EducationalOrg JSON-LD) | ✅ shipped — `src/lib/seo/schools-jsonld.ts` + 8 `buildSchools…` refs in `routes/schools.tsx` head() |
| E19.2 | Persona hero — lime kicker, outcome H1, three persona chips, primary CTA | ✅ shipped — `src/components/schools/SchoolsHero.tsx` |
| E19.3 | Edu-mode workflow visualization (4 step cards + inline abstract SVGs) | ✅ shipped — `src/components/schools/EduWorkflowSteps.tsx` |
| E19.4 | Persona comparison table (riaditeľ / IT koord / učiteľ) | ✅ shipped — `src/components/schools/PersonaComparisonTable.tsx` |
| E19.5 | Collapsible FAQ (via HomeFaqSection adapter) + mobile sticky CTA | ✅ shipped — `SchoolsFaqSection.tsx` + `SchoolsStickyCta.tsx` |
| E19.6 | GDPR card + explicit DPA callout box (replaces hidden mailto) | ✅ shipped — `src/components/schools/SchoolsGdprCard.tsx` (file leads with "E19.6 — GDPR card with explicit DPA callout") |
| E19.7 | Breadcrumb + footer cross-link triangle (test / composer / blog) | ✅ shipped — `SchoolsBreadcrumb.tsx` + `SchoolsFooterCta.tsx` |
| E19.8 | Playwright e2e POM + spec under `e2e/specs/marketing/schools.spec.ts` | ✅ shipped — both `marketing/schools.spec.ts` and the supplementary `edu/schools-howitworks-contract.spec.ts` (E78) cover the page |

## E19.1 — SEO head() + structured data

**CREATE**: `src/lib/seo/schools-jsonld.ts` — `buildSchoolsFaqJsonLd`,
`buildSchoolsHowToJsonLd`, `buildSchoolsOrgJsonLd` (mirror
`src/lib/seo/faq-jsonld.ts`).

**MODIFY**: `src/routes/schools.tsx:9-15` — expand `head()` with
canonical, og:title/description/type/url/image, twitter:card/title/desc,
and three JSON-LD `<script>` tags.

**TESTS**: `tests/lib/seo/schools-jsonld.test.ts` (one suite per builder).

**AC**: `<link rel="canonical">` emitted; FAQPage entries match
`skoly.faq_*` keys; HowTo has 4 steps; EducationalOrganization has
contactPoint with email.

## E19.2 — Persona hero

**CREATE**: `src/components/schools/SchoolsHero.tsx` — lime kicker,
outcome H1, three persona chips (`riaditel`, `itkoord`, `ucitel`),
subheading, primary CTA → `ROUTES.zostav`. All test-ids
`schools-hero-*`.

**MODIFY**: `src/routes/schools.tsx:24-34` → `<SchoolsHero />`;
`src/i18n/locales/sk/marketing.json` `skoly.*` block — add 7 new keys
(`hero_kicker`, `hero_title`, `hero_subtitle`, three `hero_persona_*`,
`hero_cta`).

**TESTS**: `tests/components/schools/SchoolsHero.test.tsx`.

**AC**: outcome-first H1 (result a teacher achieves, not feature
description); lime kicker `text-success`; three persona chips with
test-ids.

## E19.3 — Edu-mode workflow visualization

**CREATE**: `src/components/schools/EduWorkflowSteps.tsx` — `<ol>`
following `LearningPathSection.tsx` pattern; 4 cards; each with a
lime step-number badge and a 120×80 inline abstract SVG
(`aria-hidden="true"`). No external `.svg` asset files; no `<img>`.

**MODIFY**: `src/routes/schools.tsx:47-117` → `<EduWorkflowSteps />`;
add `skoly.step{1..4}_outcome` keys.

**TESTS**: `tests/components/schools/EduWorkflowSteps.test.tsx`.

**AC**: all 4 steps render; existing step-heading assertions in
`schools.test.tsx:36-39` still pass; SVGs are `aria-hidden`.

## E19.4 — Persona comparison table

**CREATE**: `src/components/schools/PersonaComparisonTable.tsx` —
responsive `<table>` desktop, stacked `<dl>` mobile. 5 feature rows
(dashboard, CSV export, GDPR role, respondent count, setup time).

**MODIFY**: `src/routes/schools.tsx` — insert between hero and
workflow steps; add `skoly.comparison_*` keys.

**TESTS**: `tests/components/schools/PersonaComparisonTable.test.tsx`.

**AC**: three column headers; at least one checkmark per column;
mobile-stacked variant renders on `<sm` viewport.

## E19.5 — Collapsible FAQ + sticky mobile CTA

**CREATE**:
- `src/components/schools/SchoolsFaqSection.tsx` — adapter that wraps
  `HomeFaqSection` with two categories: "Heslo a prístup" (faq_pwd,
  faq_retake) and "Dáta a GDPR" (faq_retention, faq_delete, faq_max,
  faq_mobile).
- `src/components/schools/SchoolsStickyCta.tsx` — `position: sticky`
  bottom bar visible only on `sm:hidden`. CTA → `ROUTES.zostav`.

**MODIFY**: `src/routes/schools.tsx:159-186` → `<SchoolsFaqSection />`;
append `<SchoolsStickyCta />`; add `skoly.faq_section_*` +
`skoly.sticky_cta` keys; add `pb-16 sm:pb-0` to `<main>`.

**TESTS**: `tests/components/schools/SchoolsFaqSection.test.tsx`,
`tests/components/schools/SchoolsStickyCta.test.tsx`.

**AC**: no raw `<dl>` left in `/schools`; FAQ answers reachable in DOM
even when collapsed (Radix); sticky CTA href to Composer.

## E19.6 — GDPR card + DPA callout

**CREATE**: `src/components/schools/SchoolsGdprCard.tsx` —
lime-left-border card containing the existing 4 GDPR bullets plus an
internal `DpaCalloutBox` (bordered box with `mailto:` CTA labelled
`skoly.gdpr_dpa_cta`).

**MODIFY**: `src/routes/schools.tsx:119-156` → `<SchoolsGdprCard />`;
add `skoly.gdpr_dpa_heading`, `_body`, `_cta` keys.

**TESTS**: `tests/components/schools/SchoolsGdprCard.test.tsx`.

**AC**: "kontrolór" + "sprostredkovateľ" text preserved; DPA mailto
visible without interaction; existing schools.test.tsx GDPR test passes.

## E19.7 — Breadcrumb + footer cross-link triangle

**CREATE**:
- `src/components/schools/SchoolsBreadcrumb.tsx` — `<nav
  aria-label="breadcrumb">` with BreadcrumbList JSON-LD inline.
- `src/components/schools/SchoolsFooterCta.tsx` — three CTA cards
  (test, composer, blog); lime accent on Composer card.

**MODIFY**: `src/routes/schools.tsx:25-27` → `<SchoolsBreadcrumb />`;
`schools.tsx:189-207` → `<SchoolsFooterCta />`; remove `skoly.back_home`
key and add `breadcrumb_home`, `footer_cta_*` keys.

**TESTS**: `tests/components/schools/SchoolsBreadcrumb.test.tsx`,
`tests/components/schools/SchoolsFooterCta.test.tsx`.

**AC**: BreadcrumbList JSON-LD present; three footer CTAs link to
correct routes; `/schools` now part of cross-link triangle (links
outward to /courses, /blog, /test/zostav).

## E19.8 — E2E Playwright spec

**CREATE**: `e2e/poms/marketing/SchoolsPage.ts` + `e2e/specs/marketing/schools.spec.ts`.

**TESTS**: spec is the test. Three scenarios: (1) page loads + hero
visible + persona chips; (2) FAQ category toggles open; (3) Composer
CTA navigates to `/test/zostav`.

**AC**: POM-only locators (no `page.locator()` in spec); all three
pass against local dev server.

## Cross-Cutting

- **i18n**: all new keys under `skoly.*` in `src/i18n/locales/sk/marketing.json`. No new namespace.
- **Lime accent**: reuse `text-success`, `bg-success/{10|20}`, `border-success/{40|60}` — tokens already in `src/styles.css`.
- **Inline SVG (E19.3)**: JSX `<svg>` directly inside the component. No `.svg` assets. `aria-hidden="true"` + `focusable="false"`. Width/height ≤ 120×80. No text nodes (i18n surface free).
- **Test-IDs**: every interactive/asserted element gets `schools-<component>-<element>` kebab-case.

## Risks + Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| `schools.test.tsx` regex on H1 breaks after rename | High | Update test in same commit as E19.2 |
| `HomeFaqSection` adapter rendering breaks existing FAQ answer test | Low | Radix accordion keeps content in DOM; verify test still finds text |
| Inline SVG bloats bundle | Low | 4 small abstract SVGs ≈ 2 KB. Tracked via `npm run build` size diff |
| Sticky CTA overlaps content on short viewports | Low | Add `pb-16 sm:pb-0` to `<main>` when sticky is mounted |
| BreadcrumbList JSON-LD SSR hydration mismatch | Medium | Use `<script dangerouslySetInnerHTML>` pattern; verify `npm run build` clean |

## Done Definition

- All 8 stories ✅ (implementation + unit tests + e2e POM/spec)
- `npm run lint` 0/0
- `npm test` 100 % pass, including updated `schools.test.tsx`
- `npm run build` ✓ with no bundle-size regression > 10 KB
- `/schools` emits canonical + OG/Twitter + 4 JSON-LD blocks
- `/schools` links outward to `/test/zostav`, `/courses`, `/blog`
- Fresh-context CR run before PR scope expansion / new PR opened

## Out of Scope (E20+)

- Real product screenshots / Playwright capture infrastructure
- DPA PDF generation or download endpoint
- Blog pillar article for teachers (separate content epic)
- Public 45-min classroom lesson plan
- Multi-tenant school portal (subdomain, school-admin seat management)
- Microsoft 365 / Google Workspace SSO
- `/schools` localization (CZ/EN)
