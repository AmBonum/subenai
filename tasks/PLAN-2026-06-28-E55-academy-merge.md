# PLAN — E55: Academy (merge /blog + /courses → /academy, interactive)

**Status:** 🟡 Design approved 2026-06-28, awaiting implementation-plan kickoff
**Branch:** `feature/E55-academy`
**Brainstorm:** approved by owner 2026-06-28 (this doc is the design spec)

---

## Problem / reality (from code, not assumption)

Two separate content systems for what is conceptually one thing — learning
material about scams:

- **Blog** — DB-backed (Supabase `blog_posts` + `blog_categories` /
  `blog_authors` / `blog_tags`), 82 published Markdown articles, CMS-editable
  via admin, RSS, `Article` JSON-LD. Routes `/blog`, `/blog/$slug`,
  `/blog/kategoria/$slug`, `/blog/autor/$slug`. Renderer
  `src/components/blog/BlogPostBody.tsx` (react-markdown + GFM, auto-callouts).
- **Courses** — 31 static TS modules (`src/content/courses/*.ts`) with a
  structured `CourseSection` union (intro / example / checklist / redflags /
  do_dont / scenario), `Course` JSON-LD. Routes `/courses`, `/courses/$slug`.
- **An interactive quiz engine already exists and is reusable**:
  `QuestionCard` + `AnswerFeedback` (immediate correct/incorrect + per-question
  `explanation`), a 100+ `Question` bank (`src/lib/quiz/bank/questions.ts`),
  and `VisualBlock` (SMS/Email/URL/… mockups). This is exactly the
  "w3schools try-it" interaction the owner wants.

The split is arbitrary, doubles the surface (two indexes, two renderers, two
test suites, two SEO models), and the educational articles lack the
interactivity courses imply.

## Goal

One **`/academy`** section that holds both the existing articles and the
courses, with thorough content and **interactive w3schools-style questions
(immediate right/wrong feedback + justification)** embedded inline. Remove
`/blog` and `/courses`. Update / add / remove every connected test.

## Decisions (owner-approved)

1. **DB-unified content model.** Keep the physical `blog_*` tables (82 rows
   already live; a rename to `academy_*` is cosmetic churn + RLS/admin/query/
   seed/RSS risk — out of scope). Surface them as "Academy". Migrate the 31
   static courses **into** the DB as rows. One renderer, CMS-editable, RSS
   intact.
2. **English URL path segments**, Slovak content slugs preserved (SK keywords
   in URLs help SK SEO; no re-slug of 82 articles). New segments: `/academy`,
   `/academy/$slug`, `/academy/category/$slug`, `/academy/author/$slug`.
3. **Interactivity via Markdown shortcodes** (not MDX-with-React): the body
   stays Markdown (DB- and CMS-friendly); the renderer parses shortcodes.

## Architecture

### Content model — extend `blog_posts`

New columns on `blog_posts` (migration; `content_type` defaults keep the 82
articles as articles):

| Column | Type | Meaning |
|---|---|---|
| `content_type` | text `'article' \| 'lesson'` default `'article'` | distinguishes read-articles from interactive lessons |
| `difficulty` | text null (`'beginner' \| 'advanced'`) | lessons only |
| `estimated_minutes` | int null | lessons only |
| `hero_emoji` | text null | lessons only |

`types.ts` (Supabase types) updated in the same PR (CLAUDE.md rule). The 31
migrated courses become rows with `content_type='lesson'` and their
difficulty/minutes/emoji mapped from the `Course` object.

### Renderer — extend the Markdown body with shortcodes

`AcademyArticleBody` (evolved from `BlogPostBody`) parses, before markdown
render, these inline shortcodes on their own line:

- **`[[quiz:<question-id>]]`** → the interactive block. Resolves the id in the
  `QUESTIONS` bank and renders a single-question `AnswerFeedback`-driven widget
  (`AcademyQuiz`): the visual + options, immediate correct/incorrect styling +
  the question's `explanation`, with a "try again" reset. Reuses the quiz
  engine; no new feedback logic. This is the w3schools moment.
- **`[[visual:<type>|key=value|…]]`** → a `VisualBlock` mockup (SMS/Email/URL/
  Instagram/Listing/Call/Text) for non-interactive examples (course `example`
  sections convert to this).
- Checklists / red-flags / do-dont → plain Markdown lists + the existing
  bold-prefix callout convention (`**Pozor:** …`, `**Tip:** …`).

