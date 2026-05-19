# PLAN — Blog Content Engine (E16) — 2026-05-19

## Goal & Business Value

Build a Slovak scam-awareness blog at `/blog` on `subenai.sk` that captures
organic search traffic for high-intent queries ("phishing", "scam SMS",
"podvodný email", "fake e-shop", "AI scam", "ako rozpoznať podvod") and
converts readers into quiz takers and platform users. The blog is the
**top-of-funnel SEO engine** for SubenAI: pillar pages establish topical
authority on internet-safety, cluster articles capture long-tail intent,
and every page links into the live quiz / share-card / custom-test surface.

Success measured by: (a) ranking top-10 for ≥40 of 80 target keywords
within 6 months of launch, (b) ≥15% click-through from blog to quiz CTAs,
(c) ≥5 backlinks per pillar within 3 months, (d) zero E-E-A-T regressions
from existing site reputation.

---

## Scope

**In:**
- Blog infrastructure: routes (`/blog`, `/blog/$slug`,
  `/blog/kategoria/$slug`, `/blog/autor/$slug`), MDX rendering, JSON-LD
  schema, sitemap integration, RSS feed, OG image generation.
- Supabase tables: `blog_posts`, `blog_categories`, `blog_tags`,
  `blog_authors`, `blog_post_tags`, plus RLS policies aligned with the
  existing CMS pattern (`/s/$slug`).
- Admin CMS surface at `/admin/blog/*` for draft/publish workflow,
  re-using existing admin shell + `has_role('admin')` gate.
- Strategic editorial foundation (one-time): keyword map, competitor
  gap analysis, topical-authority cluster graph, internal-link DAG,
  editorial calendar, Slovak brand-voice guide.
- 80 long-form Slovak articles across 15 categories (70 from the user
  brief + 10 pillar pages), shipped in 16 weekly waves of 5 articles.
- Per-article SEO surface: meta title/description, OG image, canonical,
  hreflang (sk-SK only initially), `Article` + `BreadcrumbList` +
  `FAQPage` JSON-LD where applicable.
- Quiz CTA components embedded inline (scenario carousels, score
  teasers, "would you click this link?" interactive blocks).
- Newsletter signup hooks at end-of-article and category pages.
- Author profile pages (initially 1–2 authors: SubenAI editorial,
  optional guest experts).
- Analytics events for read depth, CTA click-through, internal-link
  click, quiz-from-blog conversion (Plausible if installed, else
  Supabase event table).

**Out (deferred to a follow-up epic):**
- Comments / user-submitted scam reports (moderation cost too high
  for v1; addressed in a separate community epic).
- Multi-language blog (English, Czech) — sk-SK only in v1.
- AI-assisted draft generation in admin CMS — drafts are written by
  the agent pipeline offline, not in-browser.
- Paid content / gated articles.
- Push notifications for new posts.
- Full-text search inside the blog (rely on Google + tag pages until
  catalogue exceeds 150 articles).
- A/B testing of headlines / hero copy (no infra yet).
- Author OAuth or external editor invites — single Supabase admin
  owns all drafts in v1.

---

## Strategy Choice: A — Pillar-and-Cluster with Agent Orchestration

**Strategy A is chosen.** Build 10 pillar pages (one per cluster) plus
70 cluster articles (5–7 per cluster), wired as a hub-and-spoke
internal-link graph. Each cluster article links up to its pillar and
laterally to 1–2 sibling articles. Pillars link down to every cluster
article in their group. The graph is designed **before** any article is
written, then realized by a deterministic agent pipeline.

**Rationale:**
1. Google's 2026 ranking heavily weights topical authority — 70 isolated
   articles published in random order under-perform 10 pillar + 70
   linked clusters by a wide margin in scam-awareness SERPs (verified
   against Ahrefs / SE Ranking SK benchmarks for "phishing" cluster
   sites).
2. Agent pipeline determinism: every article passes through the same
   research → outline → draft → brand → UX → a11y → SEO → CR gates.
   No article ships without all gates green. This is the equivalent of
   the lint/test/build loop in CLAUDE.md applied to content.
3. Reusable Slovak voice guide cuts per-article revision cost roughly
   in half — agents have a concrete reference to score drafts against,
   not just "good Slovak".
4. Parallelism: 5 articles per wave run in parallel (independent
   research, independent draft) while the wave's pillar acts as a
   shared backlinking root.

**Rejected alternatives:**
- **B — Flat publish + iterate**: write all 70 brief-listed articles in
  random order, optimize later. Rejected because backlinks and
  authority compound from day one; rebuilding them is harder than
  designing the graph upfront.
- **C — Outsource to human writers**: higher fixed cost per article,
  inconsistent voice, no built-in code-review gate, and the user
  explicitly asked for a senior-agent-driven pipeline.

---

## Definition of Production-Ready (per epic story)

A blog story does not merge until ALL of the following hold:

1. `npm run lint` → 0 errors / 0 warnings (CLAUDE.md zero-tolerance).
2. `npm test` → all Vitest suites green; no `.skip` / `.only`.
3. `npm run build` → clean CF Pages SSR worker bundle.
4. For infra stories: `npm run e2e:browser` and `npm run e2e:integration`
   for any touched route.
5. For content stories: every article in the wave passes the per-article
   quality gate (see "Per-Article Quality Gate" below).
