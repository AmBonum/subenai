# E44 — Appendix A: SEO + Marketing strategy for `/sablony`

**Owner:** Marketing-SEO subagent (skill: `marketing:seo-audit`).
**Date:** 2026-05-20.
**Scope:** Phase D of E44 — public, indexable template gallery at `/sablony` (hub)
and `/sablony/$slug` (spoke). This appendix is the canonical reference for
stories E44.13–E44.15.

> **Language rule reminder.** This document is English. Slovak appears only
> as **verbatim production copy strings** (headlines, meta tags, CTA labels,
> intro paragraphs, social posts) the implementation will paste into the
> codebase. Do not paraphrase those strings — copy them verbatim.

## TL;DR

`/sablony` is positioned as a **free, indexable library of awareness-test templates**
that doubles as a top-of-funnel SEO surface for the four highest-intent keyword
clusters subenai already partially owns: *test šablóny*, *kvíz šablóny*,
*phishing test pre firmu*, *šablóny pre školu*. The hub page targets the head
term ("test šablóny", "kvízové šablóny"); each `/sablony/$slug` page targets a
long-tail variant ("phishing test pre zamestnancov", "kvíz pre seniorov o
podvodoch"). We reuse the existing JSON-LD + sitemap + OG infrastructure built
for `/courses` and `/blog/$slug` — no new SEO primitives needed.

## 1. Target audience + intent map

| # | Segment                                       | Mental model when searching                                                     | Sample Slovak query                                | Dominant intent | Stage           |
|---|-----------------------------------------------|---------------------------------------------------------------------------------|----------------------------------------------------|-----------------|-----------------|
| 1 | SME owner / HR lead, 10–250 employees         | "I need to test my staff on phishing without paying for a vendor."             | *phishing test pre zamestnancov*, *bezpečnostný test pre firmu zdarma* | Commercial      | Consideration   |
| 2 | School teacher / IT coordinator               | "I want a 10-min quiz I can run on Friday with year-9 students."               | *kvíz o bezpečnosti na internete pre žiakov*       | Informational + commercial | Consideration |
| 3 | Senior club / library / municipal organiser   | "Something simple my members can take on a tablet, big buttons, Slovak."       | *test pre seniorov o internetových podvodoch*      | Informational   | Awareness       |
| 4 | Curious individual / cyber-awareness blogger  | "I want to see what kinds of online-fraud tests exist and link to a good one." | *test šablóny zadarmo*, *internet IQ kvíz šablóny* | Informational   | Awareness       |
| 5 | Internal subenai user (returning, logged-in)  | "I forked one before; where's the gallery again?"                              | *subenai šablóny*                                  | Navigational    | Retention       |

**Implication for content design.** The page must answer (a) "is this free?",
(b) "can I run it without an account?", (c) "is it Slovak and current?" — in
that order — within the first viewport. Segments 1 and 2 convert; segments 3
and 4 share. The CTA hierarchy reflects that: primary CTA = *Použiť šablónu*
(commercial), secondary = *Pozri ukážku* (informational).

## 2. Keyword cluster

**Primary head term:** *test šablóny* — moderate volume (est. 200–600/mo),
low–moderate difficulty (no entrenched competitor on this exact Slovak phrase;
generic "templates" sites in CZ/EN dominate but rank weak in SK).

**Cluster (hub-and-spoke):**

| # | Keyword                                          | Type      | Intent          | Est. difficulty | Maps to                              |
|---|--------------------------------------------------|-----------|-----------------|-----------------|--------------------------------------|
| 1 | test šablóny                                     | head      | commercial      | Easy            | `/sablony` (H1)                      |
| 2 | kvíz šablóny                                     | head      | commercial      | Easy            | `/sablony` (H1 variant)              |
| 3 | bezpečnostný test šablóna                        | mid-tail  | commercial      | Easy            | `/sablony` (H2 — category)           |
| 4 | phishing test pre zamestnancov                   | long-tail | commercial      | Moderate        | `/sablony/phishing-pre-zamestnancov` |
| 5 | phishing test pre firmu zadarmo                  | long-tail | commercial      | Moderate        | `/sablony/phishing-pre-zamestnancov` |
| 6 | kvíz o podvodoch pre seniorov                    | long-tail | informational   | Easy            | `/sablony/seniori-podvody`           |
| 7 | bezpečnosť na internete kvíz pre žiakov          | long-tail | informational   | Easy            | `/sablony/skola-zakladne-zruc`       |
| 8 | onboarding kvíz pre kolegov                      | long-tail | commercial      | Easy            | `/sablony/onboarding-kolegov`        |
| 9 | test o AI podvodoch deepfake                     | long-tail | informational   | Easy            | `/sablony/ai-deepfake`               |
| 10 | fake e-shop test                                | long-tail | informational   | Easy            | `/sablony/fake-eshopy`               |
| 11 | malvertising test                               | long-tail | informational   | Easy            | `/sablony/malvertising`              |
| 12 | šablóna kvízu pre školy                         | mid-tail  | commercial      | Easy            | `/sablony` (H2 — category)           |
| 13 | šablóna kvízu pre firmy                         | mid-tail  | commercial      | Easy            | `/sablony` (H2 — category)           |
| 14 | komunitný kvíz internetová bezpečnosť           | long-tail | informational   | Easy            | `/sablony` (intro + category)        |
| 15 | šablóna testu CC BY                              | long-tail | informational   | Easy            | `/sablony` (license footer + FAQ)    |

**Difficulty rationale (Slovak market).** Slovak-language SEO is a small,
under-served market for awareness-content; the dominant SERPs for these
queries today are either (a) machine-translated CZ pages, (b) generic
international quiz-platform marketing pages with no Slovak content, or (c)
news articles. Subenai already ranks for adjacent terms via `/blog` and
`/courses`, which gives the new `/sablony` hub topical-authority spillover.

**Negative keywords (do not optimize for).** *test online zadarmo* (too
broad — diverts intent away from awareness niche), *psychotest* (different
domain), *IQ test* (covered by `/tests`, not by templates).

## 3. `/sablony` index page outline

### Head metadata

```
<title>Test šablóny | Bezplatné kvízy o online podvodoch | subenai</title>
<meta name="description" content="Verejná knižnica šablón kvízov o online bezpečnosti. Použi alebo si duplikuj pripravený test. Zadarmo, v slovenčine, pod licenciou CC BY 4.0.">
<link rel="canonical" href="https://subenai.sk/sablony">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:locale" content="sk_SK">
<meta property="og:type" content="website">
```

- Title length: 64 chars (with brand suffix); strip brand if title balloons
  past 60.
- Description: 155 chars; lead with the free + Slovak + license triad.

### Structure

- **H1 (single):** *Test šablóny: bezplatné kvízy o online podvodoch*
- **Intro paragraph** (rendered above-the-fold, ~150 Slovak words — verbatim
  below).
- **Sticky filter bar** (search + 4 category chips: *Pre firmy*, *Pre školy*,
  *Pre seniorov*, *Komunita*).
- **H2:** *Pre firmy* — card list filtered to `audience='business'`.
- **H2:** *Pre školy* — card list filtered to `audience='school'`.
- **H2:** *Pre seniorov a rodiny* — card list filtered to `audience='senior'`.
- **H2:** *Komunitné šablóny* — admin-approved user submissions.
- **H2:** *Ako šablóny fungujú* — three-step illustration (Pozri / Duplikuj /
  Otestuj svojich ľudí).
- **H2:** *Často kladené otázky* — FAQ accordion (4–6 entries) → emits
  `FAQPage` JSON-LD (reuse `src/lib/seo/faq-jsonld.ts`).
- **H2:** *Licencia a autorstvo* — short paragraph linking to `/privacy#s5`.
- **CTA tail:** *Chýba tu šablóna, ktorú potrebuješ? Vytvor svoju a odošli ju
  do verejnej knižnice.* — links to `/app/templates?tab=mine`.

### Intro paragraph (Slovak, verbatim, ~150 words)

> Hľadáš pripravený kvíz, ktorý môžeš pustiť kolegom v práci, žiakom v
> triede alebo rodičom doma — bez toho, aby si musel písať otázky od
> nuly? Sme tu pre teba. V tejto verejnej knižnici nájdeš desiatky šablón
> testov o phishingu, falošných e-shopoch, podvodoch na sociálnych
> sieťach, AI deepfake hovoroch a ďalších témach modernej digitálnej
> bezpečnosti. Každú šablónu si môžeš pozrieť, použiť priamo alebo si ju
> duplikovať do svojej knižnice a upraviť pre svoju cieľovku. Všetky
> šablóny sú v slovenčine, zadarmo a pod licenciou Creative Commons
> BY 4.0 — môžeš ich teda zdieľať aj upravovať, stačí ponechať uvedenie
> autora. Komunitné šablóny prechádzajú manuálnym schvaľovaním, aby sa
> v knižnici neobjavili zavádzajúce alebo necitlivé otázky. Vyber si
> šablónu nižšie alebo si vytvor svoju vlastnú a pošli ju do knižnice
> pre ostatných.

### JSON-LD shape

Two blobs in `<head>` (pattern mirrors `/courses`):

```jsonc
// Blob 1 — CollectionPage wrapper
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Test šablóny: bezplatné kvízy o online podvodoch",
  "description": "Verejná knižnica šablón kvízov o online bezpečnosti …",
  "url": "https://subenai.sk/sablony",
  "inLanguage": "sk-SK",
  "isPartOf": { "@type": "WebSite", "name": "subenai", "url": "https://subenai.sk" },
  "about": { "@type": "Thing", "name": "Online safety quizzes" }
}

// Blob 2 — ItemList of templates (reuse buildItemListJsonLd pattern from courses-jsonld.ts)
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Test šablóny",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "url": "https://subenai.sk/sablony/phishing-pre-zamestnancov", "name": "Phishing test pre zamestnancov" },
    ...
  ]
}
```

Optionally a third `FAQPage` blob emitted by the FAQ accordion (reuse
existing helper).

## 4. `/sablony/$slug` detail page outline

### Head metadata (per template)

```
<title>{template.title} | Test šablóna | subenai</title>
<meta name="description" content="{template.seo_description ?? template.description.slice(0, 155)}">
<link rel="canonical" href="https://subenai.sk/sablony/{slug}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:image" content="{template.og_image_url}"> <!-- 1200×630 PNG, runtime-generated -->
```

- Title pinned ≤ 60 chars by truncating template.title to 40 if needed —
  the suffix is fixed.
- Description **always** ≤ 155 chars; if `template.description` is shorter
  than 80, prepend the audience phrase (e.g. *"Pre firmy. "*).

### Structure

- **H1:** {template.title} (single)
- **Sub-title bar:** age-rating badge + question-count badge + audience
  badge + license badge ("CC BY 4.0").
- **Intro paragraph** — template description as authored (Slovak).
- **H2:** *Čo tento test pokrýva* — bulleted list of question topics
  (derived from the `questions` table rows).
- **H2:** *Pre koho je vhodný* — single paragraph naming the audience.
- **Primary CTA block:** big button *Použiť šablónu* →
  `/test/builder?templateId={id}`. Secondary CTA: *Duplikovať a upraviť*
  → `/app/templates?duplicate={id}` (requires login).
- **H2:** *Autor a licencia* — `template.author_display_name`, publish
  date, "CC BY 4.0" with a link to the canonical license URL.
- **H2:** *Súvisiace šablóny* — 3 cards from the same audience cluster.
- **H2:** *Pokračuj v učení* — 1 related course (linked from
  `courses.audience`) + 1 related pillar blog post (linked by topic tag).

### JSON-LD shape (per template)

```jsonc
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "{template.title}",
  "description": "{template.description}",
  "url": "https://subenai.sk/sablony/{slug}",
  "inLanguage": "sk-SK",
  "datePublished": "{template.published_at}",
  "dateModified": "{template.updated_at}",
  "license": "https://creativecommons.org/licenses/by/4.0/",
  "author": {
    "@type": "Person",
    "name": "{template.author_display_name ?? 'subenai'}"
  },
  "publisher": {
    "@type": "Organization",
    "name": "subenai",
    "url": "https://subenai.sk"
  },
  "audience": {
    "@type": "Audience",
    "audienceType": "{mapAgeRating(template.age_rating)}"  // e.g. "adults", "teens 13+"
  },
  "isAccessibleForFree": true,
  "learningResourceType": "Quiz",
  "educationalUse": "Awareness training"
}
```

Plus a `BreadcrumbList` blob (`Domov › Šablóny › {title}`) — reuse
`buildBreadcrumbJsonLd` from `src/lib/seo/breadcrumb-jsonld.ts`.

### OG image strategy

**Recommendation: runtime SVG → static PNG at publish time.** The existing
infra at `scripts/generate-og-default.mjs` rasterises an SVG with `sharp`.
Build on that, do not invent a new pipeline.

- At template **publish** (admin approval, Phase C), a CF Pages Function
  composes an SVG from a template + the title (1200×630, brand palette,
  audience badge), rasterises via `sharp`, uploads to Supabase Storage
  bucket `og-images/sablony/{slug}.png` (public read), and writes
  `og_image_url` onto the row. The runtime route just emits
  `<meta property="og:image" content="{og_image_url}">`.
- For private user-owned templates (no public OG asset), the route is
  noindex anyway — no OG image generated.
- Fallback if the function fails: `og-default.png` from `/public`. Never
  ship a page with `og:image` pointing to an SVG (Facebook + LinkedIn
  reject SVG).

## 5. Internal link plan

Each hub-and-spoke page targets **3–5 internal outgoing links** with stable
Slovak anchor text. Patterns are kept deterministic so they're testable in
the e2e suite.

### From `/sablony` (hub)

| Target                         | Anchor text (Slovak, verbatim)               | Placement                                   |
|--------------------------------|----------------------------------------------|---------------------------------------------|
| `/tests`                       | *všetky testy v balíčku*                     | Intro paragraph (last sentence)             |
| `/courses`                     | *kurzy o online bezpečnosti*                 | "Ako šablóny fungujú" — last paragraph      |
| `/blog/podvody-na-socialnych-sietach` | *prečítaj si pillar o podvodoch na sociálnych sieťach* | FAQ section — first Q&A   |
| `/sablony/$slug` (each card)   | *{template.title}*                           | Card title (each card)                      |
| `/app/templates?tab=mine`      | *vytvor si vlastnú šablónu*                  | Bottom CTA                                  |

### From `/sablony/$slug` (spoke)

| Target                         | Anchor text (Slovak, verbatim)               | Placement                                   |
|--------------------------------|----------------------------------------------|---------------------------------------------|
| `/sablony`                     | *Späť na všetky šablóny*                     | Breadcrumb + bottom secondary CTA           |
| `/test/builder?templateId={id}`| *Použiť šablónu*                             | Primary CTA button                          |
| `/courses/{related_course}`    | *Pokračuj kurzom: {course.title}*            | "Pokračuj v učení" section                  |
| `/blog/{related_pillar}`       | *Hĺbkový sprievodca: {post.title}*           | "Pokračuj v učení" section                  |
| `/sablony/{related_slug}`      | *{related.title}*                            | "Súvisiace šablóny" — 3 cards               |

### Inbound to `/sablony` (from existing surfaces)

| From                                | Anchor text (Slovak, verbatim)                                          |
|-------------------------------------|-------------------------------------------------------------------------|
| `/` (home)                          | *Pozri si verejnú knižnicu šablón* (new tile in the existing CTA grid)  |
| `/tests` (index)                    | *Alebo si vyber šablónu* (sidebar / under search box)                   |
| `/courses` (index)                  | *K tomu vyskúšaj test: pozri šablóny* (CoursesValueStrip — new 4th tile)|
| `/blog/$slug` (per pillar post)     | *Otestuj svoje znalosti šablónou* (inline CTA after first H2)           |
| Site footer                         | *Šablóny* (new footer-nav entry)                                        |

The blog and courses inbound links should be **wired in the same PR as Phase D**
so the topical-authority signal lands the moment `/sablony` ships, not weeks
later.

## 6. Sitemap + robots.txt

### Sitemap entries to add

Edit `scripts/generate-sitemap.mjs`:

- Static route: `{ loc: "/sablony", priority: "0.85", changefreq: "weekly" }`
  — placed in `STATIC_ROUTES` after `/tests` to mirror its weight.
- Dynamic: query Supabase for `public.templates WHERE visibility='public' AND
  status='published' AND owner_id IS NULL OR (visibility='public' AND
  status='published')` (mirror the existing `loadPublishedBlogPosts` pattern).
  Map each row to `{ loc: '/sablony/{slug}', priority: '0.7', changefreq:
  'monthly', lastmod: updated_at.slice(0,10) }`.
- The 15 seeded defaults inherit `priority: 0.75` (one tick higher than
  community submissions — they're curated).

### Sharding decision

At launch we expect ≤ 50 templates (15 defaults + early community). Stay in
the single `sitemap.xml`. **Trigger a separate `sitemap-sablony.xml` shard
only when**: total URLs in the main sitemap > 5,000, OR template count
alone > 500. Until then, sharding adds operational noise without SEO
benefit.

### robots.txt

No change required. The site-wide `Allow: /` already covers `/sablony`. **Do
not add an explicit `Allow:` line for it** — it would be redundant and would
require maintaining the file when the route surface changes. Verify the
existing `Disallow: /app/` covers `/app/templates` (it does, prefix-match).

## 7. Launch-week marketing copy

### Blog post outline

**Title (Slovak, verbatim):**
*Spustili sme verejnú knižnicu šablón testov o online bezpečnosti*

- Category: `news-a-trendy` (slug already in `BLOG_CATEGORY_SLUGS`).
- Audience: existing subenai newsletter readers + organic landing from
  "test šablóny" once Google reindexes.
- Word count target: 700–900 words.
- Outline:
  1. Lead — what changed today, in one sentence.
  2. Why we built it — the SME / school / senior-club / community
     scenarios.
  3. How to use it — 3 screenshots: gallery, detail, "Použiť" CTA.
  4. The Creative Commons CC BY 4.0 framing — link to `/privacy#s5`.
  5. The first 15 templates — short scannable list with anchor links to
     the 5 most-likely-to-share spokes.
  6. "Pridaj sa: pošli svoju šablónu" — CTA to `/app/templates?tab=mine`.
  7. Pillar links (3) — `/blog/phishing-kompletny-sprievodca`,
     `/blog/podvody-na-socialnych-sietach`,
     `/blog/bezpecnost-pre-rodicov-deti-seniorov`.
- Primary keyword: *test šablóny*.
- Internal links: 4 outbound (per blog SEO style guide).

### LinkedIn post (Slovak, ~150 words, verbatim)

> Spustili sme niečo, čo sme dlho chceli mať aj sami.
>
> Na `subenai.sk/sablony` je odteraz verejná knižnica šablón testov o
> online bezpečnosti. Pätnásť pripravených kvízov, v slovenčine, zadarmo,
> pod licenciou Creative Commons BY 4.0 — pre firmy, školy, knižnice,
> seniorské kluby aj rodiny.
>
> Šablónu si môžeš pozrieť, použiť priamo, alebo si ju duplikovať do
> svojej knižnice a upraviť pre tvojich ľudí. Ak máš vlastnú, môžeš ju
> poslať do verejnej knižnice — prejde manuálnym schvaľovaním, aby
> komunita dostala len materiály, ktoré nešíria zavádzajúce informácie.
>
> Píšeme to preto, lebo testovanie znalostí o phishingu, falošných
> e-shopoch alebo AI podvodoch nemá byť drahý projekt s vendor lock-inom.
> Má byť jeden klik.
>
> Skúsiš ho s nami? Link v komentári. Spätná väzba vítaná.

### Twitter / X thread (3 tweets, Slovak, verbatim)

1. *Verejná knižnica šablón testov o online podvodoch je vonku.*
   *15 pripravených kvízov v slovenčine, zadarmo, CC BY 4.0.*
   *Pre firmy, školy, seniorské kluby. → subenai.sk/sablony*

2. *Šablónu si pozrieš, použiješ priamo, alebo duplikuješ a upravíš.*
   *Ak máš svoju, môžeš ju poslať do knižnice — prejde manuálnym*
   *schvaľovaním, nech sa tam nedostanú nepresné otázky.*

3. *Začni napríklad týmto: phishing test pre zamestnancov*
   *→ subenai.sk/sablony/phishing-pre-zamestnancov*
   *Spätnú väzbu radi prečítame.*

Tone notes for all three formats: no superlatives ("revolutionary", "best"),
no jargon stuffing, lead with the concrete free + Slovak + license value.

## 8. OG card design brief

The OG card for `/sablony` (hub) and per-template cards (spoke) ship as
1200×630 PNG, rasterised from SVG by `sharp` at publish time using the same
toolchain as `og-default.png`. Layout: brand wordmark *subenai* top-left in
the same lock-up as the existing `og-default.svg`, large title in the brand
purple-glow stack (`--primary: oklch(0.88 0.22 130)` and `--primary-glow:
oklch(0.78 0.20 152)` — green-leaning chartreuse, not literal "purple"
despite the legacy variable name; do not invent a new palette). Right side
carries the audience badge ("Pre firmy" / "Pre školy" / "Pre seniorov" /
"Komunita") and an age-rating chip. The hub OG card uses a single "Test
šablóny" title and an icon grid of four representative templates as a
faint background pattern at 30 % opacity. The spoke cards use the template's
own title centered in 64 pt semibold; keep titles within 50 chars so they
never wrap to a third line. Bottom strip: `subenai.sk/sablony/{slug}` in
mono 20 pt. Designer deliverable: one SVG template file plus a Figma frame
with the four audience-color variants. Reuse the existing typeface
declared in `src/styles.css`; do not introduce a new web font.

## 9. Measurement

Three KPIs tracked weekly for the first 90 days, then monthly.

| # | KPI                                                                                  | Source                                            | Why it matters                                                         | Target (90 days) |
|---|--------------------------------------------------------------------------------------|---------------------------------------------------|------------------------------------------------------------------------|------------------|
| 1 | Organic sessions to `/sablony*`                                                      | Google Search Console (query: page contains `/sablony`) | Tells us if the SEO bet is paying off at the head-term level.            | ≥ 400 / mo by day 90 |
| 2 | `useTemplate` click-through rate from `/sablony/$slug`                               | GA4 (existing consent-gated tracker), event `template_use_click` | Bridges SEO traffic to product activation. Defines whether `/sablony` is a marketing surface or just a vanity page. | ≥ 6 % of /sablony/* sessions |
| 3 | Fork rate — `useDuplicateTemplate` mutations attributed to a `/sablony/$slug` referrer | Supabase `audit_log` join on `referrer` (Phase C adds the referrer column) | Measures depth of engagement — fork = highest-intent action short of running the test. | ≥ 50 forks / mo by day 90 |

Tools: GSC (already verified at subenai.sk), GA4 (already wired behind the
analytics consent gate — no new tracker needed; **do not** add any new
client-side analytics SDK; reuse the existing `useTrack` helper from
`src/lib/analytics`). Add `template_use_click` and `template_fork` as new
event names; both are first-party only.

## 10. Open questions for the PM

| # | Question                                                                                                       | Why it matters                                                                                          | Tentative default                                                                                                |
|---|----------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| Q1 | Should `/sablony` be reachable from the main header nav, or only from `/tests`, the home grid, and the footer? | Header real estate is finite; adding a 6th item shrinks the click target for the existing ones and changes the IA story. | Footer + home tile + inline links from `/tests`. Header stays unchanged for v1. Revisit after 60 days of GSC data. |
| Q2 | Should `/sablony/$slug` show the AI-precheck verdict to anonymous viewers (transparency) or only the badge?    | Trust signal vs. perceived "templates are gatekept by a robot" — opposite framings.                     | Show only the human-readable badge ("Manuálne overené 2026-05-22"). The AI verdict stays admin-only.             |
| Q3 | Do we accept community-submitted templates in English at launch, or Slovak-only until i18n is decided?         | Affects moderation cost (Haiku 4.5 system prompt is Slovak-tuned) and SEO (mixing languages on the hub hurts). | Slovak-only at launch. Reject EN submissions in the dialog with a friendly message; revisit when CZ/EN routes land. |
| Q4 | Do we want a per-template "Embed on your site" snippet (iframe) for share-ability, or save that for a later epic? | Embed = free backlinks (big SEO win) but it's a 5-day build and needs a separate `/embed/sablony/$slug` route with relaxed CSP. | Defer. Ship `/sablony` first, measure, then prioritise embed if KPI 1 misses target. |

---

**Cross-references:**
- Master plan: `tasks/PLAN-2026-05-20-E44-template-marketplace.md`
- Legal terms (CC BY 4.0): `tasks/E44-appendix-B.md` (forthcoming)
- AI moderation rubric: `tasks/E44-appendix-C.md` (forthcoming)
- UX critique + a11y spec: `tasks/E44-appendix-D.md` (forthcoming)
- Existing SEO infrastructure: `src/lib/seo/*.ts` (reused, not extended)
- Existing OG infrastructure: `scripts/generate-og-default.mjs` (extended,
  not replaced)
- Existing sitemap generator: `scripts/generate-sitemap.mjs` (extended)