The parser is a small pre-pass returning an array of `{kind:'md', text} |
{kind:'quiz', id} | {kind:'visual', spec}` blocks; each renders independently
(unit-testable in isolation). Unknown / missing ids render a safe inline
notice, never crash.

### Routing + redirects (SEO-preserving)

New routes (mirror the blog structure, English segments):
- `/academy` — `academy.index.tsx` (+ lazy)
- `/academy/$slug` — `academy.$slug.tsx` (+ lazy)
- `/academy/category/$slug` — `academy.category.$slug.tsx` (+ lazy)
- `/academy/author/$slug` — `academy.author.$slug.tsx` (+ lazy)

**301 redirects** via `public/_redirects` (Cloudflare Pages), slugs preserved:
```
/blog/kategoria/*  /academy/category/:splat  301
/blog/autor/*      /academy/author/:splat    301
/blog/*            /academy/:splat           301
/blog              /academy                  301
/courses/*         /academy/:splat           301
/courses           /academy                  301
```
`/blog` + `/courses` routes and their components are deleted. Slug-collision
guard: assert (test) no `content_type='lesson'` slug equals an existing
article slug before/at migration; resolve by suffixing a migrated course slug
if needed (documented in the migration script).

### Index `/academy`

One hub (evolves `CoursesIndexPage` + the blog index): filter by **type**
(articles / lessons), **category**, **difficulty**; sort newest / shortest /
beginner; full-text search. Lesson cards show difficulty + minutes + emoji;
article cards show category + reading time. Reuses existing card components,
consolidated.

### SEO

- Lessons → `Course` JSON-LD; articles → `Article` JSON-LD (pick per
  `content_type`). Breadcrumb root becomes Academy.
- `scripts/generate-sitemap.mjs`: replace `/blog*` + `/courses*` blocks with
  `/academy`, `/academy/$slug` (all published rows), `/academy/category/$slug`.
- `scripts/generate-blog-rss.mjs` → `/academy/rss.xml` (same query, new links).
- Nav mega-menu (merge the two "blog"/"skolenia" items into one **Akadémia**),
  footer, home learning-path, and the ~33 internal `ROUTES.blog`/
  `ROUTES.skolenia` references repoint to `ROUTES.academy*`.

### Course → DB migration

`scripts/migrate-courses-to-db.mjs` (Node, one-time, idempotent upsert): for
each of the 31 `Course` objects, convert `sections[]` → a Markdown body with
shortcodes (`example`→`[[visual:…]]`, `checklist`/`redflags`/`do_dont`→lists+
callouts, `scenario`→callout, `intro`→prose), map difficulty/minutes/emoji/
category/sources, and upsert into `blog_posts` with `content_type='lesson'`.
Emits the rows; the **owner runs the resulting SQL in prod Supabase** (the
script can also output a `.sql` for the chat, per CLAUDE.md + memory). The
static `src/content/courses/**` stays as the migration source until cutover,
then is removed.

## Content quality gate — editorial (owner requirement, blocking)

**Every single course must be read end-to-end and copy-edited by a dedicated
writing/editing subagent before its content ships as an academy lesson.** This
is a hard gate on E55.4, not a nice-to-have. Rules the agent enforces per
course (and per migrated article body it touches):

- **Standard literary Slovak (spisovná slovenčina).** Correct diacritics,
  grammar, agreement, punctuation, typography (e.g. „slovenské úvodzovky",
  pomlčka –, non-breaking spaces before units). Zero typos — spelling or
  content.
- **No content errors.** Facts, numbers, claims and red-flag logic are
  internally consistent and correct; nothing misleading.
- **English terms get a Slovak gloss in parentheses on first use** in each
  lesson, e.g. *phishing (podvodné vylákanie údajov)*, *scam (podvod)*,
  *smishing (phishingová SMS)*, *vishing (telefonický podvod)*, *spoofing
  (podvrhnutie identity)*. Thereafter the term may stand alone. Keep a
  consistent glossary across all courses (a shared `GLOSSARY` so the same term
  always gets the same Slovak gloss).
- **Consistent terminology and tone** with the rest of the site copy.

**Process:** in E55.4, each course is dispatched to a copy-editing subagent
(prompted with the rules above + the shared glossary). The agent returns the
corrected content + a list of changes; corrections are applied to the source
(`src/content/courses/*.ts`) before conversion, so the clean text flows into
the DB. A final full proofread pass over all migrated lessons closes the gate.
Reuse `marketing:brand-review` / `elements-of-style:writing-clearly-and-concisely`
where available; otherwise a `general-purpose` agent with the explicit ruleset.
The same gate applies to any new Phase-B content.