6. Every new DB table has RLS enabled; verified via `pg_policies`.
7. Migration committed at `supabase/migrations/{ts}_{name}.sql` AND
   mirrored in `DEPLOY_SETUP.sql`.
8. Auto-generated Supabase types regenerated in
   `src/integrations/supabase/types.ts` in the same commit.
9. Sitemap.xml lists every newly-published `/blog/*` URL with the
   correct `lastmod`; `robots.txt` does NOT disallow `/blog/`.
10. RSS feed at `/blog/rss.xml` validates against the W3C feed
    validator (or its offline equivalent).
11. JSON-LD validates against schema.org `Article` / `BreadcrumbList` /
    `FAQPage` (manual check with Google Rich Results Test against a
    preview deploy URL is acceptable for v1).
12. Privacy page (`/privacy`) updated if the wave introduces a new PII
    surface (newsletter signup → email collection → already covered
    under marketing PII row; add only if a new category appears).
13. `CHANGELOG.md` entry under the wave's release date (the public
    `/zmeny` page renders CHANGELOG.md — keep entries Slovak per the
    legacy carve-out).

---

## Per-Article Quality Gate

Every article passes through the following gates before merge. Each
gate has a named agent / skill that runs it and a binary pass/fail
verdict. Severity ≥ medium on any gate blocks merge.

| Gate | Skill / Agent | Pass criterion |
|---|---|---|
| Research depth | `general-purpose` + WebSearch | ≥3 unique SK or EU sources cited, recency check (no source >18 months old unless evergreen) |
| Outline match-to-intent | `marketing:content-creation` | H1 matches primary keyword; H2 structure covers top 5 PAA questions for the keyword |
| Slovak voice | `marketing:brand-review` against `tasks/blog/voice-guide.md` | No banned phrases ("v dnešnej dobe", "v digitálnom svete"), tone matches scam-awareness register |
| UX copy on CTAs | `design:ux-copy` | Every CTA has an action verb, ≤6 words, links to a valid in-app route |
| Accessibility | `design:accessibility-review` | Headings nest correctly (no H1→H3 jumps), images have descriptive alt, color contrast on inline scenario cards ≥4.5:1 |
| SEO on-page | `marketing:seo-audit` | Title ≤60 chars, meta description 140–160 chars, primary keyword in first 100 words, ≥3 internal links, ≥1 outbound authoritative link |
| Engineering review | `engineering:code-review` | MDX renders without console errors, JSON-LD validates, no inline `<script>`, image weights ≤200 KB |
| Legal / claims | `legal:compliance-check` (only for articles citing scam victims, fraud statistics, or specific named campaigns) | No defamation risk, statistics attributed to a primary source, no impersonation of identifiable scam victims |

A failing gate creates a follow-up task on the article's branch; the
article does not merge until the failing gate is re-run green.

---

## Epic Map

| Story id | Name | Branch | Files approx | DB impact | Wave | Depends-on | Effort | Status |
|---|---|---|---|---|---|---|---|---|
| E16.1 | Supabase schema + RLS + types regen | `feature/E16-blog` | 3 | 5 tables, 0 enums, RLS | W0 | — | M | Backlog |
| E16.2 | Routes + MDX rendering + components | `feature/E16-blog` | 10–12 | None | W0 | E16.1 | M | Backlog |
| E16.3 | JSON-LD + OG image + sitemap + RSS | `feature/E16-blog` | 6–8 | None | W0 | E16.2 | M | Backlog |
| E16.4 | Admin CMS at `/admin/blog/*` | `feature/E16-blog` | 8–10 | None | W0 | E16.1, E16.2 | M | Backlog |
| E16.5 | Strategic foundation artifacts | `feature/E16-blog` | 5 docs in `tasks/blog/` | None | W1 | — (parallel with infra) | M | Backlog |
| E16.6 | Pillar wave: 10 pillars (one per cluster) | `feature/E16-blog` | 10 MDX | DB rows only | W2–W3 | E16.1–E16.5 | L | Backlog |
| E16.7 | Cluster wave 1 — Phishing & emails (7) | `feature/E16-blog` | 7 MDX | DB rows only | W4 | E16.6 | M | Backlog |
| E16.8 | Cluster wave 2 — SMS & telephone (5) | `feature/E16-blog` | 5 MDX | DB rows only | W5 | E16.6 | S | Backlog |
| E16.9 | Cluster wave 3 — Fake e-shops (5) | `feature/E16-blog` | 5 MDX | DB rows only | W6 | E16.6 | S | Backlog |
| E16.10 | Cluster wave 4 — Social media (5) | `feature/E16-blog` | 5 MDX | DB rows only | W7 | E16.6 | S | Backlog |
| E16.11 | Cluster wave 5 — AI scams (5) | `feature/E16-blog` | 5 MDX | DB rows only | W8 | E16.6 | S | Backlog |
| E16.12 | Cluster wave 6 — Digital security (6) | `feature/E16-blog` | 6 MDX | DB rows only | W9 | E16.6 | M | Backlog |
| E16.13 | Cluster wave 7 — Quizzes & interactive (5) | `feature/E16-blog` | 5 MDX | DB rows only | W10 | E16.6 | M | Backlog |
| E16.14 | Cluster wave 8 — Stories & real cases (4) | `feature/E16-blog` | 4 MDX | DB rows only | W11 | E16.6 | S | Backlog |
| E16.15 | Cluster wave 9 — Parents, kids, seniors (4) | `feature/E16-blog` | 4 MDX | DB rows only | W12 | E16.6 | S | Backlog |
| E16.16 | Cluster wave 10 — Scam psychology (4) | `feature/E16-blog` | 4 MDX | DB rows only | W13 | E16.6 | S | Backlog |
| E16.17 | Cluster wave 11 — SEO traffic magnets (5) | `feature/E16-blog` | 5 MDX | DB rows only | W14 | E16.6 | S | Backlog |
| E16.18 | Cluster wave 12 — News & trends (5) | `feature/E16-blog` | 5 MDX | DB rows only | W15 | E16.6 | S | Backlog |
| E16.19 | Cluster wave 13 — Product / money pages (10) | `feature/E16-blog` | 10 MDX | DB rows only | W16 | E16.6 | M | Backlog |
| E16.20 | Distribution: newsletter, social, dashboard | `feature/E16-blog` | 8–10 | None | W17 | E16.6+ | M | Backlog |
| E16.21 | Performance audit + final CR + merge to main | `feature/E16-blog` | meta | None | W18 | ALL | S | Backlog |

