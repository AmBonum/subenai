# E65 — Academy section "Bezpečná práca s AI" (safe AI usage, two audience lanes)

**Status:** 🚧 E65.1–E65.8 ✅ Done on `feature/E65-ai-safety-content`;
E65.9 (deploy + prod SQL + live verification) closes once the owner runs
the three SQL files in the prod Supabase SQL editor and the section renders
live. Lint 0/0, Vitest green, build ✓ at the time of the PR.
**Branch:** `feature/E65-ai-safety-content`
**Spec:** `docs/superpowers/specs/2026-09-10-E65-ai-safety-content-design.md`
**Plan:** `docs/superpowers/plans/2026-09-10-E65-ai-safety-content.md`
**Author:** design + implementation 2026-09-10 under the standing autonomous
build-to-prod mandate.

---

## Goal

One academy category, `bezpecna-praca-s-ai`, that teaches safe use of AI
tools to two audiences at once:

- **pre každého** — what never to paste into a chatbot, how to verify an
  answer, privacy settings, fake AI apps, children and chatbots;
- **pre odborníkov** — prompt injection, shadow AI policy, agents and MCP,
  OWASP Top 10 for LLM apps, AI-generated code and slopsquatting.

Every article carries verified real incidents with sources and one inline
"vyskúšaj si to" question from the bank.

## Decisions (see the spec for rationale)

1. Lane = `blog_posts.difficulty` (`beginner` / `advanced` / `NULL` for the
   pillar). No schema change.
2. One category, one pillar, lane toggle on the category page.
3. `CourseCategory` gains `"ai"`; the two beginner AI lessons re-home there.
4. Articles publish through a generated idempotent SQL backfill; the owner
   runs it after merge (public repo — the agent never runs prod SQL).
5. Existing all-lowercase MDX house style; `ty`; `test` never `kvíz`.

## Stories

### ~~E65.1 Section manifest + `ai` course category~~ ✅
- Implementation: `src/content/academy/ai-safety-section.ts`; `"ai"` in
  `CourseCategory` (schema, course-to-row, course-visuals, survey
  interests, i18n labels); two lessons re-categorised.
- Tests: `tests/content/ai-safety-section.test.ts` (manifest shape),
  `tests/lib/academy/course-to-row.test.ts`.
- Documentation: this file; `tasks/topic-content-map.md`.
- Code review: fresh-context review before PR.

### ~~E65.2 Category row, visuals, sitemap, pillar list~~ ✅
- Implementation: migration `20260910100000_blog_category_ai_safety.sql`
  + `DEPLOY_SETUP.sql` mirror; `CATEGORY_VISUALS`, `CategoryIllustration`;
  `scripts/generate-sitemap.mjs` + `src/lib/blog/pillar-slugs.ts`;
  scam-chat route-catalog description.
- Tests: section wiring block in `tests/content/ai-safety-section.test.ts`,
  `tests/seo/sitemap-robots.test.ts`.
- Documentation: `CHANGELOG.md`.

### ~~E65.3 Audience lanes in the UI~~ ✅
- Implementation: `src/lib/academy/difficulty.ts` (Slovak labels — also
  fixes the raw `beginner`/`advanced` leak on lesson cards), lane filter
  in `src/lib/academy/filter.ts`, toggle in `AcademyArchive`, badges in
  `AcademyIndex` + `AcademyEntryPage`.
- Tests: `tests/lib/academy/{difficulty,filter}.test.ts`,
  `tests/components/academy/{AcademyIndex,AcademyArchive,AcademyEntryPage}.test.tsx`.
- Documentation: docs portal (`akademia`, `kurzy`).

### ~~E65.4 Twelve `e65-*` question-bank items~~ ✅
- Implementation: `src/lib/quiz/bank/questions.ts` (url, scenario,
  fake_vs_real, phishing; medium/hard only).
- Tests: `tests/lib/quiz/bank-invariants.test.ts` (existing), quiz-id
  resolution in the section test.

### ~~E65.5 Expert lesson `ai-bezpecnost-pre-odbornikov`~~ ✅
- Implementation: `src/content/courses/ai-bezpecnost-pre-odbornikov.ts`,
  registry, glossary terms, course-count copy 28 → 29 (sk/en/cs),
  regenerated `supabase/backfills/20260628_academy_import_lessons.sql`.
- Tests: `courses-schema`, `courses-schema-all-pass`,
  `academy-lesson-quality` (also fixed the un-glossed `scam` in the E64
  embed heading of `top-podvody-2026-sk`), `claims`, `academy-glossary`.

### ~~E65.6 Backfill generator + frontmatter gate~~ ✅
- Implementation: `src/lib/blog/backfill-sql.ts` (pure builder),
  `scripts/generate-blog-backfill.ts`, `npm run blog:backfill`.
- Tests: `tests/lib/blog/backfill-sql.test.ts`,
  `tests/content/blog-frontmatter.test.ts` (all 90+ MDX files).
- Documentation: `src/content/blog/README.md`.

### ~~E65.7 Eleven articles~~ ✅
- Implementation: `src/content/blog/{pillar + 10 clusters}.mdx`, drafted
  by parallel agents under the brief in the plan, reviewed in full.
- Tests: article integrity block in `tests/content/ai-safety-section.test.ts`
  (word bands, sources, banned phrases, lane vocabulary, link resolution,
  pillar ↔ cluster edges, quiz placement, CTA).
- Documentation: `tasks/blog/{keyword-map,link-graph,editorial-calendar}.md`.

### ~~E65.8 Discovery surfaces + docs~~ ✅
- Implementation: `public/llms.txt` rewrite, docs portal copy,
  `CHANGELOG.md`, `README.md`, `tasks/README.md`.
- Tests: `tests/seo` suite.

### E65.9 Deploy + prod SQL + live verification 🚧
- Implementation: PR → GHAS check → auto-merge → CF Pages deploy.
- Owner ops (prod SQL editor, in order):
  1. `supabase/migrations/20260910100000_blog_category_ai_safety.sql`
  2. `supabase/backfills/20260910_ai_safety_articles.sql`
  3. `supabase/backfills/20260628_academy_import_lessons.sql` (regenerated,
     idempotent; also carries the 8 pending video lessons from E61/E63)
  4. `npm run rag:index`; redeploy so sitemap + RSS list the articles.
- Verification: category page shows 11 articles + 3 lessons with the lane
  toggle; quiz blocks answer; sitemap lists the category and articles.

## Definition of Done

- [x] lint 0/0, `npm test` green, `npm run build` ✓
- [x] migration mirrored in `DEPLOY_SETUP.sql`
- [x] sitemap regenerated with prod env; robots unchanged; llms.txt current
- [x] CHANGELOG + docs portal + editorial artefacts updated
- [x] fresh-context code review
- [ ] prod SQL applied by the owner and the section verified live