## Testing strategy (every type)

- **Unit (Vitest):** shortcode parser (md/quiz/visual split, unknown-id
  safety); `AcademyQuiz` render + correct/incorrect/explanation + reset;
  course→markdown converter (golden per section kind); `content_type` JSON-LD
  selection; index filters (type/category/difficulty); redirect-map table.
- **a11y:** `expectNoA11yViolations` (the E53 jest-axe helper) on the academy
  index, an article page, a lesson page, and the interactive quiz widget.
- **Integration (Vitest):** query layer (lessons+articles), sitemap + RSS
  output contains `/academy/*` and no `/blog`/`/courses`.
- **e2e (Playwright, POM `e2e/poms/academy/`):** index filter to lessons;
  open a lesson; answer an embedded `[[quiz:]]` → immediate feedback shows;
  redirect `/blog/<slug>` → `/academy/<slug>` (302/200 final); `/courses/<slug>`
  redirect; cross-links. Consolidate `e2e/specs/{blog,courses}` →
  `e2e/specs/academy`; delete/repoint obsolete specs + POMs.
- **Bundle-budget:** the quiz engine already ships; re-baseline only if a chunk
  crosses budget (lazy-load the academy routes as today).
- **Contract:** `prod-schema-invariants` extended for the new columns.

## Phasing

- **Phase A (this spec):** schema + types, shortcode renderer + `AcademyQuiz`,
  `/academy` routes + index, `_redirects`, course→DB migration script, nav /
  footer / home / sitemap / RSS / SEO repoint, delete `/blog` + `/courses`,
  full test consolidation. Ships the merged, interactive-capable Academy.
- **Phase B (incremental):** author `[[quiz:]]` interactivity into existing
  high-traffic articles; richer `[[visual:]]` examples. Content work, per page.

## DB migration / ops

Schema changes ship as `supabase/migrations/*` + `DEPLOY_SETUP.sql` (CLAUDE.md)
and the course-import SQL. **The exact SQL is pasted into chat for the owner
to run in prod Supabase** (memory: db-migration-sql-to-chat). Routes/redirects
are code; they go live on merge; the migrated lesson rows appear only after the
owner runs the import SQL.

## Story breakdown (implementation-plan seed)

- **E55.1** — Schema: `blog_posts` columns + types regen + invariants test.
- **E55.2** — Shortcode renderer + `AcademyQuiz` (reuse quiz engine) + unit/a11y.
- **E55.3** — `/academy` routes (index, $slug, category, author) + index filters;
  queries renamed/extended; SEO JSON-LD per `content_type`.
- **E55.4** — **Editorial copy-edit of every course (per § Content quality
  gate)** by a dedicated subagent + shared Slovak glossary, corrections applied
  to source; THEN Course→DB migration script + converter (+ golden tests) +
  SQL out. The migration must not run on un-edited copy.
- **E55.5** — `_redirects` + delete `/blog`+`/courses` routes/components +
  repoint nav/footer/home/internal links + sitemap + RSS.
- **E55.6** — Test consolidation: blog+courses → academy (unit + e2e/POM),
  remove obsolete; full green loop.
- **E55.7** — Final editorial proofread pass over ALL migrated lessons (+ the
  82 articles' English-term glosses), closing the content quality gate.

Sequencing: E55.1 → E55.2 ∥ E55.3 → E55.4 (edit → migrate) → E55.5 → E55.6 →
E55.7.

## Risks / open

- **R1 — slug collision** lesson vs article: guarded by a pre-migration test;
  resolve by suffix.
- **R2 — redirect coverage**: 82+31 indexed URLs; wildcard `_redirects` + a
  test asserting representative old→new mappings.
- **R3 — course content fidelity**: structured sections → markdown may lose
  some layout nuance (e.g. do_dont two-column). Converter keeps a callout-based
  equivalent; spot-check a sample of migrated lessons in preview.
- **R4 — big-bang cutover**: Phase A removes `/blog`+`/courses` at once. The
  migration SQL must run before/at deploy or lessons 404. Runbook documents the
  order; redirects + article rows keep the site functional even if lesson
  import lags.

## Out of scope

- **Mobile bottom sticky nav bar** — separate sub-project, designed after this.
- Re-slugging existing Slovak article slugs (owner: keep for SK SEO).
- Renaming `blog_*` tables to `academy_*` (cosmetic; later cleanup).