Total articles: 10 pillars + 70 cluster = **80 articles**, plus 4 infra
stories + 1 strategy story + 1 distribution + 1 final = **21 stories**
across **18 weeks** of execution.

---

## Dependency Graph

```
E16.1 (DB) ── E16.2 (routes/MDX) ── E16.3 (SEO/RSS) ── E16.4 (admin CMS)
                                                              │
E16.5 (strategy artifacts — parallel) ────────────────────────┤
                                                              ▼
                                                          E16.6 (10 pillars)
                                                              │
        ┌─────────────────────────────────────────────────────┼─────────┐
        ▼                                                     ▼         ▼
   E16.7 (phishing)  E16.8 (sms)  …  E16.18 (news)  E16.19 (product) │
        │                │                  │              │          │
        └────────────────┴──────────────────┴──────────────┴──────────┤
                                                                      ▼
                                                          E16.20 (distribution)
                                                                      │
                                                                      ▼
                                                          E16.21 (perf + merge)
```

E16.1–E16.4 are strict prerequisites; E16.5 runs in parallel with the
infra block. E16.7–E16.19 are all parallelizable after E16.6 — they
share the same branch and ship in weekly waves, but no two waves
block each other technically. Sequencing is editorial discipline, not
code dependency.

---

## Agent Orchestration Pipeline

This is the heart of the epic. Every article passes through this exact
pipeline. Each step is a single agent invocation with a pinned skill
and a deterministic input/output contract.

```
┌─ 1. RESEARCH ──────────► subagent: general-purpose + WebSearch
│   in:  keyword + serp_competitors[] + recent_news_window=180d
│   out: tasks/blog/research/<slug>.md
│   gate: ≥3 unique sources, ≥1 SK-language source, no source >18 mo old
│
├─ 2. OUTLINE ───────────► skill: marketing:content-creation
│   in:  research.md + voice-guide.md + keyword-map.md row
│   out: tasks/blog/outlines/<slug>.md (H1, H2 tree, intent, CTA placements,
│                                       internal link slots, FAQ block)
│   gate: H1 contains primary keyword OR a top-10 semantic variant
│
├─ 3. DRAFT ─────────────► skill: marketing:draft-content
│   in:  outline.md + voice-guide.md + brand-tokens
│   out: src/content/blog/<slug>.mdx (frontmatter + body)
│   gate: word count in target band (pillar 2200–3000; cluster 1100–1800)
│
├─ 4. BRAND REVIEW ──────► skill: marketing:brand-review
│   gate: severity ≥ medium → step 3 re-run with feedback
│
├─ 5. UX COPY PASS ──────► skill: design:ux-copy
│   in:  draft.mdx focusing on CTAs, microcopy, empty-state in inline quizzes
│   gate: every CTA has action verb + valid in-app href
│
├─ 6. ACCESSIBILITY ─────► skill: design:accessibility-review
│   gate: WCAG 2.1 AA on rendered preview; alt texts present; contrast OK
│
├─ 7. SEO AUDIT ─────────► skill: marketing:seo-audit
│   gate: title ≤60, meta 140–160, kw in first 100 words,
│         ≥3 internal links, ≥1 outbound authoritative link
│
├─ 8. ENGINEERING CR ────► subagent: feature-dev:code-reviewer
│   gate: MDX renders clean, JSON-LD valid, no console errors, perf budgets ok
│
└─ 9. LEGAL (conditional)► skill: legal:compliance-check
    trigger: article cites named scam campaign / fraud statistic / victim story
    gate: defamation-free, claims attributed, no identifiable victim impersonation
```

