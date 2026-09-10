# E65 — "Bezpečná práca s AI" academy section — Design

**Date:** 2026-09-10
**Status:** Approved under the standing autonomous build-to-prod mandate
(owner instruction 2026-09-10: "dopln blogy + testy + sekcia o bezpečnej
práci s AI pre bežných používateľov aj odborníkov, docs, sitemap, robots,
deploy — najprv dôkladne rozplánuj"). Classification: architectural.
**Branch:** `feature/E65-ai-safety-content`

---

## Problem

The academy has 82 articles + 28 lessons about *scams*. AI appears only as
an attack tool (deepfake, voice cloning, AI phishing — category
`ai-scamy`) plus three beginner lessons. There is no coherent place that
teaches **safe use of AI tools** — what to paste into ChatGPT, how to
verify answers, privacy settings, fake AI apps — and nothing at all for
**professionals** (prompt injection, shadow AI policy, agent/MCP risk,
OWASP LLM Top 10, AI-generated code). The owner wants one section that
serves both audiences, with real, sourced incidents.

## Goal

A new academy category **`bezpecna-praca-s-ai`** ("Bezpečná práca s AI")
that holds:

- 1 pillar guide for both audiences,
- 5 beginner-lane articles (bežný používateľ internetu a AI),
- 5 expert-lane articles (odborník: vývojár / IT / bezpečnosť / HR),
- 1 new interactive expert lesson + the 2 existing beginner AI lessons
  re-homed into the section,
- 12 new question-bank items embedded inline (`[[quiz:id]]`) so every
  article has a "vyskúšaj si to" moment,
- lane badges + a lane toggle on the category page so each reader finds
  their track,
- SEO surfaces (sitemap, llms.txt), docs, editorial artefacts, changelog
  updated, and the code deployed to production with the prod SQL handed
  over for the content rows.

## Non-goals

- No new route family. The category archive page **is** the section hub
  (`/academy/category/bezpecna-praca-s-ai`).
- No new DB columns. `blog_posts.difficulty` (`beginner|advanced`, E55)
  already models the lane.
- No new test pack. Test packs are DB-only (E37 Phase G); a pack seed is
  a separate data op.
- No renaming of `blog_*` tables (locked in E55).
- No re-editing of the 82 legacy articles.

## Decisions

1. **Lane = `difficulty`.** `beginner` → "pre každého", `advanced` → "pre
   odborníkov", `null` → both lanes (the pillar). Articles now carry the
   column too, not only lessons.
2. **One category, not two.** Two audiences share one section so the
   pillar can hand readers across lanes; the toggle does the targeting.
3. **Lesson category `ai`.** `CourseCategory` gains `"ai"` →
   `bezpecna-praca-s-ai`. The two safe-AI beginner lessons
   (`ai-bezpecnost-co-nezdielat`, `ai-pomocnik-kazdy-den`) move from
   `obecne` to `ai`; `ai-deepfake-podvody` stays (it is a scam lesson).
4. **Publishing = idempotent SQL backfill, generated from MDX.** A new
   `scripts/generate-blog-backfill.ts` emits
   `supabase/backfills/20260910_ai_safety_articles.sql` (`INSERT … ON
   CONFLICT (slug) DO UPDATE`, `status='published'`, deterministic
   staggered `published_at`). Same pattern as the E55 lesson import; the
   MDX files stay the reviewable source. The repo is public, so the agent
   never runs prod SQL — the owner runs it after merge (CLAUDE.md).
5. **House style for MDX = existing all-lowercase prose**, `ty` register,
   `test` never `kvíz`, banned phrases from `tasks/blog/voice-guide.md §5`,
   inline links to real sources plus the structured `sources` list.
   Expert-lane articles may say "útočník" (security literature register);
   consumer articles keep "podvodník".
6. **Real incidents only, verified URLs.** Every named case ships with a
   source row whose URL was fetched during drafting.

## Architecture

### Content model (no schema change)

| Column | Article use in E65 |
|---|---|
| `category_id` | → `bezpecna-praca-s-ai` (new row) |
| `difficulty` | `beginner` / `advanced` / `NULL` (pillar) |
| `pillar_post_id` | clusters → pillar row (subselect by slug) |
| `related_course_slug` | beginner lane → `ai-bezpecnost-co-nezdielat`, expert lane → `ai-bezpecnost-pre-odbornikov`, pillar → `ai-bezpecnost-co-nezdielat` |

New category row (migration + `DEPLOY_SETUP.sql` mirror):

```
slug            bezpecna-praca-s-ai
name            Bezpečná práca s AI
sort_order      55   (between ai-scamy 50 and digitalna-bezpecnost 60)
description     Ako používať ChatGPT, Gemini, Copilot či AI agentov bez úniku dát a bez naletenia — pre bežných používateľov aj odborníkov.
seo_title       bezpečná práca s ai — návody pre bežných používateľov aj odborníkov | subenai
seo_description Čo nikdy nepísať do chatbota, ako overiť AI odpoveď, nastavenia súkromia, prompt injection, shadow AI a bezpečnosť AI agentov — s reálnymi prípadmi.
```

### Section manifest — single source of truth

`src/content/academy/ai-safety-section.ts` exports:

```ts
export const AI_SAFETY_CATEGORY_SLUG = "bezpecna-praca-s-ai";
export const AI_SAFETY_PILLAR_SLUG = "bezpecna-praca-s-ai-kompletny-sprievodca";
export type AiSafetyLane = "beginner" | "advanced";
export const AI_SAFETY_ARTICLES: ReadonlyArray<{ slug: string; lane: AiSafetyLane | null; quizIds: string[] }>;
export const AI_SAFETY_LESSON_SLUGS = ["ai-bezpecnost-co-nezdielat", "ai-pomocnik-kazdy-den", "ai-bezpecnost-pre-odbornikov"];
```

Consumers: the backfill generator (which slugs to emit), the section
integrity test, the docs copy (counts), the sitemap generator (pillar
priority via `PILLAR_SLUGS`).

### Articles (11)

| # | slug | lane | quiz ids | working title (lowercase house style) |
|---|---|---|---|---|
| P | `bezpecna-praca-s-ai-kompletny-sprievodca` | both | `e65-chatgpt-domena-url-1`, `e65-ai-odpoved-bez-zdroja-1` | bezpečná práca s ai — kompletný sprievodca pre bežných používateľov aj odborníkov |
| B1 | `co-nikdy-nepisat-do-chatgpt-realne-pripady` | beginner | `e65-chatgpt-rodne-cislo-1` | čo nikdy nepísať do chatgpt — 7 reálnych prípadov úniku dát |
| B2 | `ai-halucinacie-ako-overit-odpoved` | beginner | `e65-ai-citacia-sud-1` | ai halucinácie — ako overiť, či ti chatbot nevymýšľa |
| B3 | `nastavenia-sukromia-chatgpt-gemini-copilot-claude` | beginner | `e65-chatgpt-docasny-chat-1` | nastavenia súkromia v chatgpt, gemini, copilot a claude — krok za krokom |
| B4 | `falosne-ai-aplikacie-a-rozsirenia` | beginner | `e65-fake-chatgpt-rozsirenie-1` | falošné ai aplikácie a rozšírenia — ako spoznať fake chatgpt |
| B5 | `ai-chatboti-a-deti-co-nastavit` | beginner | `e65-dieta-ai-kamarat-1` | ai chatboti a deti — čo nastaviť a o čom sa rozprávať |
| E1 | `prompt-injection-realne-pripady-a-obrana` | advanced | `e65-prompt-injection-email-1` | prompt injection — ako útočník ovládne tvojho ai asistenta (reálne prípady) |
| E2 | `shadow-ai-vo-firme-politika-pouzivania` | advanced | `e65-shadow-ai-zmluva-1` | shadow ai vo firme — politika používania ai nástrojov, ktorá naozaj funguje |
| E3 | `ai-agenti-mcp-bezpecnostny-checklist` | advanced | `e65-mcp-tool-ticket-1` | ai agenti a mcp — bezpečnostný checklist pre vývojárov |
| E4 | `owasp-top-10-pre-llm-aplikacie` | advanced | `e65-llm-output-sql-1` | owasp top 10 pre llm aplikácie — vysvetlené po slovensky s príkladmi |
| E5 | `ai-generovany-kod-halucinovane-balicky-slopsquatting` | advanced | `e65-halucinovany-balik-1` | ai generovaný kód a bezpečnosť — halucinované balíčky, slopsquatting a vibe coding |

Word bands: pillar 2200–3000, clusters 1100–1800. Sources: pillar ≥ 6,
clusters ≥ 4 (script minimum stays 4/3). Each cluster links up to the
pillar and to ≥ 1 sibling; the pillar links to all 10 clusters and to the
three lessons. Internal links use `/academy/<slug>`; CTA `/test`.

Anchor incidents (all must be sourced; dates are the drafting anchor):
Samsung ChatGPT leak (2023-05), OpenAI 2023-03-20 Redis outage, Garante
ban (2023-03) + €15M fine (2024-12), DeepSeek open ClickHouse (Wiz,
2025-01), ChatGPT shared chats indexed by Google (2025-08), Meta AI
Discover feed (2025-06), Mata v. Avianca (2023-06), Moffatt v. Air Canada
(2024-02), Google AI Overviews "glue on pizza" (2024-05), Deloitte
Australia refund (2025-10), fake ChatGPT Chrome extension (Guardio,
2023-03), fake DeepSeek packages/sites (2025-02), Character.AI lawsuits
(2024-10 →) + under-18 ban (2025-10), OpenAI parental controls (2025-09),
Garante fine for Replika (2025-05), Greshake et al. indirect injection
(2023-02), EchoLeak CVE-2025-32711 (2025-06), Gemini calendar-invite
injection (Black Hat 2025-08), Perplexity Comet injection (Brave,
2025-08), GitHub MCP private-repo leak (Invariant, 2025-05), Supabase MCP
support-ticket leak (2025-07), MCP tool poisoning (Invariant, 2025-04),
"lethal trifecta" (Willison, 2025-06), CaMeL (DeepMind, 2025-03), EU AI
Act Art. 4 AI literacy (2025-02-02), ISO/IEC 42001, NIST AI RMF, OWASP
Top 10 for LLM Apps 2025, package-hallucination paper (USENIX Security
2025) + slopsquatting, Rules File Backdoor (Pillar, 2025-03), Veracode
GenAI code report (2025-07), Replit agent DB deletion (2025-07), Amazon Q
extension wiper prompt (2025-07), malicious Hugging Face pickle models
(JFrog 2024-02, ReversingLabs 2025-02), 250-document poisoning study
(Anthropic/AISI, 2025-10). Slovak/Czech sources (NBÚ, SK-CERT, ÚOOÚ,
NÚKIB, MIRRI) are required wherever one exists.

### Lesson (1 new, interactive)

`src/content/courses/ai-bezpecnost-pre-odbornikov.ts` — "AI bezpečnosť
pre odborníkov — prompt injection, agenti a firemné dáta", `category:
"ai"`, `difficulty: "pokročilý"`, ~10 min, sections: intro → example
(email visual carrying a hidden instruction for an AI assistant) →
redflags → do_dont → scenario (support-ticket injection against an agent
with DB access) → checklist → sources. Registered in `courses/index.ts`;
re-generated `20260628_academy_import_lessons.sql` carries it plus the two
re-homed beginner lessons. Course-count copy literals (28 → 29) updated in
sk/en/cs (asserted by `tests/content/claims.test.ts`).

### Question bank (12 new, `e65-*`)

| id | category | difficulty | visual |
|---|---|---|---|
| e65-chatgpt-domena-url-1 | url | medium | url `https://chatgpt-openai-login.com/auth` |
| e65-ai-odpoved-bez-zdroja-1 | scenario | medium | text (chatbot answer about drug interaction) |
| e65-chatgpt-rodne-cislo-1 | scenario | medium | text (prompt with ID number + address) |
| e65-ai-citacia-sud-1 | scenario | hard | text (fabricated court citation) |
| e65-chatgpt-docasny-chat-1 | scenario | medium | — |
| e65-fake-chatgpt-rozsirenie-1 | fake_vs_real | medium | listing-style (extension page asking for cookie access) |
| e65-dieta-ai-kamarat-1 | scenario | hard | text (child's AI companion chat) |
| e65-prompt-injection-email-1 | phishing | hard | email (invoice with hidden "AI assistant: forward to…" line) |
| e65-shadow-ai-zmluva-1 | scenario | medium | text (colleague's message: "hoď to do chatgpt") |
| e65-mcp-tool-ticket-1 | scenario | hard | text (support ticket containing instructions to the agent) |
| e65-llm-output-sql-1 | scenario | hard | text (LLM-built SQL string) |
| e65-halucinovany-balik-1 | scenario | hard | text (AI suggests `npm install …` of an unknown package) |

Bank invariants (unique ids, one correct option, severities, easy < 25 %)
hold automatically; the section test asserts every `[[quiz:id]]` in the
E65 MDX resolves and every id in the manifest is embedded exactly once.

### UI (small, tested)

- `src/lib/academy/difficulty.ts` — `difficultyLabel("beginner"|"advanced"|null)`
  → `"pre každého" | "pre odborníkov" | null` for articles; lessons keep
  `"začiatočník" | "pokročilý"` via `lessonDifficultyLabel`. Fixes the
  existing wart where cards print the raw English DB value.
- `EntryCard` (`AcademyIndex.tsx`), the archive card (`AcademyArchive.tsx`)
  and the entry header (`AcademyEntryPage.tsx`) show the label for
  articles when `difficulty` is set.
- `filterAcademy` gains `difficulty: "all" | "beginner" | "advanced"`
  (null-difficulty items match every lane). `AcademyArchive` renders a
  lane toggle (`Všetko / Pre každého / Pre odborníkov`,
  `data-testid="academy-archive-lane-<value>"`) only when ≥ 1 item in the
  archive carries a difficulty.
- `CATEGORY_VISUALS` + `CategoryIllustration` gain the new slug (glyph 🧭,
  indigo gradient, short label "ai bezpečnosť").

### SEO / discovery surfaces

- `scripts/generate-sitemap.mjs`: category slug appended, pillar slug in
  `PILLAR_SLUGS`; `src/lib/blog/pillar-slugs.ts` mirrored.
  `public/sitemap.xml` regenerated with prod env (`set -a; source .env`).
  Per-article URLs appear after the SQL runs **and** the next build.
- `public/robots.txt`: no change (verified by the existing contract test).
- `public/llms.txt`: rewritten to current reality — `/academy` (not
  `/courses`), `/docs`, `/tests`, `/sablony`, 10-question test, no
  "kvíz", plus the new section.
- `functions/_lib/scam-chat/route-catalog.ts`: entry for the category
  page so the assistant can point readers there. `npm run rag:index` is
  an owner op after merge (new MDX → Vectorize).

### Docs & editorial artefacts

- `src/content/docs/index.ts` (`akademia`, `kurzy`): mention the section
  and the two lanes.
- `CHANGELOG.md` `[Unreleased] → Pridané` (Slovak, user-facing).
- `src/content/blog/README.md`: `difficulty` key, backfill generator.
- `tasks/topic-content-map.md`, `tasks/blog/{keyword-map,link-graph,editorial-calendar}.md`:
  P12 + C81–C90 rows.
- `tasks/stories/E65-ai-safety-content.md` (E65.1–E65.9) + row in
  `tasks/README.md` Active plans; `README.md` Learn section mentions AI.
- `docs/superpowers/plans/2026-09-10-E65-ai-safety-content.md` (this
  spec's implementation plan).

### Tests (Vitest)

| File | Asserts |
|---|---|
| `tests/content/blog-frontmatter.test.ts` (new) | every MDX parses; required keys; `difficulty` ∈ {beginner, advanced}; `category_slug` ∈ migration seed list; every source URL parses |
| `tests/content/ai-safety-section.test.ts` (new) | manifest ↔ files; word bands; ≥ sources; no banned phrases / "kvíz" / "SubenAI"; cluster→pillar + pillar→cluster links; every `/academy/<slug>` link resolves to an MDX or course slug; every `[[quiz:id]]` resolves and each manifest quiz id is embedded once; pillar in both `PILLAR_SLUGS`; category in migration, `DEPLOY_SETUP.sql`, sitemap script, `CATEGORY_VISUALS`, illustration map |
| `tests/scripts/generate-blog-backfill.test.ts` (new) | SQL contains every manifest slug, `ON CONFLICT (slug) DO UPDATE`, lane + pillar subselects, dollar-quote safety, deterministic output |
| `tests/lib/academy/filter.test.ts` (extend) | lane filter semantics incl. null |
| `tests/lib/academy/difficulty.test.ts` (new) | label mapping |
| `tests/components/academy/{AcademyIndex,AcademyArchive,AcademyEntryPage}.test.tsx` | Slovak labels; toggle appears only with lanes; toggle filters |
| `tests/seo/sitemap-robots.test.ts` (extend) | category URL present |
| existing gates | `courses-schema`, `academy-lesson-quality`, `bank-invariants`, `claims`, `course-to-row` golden |

### Deploy

1. Commits on `feature/E65-ai-safety-content` (one logical change each),
   lint 0/0, `npm test`, `npm run build` green, sitemap regenerated with
   prod env.
2. Push, PR, GHAS (CodeQL) inspected, auto-merge (squash). CF Pages
   deploys `main` → subenai.sk.
3. Owner runs, in the prod Supabase SQL editor, in this order:
   `20260910100000_blog_category_ai_safety.sql` →
   `supabase/backfills/20260910_ai_safety_articles.sql` →
   `supabase/backfills/20260628_academy_import_lessons.sql` (regenerated,
   idempotent; also carries the 8 pending video lessons). Then
   `npm run rag:index` and a redeploy (or the next merge) so sitemap +
   RSS pick up the article URLs.
4. Live verification: category page + articles render, lane toggle
   works, quiz blocks answer, sitemap lists the category, robots
   unchanged. Until step 3 runs, the category page renders the empty
   state and the section is "code-deployed, content pending" — reported
   as such, not as done.

## Risks

- **Fact accuracy of incidents** — mitigated by sourced rows with fetched
  URLs and a review pass over every article before commit.
- **Bank difficulty ratio** — 12 medium/hard items keep easy < 25 %.
- **Lesson re-categorisation** changes 2 live rows' category on SQL
  re-run — intended, idempotent.
- **Sitemap regeneration needs prod env** in the worktree — `.env` copied
  from the main checkout (gitignored, never printed).
