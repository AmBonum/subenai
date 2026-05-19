# Blog content seed files

This directory holds **one-time seed input** for the blog. Per locked decision
#3 in `tasks/PLAN-2026-05-19-blog-content-engine.md`, the authoritative
content lives in `blog_posts.body_mdx`; these files are read once by
`scripts/seed-blog-posts.mjs` (to be added when the first batch is ready)
and inserted as `draft` rows into Supabase. After that, the admin CMS at
`/admin/blog/$id` becomes the editing surface and these files are no
longer read by the runtime.

## File naming

One `.mdx` file per planned article. Filename = slug (kebab-case, Slovak
diacritics stripped). Example: `phishing-kompletny-sprievodca.mdx`.

## Frontmatter contract

Every file ships with YAML frontmatter that maps 1:1 to `blog_posts`
columns. The seed script asserts presence of every required field.

```yaml
---
slug: phishing-kompletny-sprievodca
title: "phishing — kompletný sprievodca: čo to je, ako funguje, ako sa brániť"
subtitle: "10-sekundové znaky, psychológia útoku a prvá pomoc po kliknutí"
excerpt: "Phishing je najčastejší online podvod na Slovensku. Tento sprievodca ti ukáže, ako ho rozpoznať za 10 sekúnd, prečo funguje aj na opatrných ľudí, a čo robiť, keď nahodou klikneš."
category_slug: phishing-a-emaily
author_slug: subenai-editorial
primary_keyword: phishing
search_intent: informational
reading_minutes: 12
hero_image_url: null
og_image_url: null
seo_title: "phishing: ako ho rozpoznať a chrániť sa | subenai"
seo_description: "Phishing je najčastejší slovenský scam. Tu nájdete 10-sekundové znaky, psychológiu útoku, reálne príklady a presné kroky po kliknutí."
canonical_url: null
pillar: true
sources:
  - label: "SK-CERT: aktívna phishingová kampaň proti Slovenskej pošte"
    url: "https://www.sk-cert.sk/sk/example"
    publisher: "SK-CERT"
    accessed_at: "2026-05-19"
  - label: "..."
    url: "..."
    publisher: "..."
    accessed_at: "2026-05-19"
---
```

Required keys: `slug`, `title`, `excerpt`, `category_slug`, `author_slug`,
`primary_keyword`, `search_intent`, `seo_title`, `seo_description`,
`sources` (≥4 for pillars, ≥3 for clusters per voice-guide §12).

Optional: `subtitle`, `reading_minutes`, `hero_image_url`, `og_image_url`,
`canonical_url`, `pillar` (boolean — `true` for one of the 10 pillar
articles, `false` or omitted for cluster articles).

## Body content rules (per `tasks/blog/voice-guide.md`)

- Lowercase `subenai` throughout body prose. Domain `subenai.sk` stays
  lowercase too.
- Informal `ty` register universally; never `vy`.
- Product term `test` exclusively; never `kvíz`.
- Banned phrases — see `tasks/blog/voice-guide.md §5`.
- Pillar word count: 2200–3000. Cluster: 1100–1800.
- Markdown only (no inline JSX components). The `BlogScenarioCard` is
  rendered automatically below the article body by the route.

## Editorial process (until E17 ships the in-app pipeline UI)

1. An agent drafts the article and writes its `.mdx` here, following the
   9-step pipeline in `tasks/PLAN-2026-05-19-blog-content-engine.md`
   ("Agent Orchestration Pipeline").
2. The author reviews and edits the file in-place via PR.
3. When a batch is ready, `npm run seed-blog` inserts every file as a
   `draft` row in Supabase.
4. The author publishes from `/admin/blog/$id` (toggles status to
   `published`, sets `published_at`).