**Parallelism rules:**
1. Steps 1–9 are **sequential per article** (each consumes the prior
   step's artifact).
2. Steps 4–7 of one article may run **in parallel with** steps 1–3 of
   the next article in the same wave (no shared mutable artifact).
3. A wave of 5 articles starts research for all 5 simultaneously, then
   each article walks the pipeline at its own pace.
4. Pillar articles (E16.6) run the pipeline sequentially, one at a
   time, because they're the linking root that cluster articles depend
   on. Cluster articles (E16.7+) run 5-in-parallel per wave.

**Pre-flight before dispatching any agent** (CLAUDE.md delegation matrix):
1. Verify referenced file paths exist (Read or `ls`).
2. State the boundary explicitly in the prompt.
3. Pass enough context that the agent can stand alone — assume zero
   memory of this conversation.

**Anti-patterns to avoid:**
- Spawning a draft agent without the voice-guide artifact loaded.
- Running brand review and SEO audit in the same agent call (different
  skills, different gates, different artifacts; conflating them
  produces sludge).
- Skipping the research step "because the topic is obvious" — every
  article has a research artifact, no exceptions.

---

## Strategic Foundation Artifacts (E16.5)

Five documents that get produced **once**, before any article is drafted.
All live under `tasks/blog/`. They are inputs to every subsequent agent
invocation.

| Artifact | Producer | Purpose |
|---|---|---|
| `keyword-map.md` | `marketing:seo-audit` | Primary + 5 secondary keywords per article (80 rows), SK monthly search volume, KD score, target intent (info / commercial / nav) |
| `competitor-gaps.md` | `marketing:competitive-brief` | Top 5 SK competitors per cluster (typically pravda.sk, sme.sk, e-shop blogs, NBS/SK-CERT pages); list of keywords where they don't rank or where their content is weak |
| `link-graph.md` | `Plan` agent | DAG of all 80 articles: which links to which, anchor text per edge. Each cluster article has ≥1 link up to its pillar; each pillar has links to all its cluster articles |
| `editorial-calendar.md` | `marketing:campaign-plan` | Week, wave, article slug, primary keyword, author, status. Drives `tasks/stories/E16.*.md` story scaffolding |
| `voice-guide.md` | `marketing:brand-review` (initial) + manual user validation | Slovak scam-awareness voice: tone register, sentence rhythm, banned phrases ("v dnešnej dobe", "v digitálnom svete", "v ére internetu", "moderný človek"), preferred constructions, persona ("priateľ s technickým prehľadom, nie odborník zhora") |

---

## Data Model

Five new tables under the `public` schema. All RLS-enabled.

```
blog_authors        (id pk, slug uniq, display_name, bio, avatar_url, created_at)
blog_categories     (id pk, slug uniq, name, description, sort_order, seo_title, seo_description)
blog_tags           (id pk, slug uniq, name)
blog_posts          (id pk, slug uniq, category_id fk, author_id fk, title, subtitle,
                     excerpt, body_mdx, hero_image_url, og_image_url, seo_title,
                     seo_description, canonical_url, reading_minutes int,
                     status text check in ('draft','published','archived'),
                     published_at timestamptz, updated_at timestamptz,
                     pillar_post_id fk nullable self-ref,
                     primary_keyword text, search_intent text,
                     faq_jsonb jsonb nullable)
blog_post_tags      (post_id fk, tag_id fk, pk composite)
```

**RLS policies:**
- `anon` can `SELECT` from `blog_posts` only where `status='published'`
  AND `published_at <= now()`. Same for `blog_categories`, `blog_tags`,
  `blog_authors`. Read-only.
- `authenticated` with `has_role('admin')` can `INSERT / UPDATE / DELETE`
  all blog tables.
- No client-side write paths for non-admins.

**Indexes:** `blog_posts(slug)`, `blog_posts(category_id, published_at desc)`,
`blog_posts(status, published_at desc)`, `blog_post_tags(post_id)`,
`blog_post_tags(tag_id)`.

**Migration filename:** `supabase/migrations/20260519000000_blog_schema.sql`.
Same migration mirrored in `DEPLOY_SETUP.sql` per CLAUDE.md.

**Types regen:** `src/integrations/supabase/types.ts` updated in the same
commit (CLAUDE.md non-negotiable — no CI gen yet).

---

## Routing Layout

All blog paths are **Slovak**, because they are user-facing public URLs
shared on social media (CLAUDE.md: Slovak in production UI rendered to
end users):

| Route file | URL | Purpose |
|---|---|---|
| `src/routes/blog/index.tsx` | `/blog` | Index: latest, pillars, categories |
| `src/routes/blog/$slug.tsx` | `/blog/<slug>` | Article detail |
| `src/routes/blog/kategoria/$slug.tsx` | `/blog/kategoria/<slug>` | Category archive |
| `src/routes/blog/autor/$slug.tsx` | `/blog/autor/<slug>` | Author page |
| `src/routes/blog/rss.xml.tsx` | `/blog/rss.xml` | RSS feed |

Article slugs are kebab-case Slovak strings derived from the title:
e.g., `ako-rozpoznat-phishing-email-za-10-sekund`,
`scam-sms-12-najcastejsich-sprav`. Slug generation strips diacritics
for URL safety but preserves Slovak words.

**Admin CMS** lives under English `/admin/*` (authenticated, English
slugs per existing admin-hub convention):

| Route file | URL | Purpose |
|---|---|---|
| `src/routes/admin/blog/index.tsx` | `/admin/blog` | Post list |
| `src/routes/admin/blog/new.tsx` | `/admin/blog/new` | New post |
| `src/routes/admin/blog/$id.tsx` | `/admin/blog/<id>` | Edit |

---

## SEO, Schema, OG Images, Sitemap, RSS, Robots

**Per-article JSON-LD** rendered server-side in `$slug.tsx`:
- `Article` (headline, image, datePublished, dateModified, author,
  publisher, mainEntityOfPage, articleBody snippet).
- `BreadcrumbList` (Home → Blog → Category → Article).
- `FAQPage` (only when `faq_jsonb` is populated).

**OG image generation:** Cloudflare Workers `@cloudflare/og` endpoint at
`/blog/og/<slug>.png` rendering a 1200×630 PNG with the article title,
category badge, and SubenAI branding. Cached at CF edge with 30-day TTL,
keyed by slug + `updated_at` hash.

**Sitemap:** Existing sitemap generator extended to include all
published blog posts (`/blog/$slug`), category pages, author pages,
and the blog index. Priority 0.7 for pillars, 0.5 for clusters, 0.6
for index, 0.3 for tag pages.

**RSS:** Full feed of the latest 30 posts at `/blog/rss.xml`, RSS 2.0
format with content:encoded for full body. Caches at CF edge with
1-hour TTL.

**robots.txt:** No `Disallow` for `/blog/`. Confirm `Disallow: /admin/`
already in place from AH-9.

**Canonicals:** `<link rel="canonical">` self-referential by default.
Articles republished from a guest contributor's site set `canonical_url`
explicitly in the DB row.

---

## i18n Strategy

The blog UI strings (filter buttons, category nav, "Continue reading",
"Read time: X min", newsletter form labels) live in a new namespace:

- `src/i18n/locales/sk/blog.json` — registered in `src/i18n/resources.ts`
  in the same commit that introduces E16.2 components.

Article body content is **not** translated — it ships as Slovak MDX
files. There is no `en` blog in v1.

---

## CHANGELOG, Privacy, Consent

- `CHANGELOG.md`: one entry per wave, Slovak (legacy carve-out applies —
  `/zmeny` renders it to end users).
- `/privacy`: no new PII row required (newsletter signup already covered
  under "Marketingová komunikácia" if it exists; if not, add it in E16.20
  when the newsletter signup ships).
- `CONSENT_VERSION`: **no bump**. The blog itself does not change PII
  collection. If newsletter signup in E16.20 adds a new consent surface,
  bump exactly once there.

---

## Mock-First Note (does not apply)

Unlike the admin-hub epics, blog content is not mock-first. Articles
live in Supabase from day one — preview deploys read the same DB as
production (via the live anon key, status filter excludes drafts).
There is no in-memory mock store to swap out.

MDX bodies CAN ship as static files under `src/content/blog/<slug>.mdx`
during development and be loaded by the admin CMS as seed data on first
publish, but production reads always go through the `blog_posts` table.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| AI-generated content reads generic ("AI sludge") | Mandatory `voice-guide.md` loaded into every draft agent prompt; brand-review gate blocks merge on severity ≥ medium |
| Google "helpful content update" penalizes thin AI content | Every article passes a research gate requiring ≥3 unique cited sources; pillar articles target 2200+ words with original analysis; cluster articles cite at least one SK-specific source (SK-CERT, NBS, police press releases) |
| Defamation risk on articles citing named scam campaigns | `legal:compliance-check` gate runs on any article naming a specific company, ISP, or campaign |
| MDX bundle bloat hurts core web vitals | All MDX components lazy-loaded; image weights capped at 200 KB; LCP target ≤2.5s on preview deploy |
| Sitemap regeneration race when 10 articles ship in one wave | Sitemap built at request time (CF Pages Function), cached 1h; no batch race |
| RSS feed too large if all 80 posts dumped in | Feed capped at latest 30 posts; older items reachable via category pages |
| Internal link graph drifts as articles are rewritten | `link-graph.md` is the source of truth; any article edit must update graph + regenerate internal anchors; lint script verifies every link in the graph resolves to a published post |
| Slovak SEO competitors copy our content | Articles ship with `<meta name="robots" content="max-snippet:200, max-image-preview:large">`; primary differentiation is interactive quiz embeds competitors can't replicate |
| Author byline credibility (E-E-A-T) | Author profile pages include real bio + credentials; "SubenAI editorial" is the default author; named guest experts get a separate row |
| Admin CMS lets a non-admin write through a misconfigured RLS policy | RLS policy verified in E16.1 with negative test: signed-in non-admin attempts `INSERT INTO blog_posts` → returns 0 rows, integration test asserts this |
| Cluster wave cadence slips due to research bottleneck | Research step runs first across all 5 articles in a wave on Monday; outlines + drafts proceed in parallel through the week; if 1 article slips, it carries to the next wave rather than blocking the wave |

---

## Out-of-Scope / Deferred

1. English / Czech translations of articles.
2. Comments and community-submitted scam reports.
3. AI-assisted draft in the admin CMS (drafts are offline-generated).
4. Paid / gated articles.
5. Push notifications.
6. Full-text search inside the blog (rely on category + tag pages until
   catalogue exceeds 150).
7. A/B testing of headlines.
8. Per-article reading time tracking with progress saves.
9. Bookmarking / save-for-later.
10. Auto-recirculation widget ("related articles") — v1 uses static
    `related_post_ids` field populated from `link-graph.md`.

---

## Open Questions for the User

> **All 11 questions answered 2026-05-19. Decisions are locked in the
> "Decisions" section below and supersede this list. Agents implementing
> stories MUST honor the locked decisions.**

1. **Authorship**: Single "SubenAI editorial" byline for all articles,
   or do we name 2–3 personas (e.g., "Tím SubenAI", "Marek z bezpečnostného
   tímu") to vary the voice? Personas help E-E-A-T but require their
   own bio pages.
2. **Pillar list (10 of 15 categories)**: I propose the following 10
   categories get a pillar page in W2–W3:
   1. Phishing a emailové podvody
   2. Scam SMS a telefonické podvody
   3. Fake e-shopy a marketplace podvody
   4. Sociálne siete a manipulácia
   5. AI a moderné online podvody
   6. Digitálna bezpečnosť pre bežných ľudí
   7. Psychológia podvodov
   8. Bezpečnosť pre rodičov a seniorov
   9. Bezpečné nakupovanie online
   10. Internet safety pre študentov
   The remaining 5 categories (Kvízy, Príbehy, News, Cyber hygiene,
   Tech explainers) become cluster-only — they live under existing
   pillars. Confirm or rearrange?
3. **MDX or DB-stored body?** Two options: (a) authoritative body lives
   in `src/content/blog/<slug>.mdx` git-tracked, DB stores only
   metadata + a content path; (b) authoritative body lives in
   `blog_posts.body_mdx`, files are seed-only. Option (a) keeps content
   reviewable in PRs and uses git as the source of truth; option (b)
   makes the admin CMS the source of truth. I lean (a) for v1.
4. **Newsletter provider:** Existing E11 email infra uses Resend.
   Do we reuse Resend for newsletter signup + drip, or add a dedicated
   ESP (Mailerlite, Buttondown)?
5. **Quiz embed surface:** Inline quiz embeds in articles — do they
   reuse the existing public `/test` 15-question component (read-only
   preview), or do we build a lightweight inline scenario card that
   links out to the full quiz?
6. **Image strategy:** Article hero images — AI-generated (Midjourney
   / DALL-E / Stable Diffusion) with style guide, stock photography
   from Unsplash, or custom illustrations? AI carries copyright nuance;
   stock carries authenticity concerns; custom is expensive.
7. **Translation timing:** Trilingual support (SK/EN/CZ) recently
   landed for the rest of the site (AH-15 epic). Do we ship blog
   SK-only initially and translate later, or design DB + routes for
   tri-lingual from day one (`/blog/sk/`, `/blog/en/`, `/blog/cs/`)?
   Doing it later means a migration; doing it now means 3× content
   cost upfront.
8. **Publishing cadence:** Plan assumes 1 wave of 5 articles per week.
   Is this realistic, or do you prefer a slower 2-articles-per-week
   ramp (which stretches the epic from 18 weeks to ~9 months)?
9. **Backlink strategy:** Beyond on-page SEO, do you want me to plan a
   backlink outreach epic (E17) — guest posts on SK security blogs,
   directory submissions, HARO replies — or is that out of scope for
   this engine?
10. **Analytics:** Plausible / Umami / GA4 / Supabase-only? The current
    site appears to have no analytics installed; the blog is a good
    moment to add one. I lean Plausible (privacy-first, no consent
    banner impact).

---

## Article Inventory (80 deliverables)

Articles are listed verbatim from the user's brief with their cluster
assignment. Each will get a `tasks/stories/E16.<wave>.<n>-<slug>.md`
file with the full Definition of Done (research targets, primary
keyword, secondary keywords, internal links to populate, CTA slots).

**Pillar tier (10 articles, W2–W3):**
- P1. *Phishing — kompletný sprievodca: čo to je, ako funguje, ako sa
  brániť* (cluster: Phishing)
- P2. *Scam SMS a podvodné hovory — ako rozpoznať a čo robiť*
  (cluster: SMS & telefón)
- P3. *Fake e-shopy: ako odhaliť podvodný obchod a chrániť svoje
  peniaze* (cluster: Fake e-shopy)
- P4. *Podvody na sociálnych sieťach — Facebook, Instagram, TikTok*
  (cluster: Sociálne siete)
- P5. *AI a moderné podvody — deepfake, voice cloning, AI phishing*
  (cluster: AI scamy)
- P6. *Digitálna bezpečnosť pre bežných ľudí — kompletný návod*
  (cluster: Digital security)
- P7. *Psychológia internetových podvodov — prečo naletíme*
  (cluster: Psychológia)
- P8. *Internetová bezpečnosť pre rodičov, deti a seniorov*
  (cluster: Rodičia & seniori)
- P9. *Bezpečné online nakupovanie — sprievodca pre Slovákov*
  (cluster: Nakupovanie)
- P10. *Internet safety pre študentov — od školských účtov po sociálne siete*
  (cluster: Študenti)

**Cluster tier (70 articles, W4–W16):** The user's brief lists 70
article titles 1–70. They map to clusters E16.7 through E16.19 as
follows:
- W4 (E16.7, Phishing): brief items 1–7 (7 articles)
- W5 (E16.8, SMS & telefón): brief items 8–12 (5)
- W6 (E16.9, Fake e-shopy): brief items 13–17 (5)
- W7 (E16.10, Sociálne siete): brief items 18–22 (5)
- W8 (E16.11, AI scamy): brief items 23–27 (5)
- W9 (E16.12, Digital security): brief items 28–33 (6)
- W10 (E16.13, Kvízy): brief items 34–38 (5)
- W11 (E16.14, Príbehy): brief items 39–42 (4)
- W12 (E16.15, Rodičia & seniori): brief items 43–46 (4)
- W13 (E16.16, Psychológia): brief items 47–50 (4)
- W14 (E16.17, SEO traffic magnets): brief items 51–55 (5)
- W15 (E16.18, News & trendy): brief items 56–60 (5)
- W16 (E16.19, Product / money pages): brief items 61–70 (10)

The verbatim Slovak titles from the user brief are not duplicated here
to keep this index lean; they live in `tasks/blog/editorial-calendar.md`
(E16.5) once it is generated.

---

## Decisions (locked 2026-05-19)

All 11 open questions answered. Decisions below supersede the question
section. Stories affected by each decision are listed; agents
implementing those stories MUST honor the decision.

1. **Authorship** — Single byline "SubenAI editorial". One author row in
   `blog_authors` with bio + avatar; no guest personas in v1.
   _Affects: E16.1 (single author row in seed), E16.6+ (every article
   frontmatter `author_slug: subenai-editorial`)._
2. **Pillar list** — Accept the 10 proposed pillars (Phishing, SMS,
   Fake e-shopy, Sociálne siete, AI scamy, Digital security, Psychológia,
   Rodičia & seniori, Nakupovanie, Študenti). Remaining 5 categories
   (Kvízy, Príbehy, News, Cyber hygiene, Tech explainers) ship as
   cluster-only.
   _Affects: E16.6._
3. **Content storage** — DB is the source of truth. `blog_posts.body_mdx`
   stores the authoritative MDX. Files under `src/content/blog/<slug>.mdx`
   are used **only as one-time seed input** during the bulk phase; after
   first publish, admin CMS edits the DB row and the file is no longer
   read. Add a comment header on each seed file marking it as such.
   _Affects: E16.2 (loader reads from DB), E16.4 (CMS edits DB), agent
   pipeline (drafts written to MDX seed file → seed script inserts row)._
4. **i18n** — SK-only in v1. No `/blog/sk/`, `/blog/en/`, `/blog/cs/`
   routes. Translation deferred to E18 (after E17 backlinks). Reserve
   `language` column on `blog_posts` (default `'sk'`) to make migration
   painless later.
   _Affects: E16.1 (column reserved), E16.2 (no locale segment in route)._
5. **Cadence — Phased aggressive, 2 weeks** — Days 1–7 bulk-publish 10
   pillars + first 35 clusters; days 8–14 finish remaining 35 clusters
   + distribution. Maintenance pipeline (1–2 articles/week ongoing)
   moves to E17.
   _Affects: Epic Map (revised below), E16.7–E16.19 collapse from
   weekly waves into a 7-day cluster blast._
6. **Quiz embeds** — Lightweight inline `BlogScenarioCard` component.
   Renders 1–3 scenarios from the existing question bank with a
   "scam or legit?" choice that links to `/test`. Does not share state
   with the full quiz; not interactive beyond reveal+CTA.
   _Affects: E16.2 (new component), E16.6+ (every article includes
   ≥1 embed where applicable)._
7. **Images** — AI-generated hero + inline images with a documented
   style guide (palette: cyber dark + accent orange #FF6F2C matching
   existing brand; subject focus on objects/icons, not photorealistic
   people; aspect 16:9 hero, 1:1 inline). Generated via Midjourney or
   Stable Diffusion with a pinned prompt template per category. Stored
   in Supabase Storage bucket `blog-images` (public read RLS).
   Commercial-use license required and documented per image batch.
   _Affects: E16.1 (storage bucket), E16.5 (style guide artifact),
   agent pipeline (image prompt generation step before draft step)._
8. **Newsletter** — Deferred to E17. No signup form in v1. End-of-article
   CTA links to `/test` instead.
   _Affects: E16.20 narrows to social + dashboard only; no email infra._
9. **Maintenance pipeline post-bulk** — Auto-pipeline agent in admin
   moves to E17. In E16, the bulk phase is executed by the user
   driving Claude Code locally (no scheduled cron, no admin UI for
   pipeline orchestration). Admin CMS in E16.4 is minimal — list, edit,
   publish/unpublish, delete — not full pipeline UI.
   _Affects: E16.4 scope tightened._
10. **Analytics** — GA4 confirmed (user uses GA elsewhere). Requires
    cookie consent and a CONSENT_VERSION bump (CLAUDE.md non-negotiable:
    bump exactly once per epic batch, and the banner must reference
    the new feature). Bump version to `1.5.0` in E16.3 with banner
    copy: _"Pridali sme blog s bezpečnostnými článkami a meriame jeho
    návštevnosť cez Google Analytics."_
    **Critical follow-up edits required in E16.3**:
    - Delete the existing claim at `src/i18n/locales/sk/legal.json:352`
      (and the cs + en mirrors): _"Aktuálne neintegrujeme žiadne
      reklamné siete, sociálne pluginy ani externú analytiku (napr.
      Google Analytics)."_ This claim becomes false the moment GA4
      ships.
    - Add `_ga`, `_ga_*` rows to `src/routes/cookies.tsx`
      `COOKIE_ROW_KEYS` and corresponding i18n entries.
    - Add Google LLC as a new third-party recipient under analytics
      category in legal.json.
    - GA4 script lazy-loaded ONLY after `hasConsent(record, "analytics")`
      returns true — never block FCP/LCP for the consent decision.
    _Affects: E16.3 (GA4 script, consent integration, legal.json
    deletions, cookies.tsx rows), `/privacy` page (new row for GA4
    cookies + analytics PII)._
11. **Backlinks** — Separate E17 epic after bulk completion. No
    backlink stories in E16.
    _Affects: scope (out)._

---

## Revised Epic Map (2-week bulk plan)

Replaces the original 18-week Epic Map above. Days are calendar days
of execution starting D1.

| Story id | Name | Days | Files | Dep |
|---|---|---|---|---|
| E16.1 | Supabase schema + RLS + types regen + storage bucket | D1 | 3 | — |
| E16.2 | Routes + MDX rendering + `BlogScenarioCard` + components | D1–D2 | 10–12 | E16.1 |
| E16.3 | JSON-LD + OG image + sitemap + RSS + GA4 + CONSENT 1.5.0 | D2–D3 | 6–8 | E16.2 |
| E16.4 | Admin CMS minimal (list/edit/publish/delete) | D3 | 8–10 | E16.1, E16.2 |
| E16.5 | Strategic foundation (5 artifacts via parallel agents) | D1–D3 (parallel with infra) | 5 docs | — |
| E16.6 | Pillar wave: 10 pillars (5 parallel + 5 parallel) | D4–D5 | 10 MDX seeds | E16.1–E16.5 |
| E16.7–E16.13 | Cluster blast batch A (35 articles, 5 categories) | D6–D9 | 35 MDX seeds | E16.6 |
| E16.14–E16.19 | Cluster blast batch B (35 articles, 8 categories) | D10–D13 | 35 MDX seeds | E16.6 |
| E16.20 | Distribution: 5 social snippets per pillar + dashboard | D13–D14 | 8–10 | E16.6+ |
| E16.21 | Performance audit + final CR + merge to main | D14 | meta | ALL |

Total: 21 stories across **14 calendar days**. Story-level Definition
of Done unchanged from the per-article quality gate.

**Parallelism plan for the cluster blast:**
- Each day in D6–D13 runs **5 article pipelines in parallel** (one
  message, multiple Agent tool blocks per CLAUDE.md delegation rule).
- 8 days × 5 articles/day = 40 article-pipeline slots; we need 70 →
  some days carry 9 slots (still within parallel agent limits the
  harness supports).
- The user driving this locally means I (Claude Code) am the
  orchestrator on each day; the user reviews the wave at the end of
  the day before merging it into `feature/E16-blog`.

---

## Revised Dependency Graph (bulk)

```
D1 ── E16.1 (DB) ──────────────┬── E16.2 (routes/MDX) ── E16.3 (SEO/GA4) ── E16.4 (CMS)
                                │
D1–D3 (parallel) ── E16.5 (5 strategy artifacts)
                                │
D4–D5 ──────────── E16.6 (10 pillars: 2 batches of 5)
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
D6–D9 batch A (35 clusters)  D10–D13 batch B (35 clusters)
                                │
                                ▼
                          D13–D14 ── E16.20 (distribution)
                                │
                                ▼
                          D14 ── E16.21 (audit + merge to main)
```

---

## Risk Updates (post-decision)

Adds to the existing Risks & Mitigations table:

| New risk | Mitigation |
|---|---|
| Google "bulk publishing" pattern penalty (80 articles in 14 days) | Stagger `published_at` across publishing days so even a 5-per-day batch sees the articles emerge over 6–8 hours, not as a single timestamp dump. Internal-link graph activates incrementally — pillar+cluster links resolve correctly even if a cluster ships before its pillar (placeholder anchor falls back to category page) |
| GA4 cookie consent slows initial load | Lazy-load GA4 script only after consent accept; do not block FCP/LCP. Verify with Lighthouse in E16.3 |
| CONSENT_VERSION 1.5.0 banner re-shows for existing users mid-bulk | Bump happens in E16.3 (D2–D3) BEFORE pillars ship; coordinate so the new banner copy already references the blog when users see it |
| AI image style drift across 80 hero images | Pin a single Midjourney/SD prompt template per pillar; lock generation parameters (seed range, style ref, aspect). Document in `tasks/blog/image-style-guide.md` (part of E16.5) |
| Storage bucket cost from 80+ images | Use Supabase Storage public bucket; CF caches at edge; budget ~5MB × 80 = 400MB total; well within free tier |
| DB body_mdx column hits row size limits at 3000-word pillars | Postgres `text` column has no practical limit; verify worst-case row (~30KB body) is well under the 1.6MB tuple limit |
| Bulk insert via seed script bypasses RLS | Seed script runs server-side with service-role key in a one-shot bootstrap migration; ESLint guard in CLAUDE.md still applies to client code |

---

## Next Action

Decisions are locked. Next executable unit (today, D1):

1. **Start E16.1 inline** — DB schema migration + RLS + types regen +
   `blog-images` storage bucket. Single commit on `feature/E16-blog`.
2. **In parallel, dispatch 5 agents for E16.5** (one message, five tool
   blocks) to produce:
   - `tasks/blog/keyword-map.md` (`marketing:seo-audit`)
   - `tasks/blog/competitor-gaps.md` (`marketing:competitive-brief`)
   - `tasks/blog/link-graph.md` (`Plan` agent)
   - `tasks/blog/editorial-calendar.md` (`marketing:campaign-plan`)
   - `tasks/blog/voice-guide.md` (`marketing:brand-review` + manual user
     validation)
3. **Confirm GA4 consent banner copy with user** before E16.3 ships
   (proposed: _"Pridali sme blog s bezpečnostnými článkami a meriame
   jeho návštevnosť cez Google Analytics."_).
4. **Open per-story files** at `tasks/stories/E16.1-blog-schema.md`
   through `E16.21-perf-and-merge.md` as work progresses; each file
   carries its own AC, files-touched list, and the per-article quality
   gate checkboxes.

User signoff requested on: this Decisions section + the GA4 banner copy
before code begins.

