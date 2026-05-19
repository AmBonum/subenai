# Topic content map — pillars × courses × clusters

> **Status**: living document, owned by editorial. Last refresh
> 2026-05-19 as part of E17.5. Bump the timestamp when you edit and
> re-confirm the cross-link wiring matches the table below.

## Purpose

Single source of truth for *what to recommend next* across the three
learning surfaces — test, course, article. Each pillar article should
map cleanly to exactly **one** course (the `related_course_slug` we
set in DB) and own a small cluster of supporting articles. When a
reader finishes any one of them, the other two surfaces should be one
click away.

This is the editorial artefact behind the cross-link UI shipped in
E17.1–E17.4:

- `ContinueWithCourseCard` (article → course) reads
  `blog_posts.related_course_slug`. Set via the admin UI picker added
  in E17.5.
- `RelatedAcademyArticleCard` (course → article) reverse-reads the
  same column.
- `WeakCategoryRecommendations` (test → course + article) reads the
  hardcoded map in `src/lib/quiz/category-recommendations.ts`.

## The grid

| Pillar (10) | Pillar slug | Suggested `related_course_slug` | Quiz category(ies) hit | Notes |
|---|---|---|---|---|
| Phishing — kompletný sprievodca | `phishing-kompletny-sprievodca` | `email-phishing` | phishing, url | Tightest 1:1 mapping. Quiz E17.4 already points "phishing" and "url" both at this pillar. |
| SMS a podvodné hovory | `scam-sms-a-podvodne-hovory` | `sms-smishing` | scenario | Vishing course (`vishing-telefonicke-podvody`) is a strong secondary — pick the primary by which surface drives more conversions in GA. |
| Fake e-shopy — ako odhaliť | `fake-eshopy-ako-odhalit` | `marketplace-bazos-podvody` | scenario | Marketplace course covers Bazos+Vinted; pillar covers eshop scams generally. |
| Podvody na sociálnych sieťach | `podvody-na-socialnych-sietach` | `kradez-kont-socialnych-sieti` | — | No direct quiz category — recommend via reading-CTA only. |
| AI a moderné podvody (deepfake + voice cloning) | `ai-a-moderne-podvody-deepfake-voice-cloning` | `ai-hlasove-a-deepfake-podvody` | fake_vs_real | Quiz E17.4 already maps "fake_vs_real" to this pillar + course. |
| Digitálna bezpečnosť — kompletný návod | `digitalna-bezpecnost-kompletny-navod` | `data-hygiene` | — | Foundational pillar; broad scope, no clean quiz category. |
| Psychológia internetových podvodov | `psychologia-internetovych-podvodov` | `chran-svojich-blizkych` | — | Concept-heavy pillar, course is action-oriented prevention. Soft cross-link. |
| Bezpečnosť pre rodičov, deti, seniorov | `bezpecnost-pre-rodicov-deti-seniorov` | `chran-svojich-blizkych` | — | Same course as above — duplicate is OK; the audience match is the lift. |
| Bezpečné nakupovanie online (SK) | `bezpecne-nakupovanie-online-slovensko` | `marketplace-bazos-podvody` | scenario | Marketplace dominates "I'm buying X, is this legit?" intent. |
| Internet safety pre študentov | `internet-safety-pre-studentov` | `kradez-kont-socialnych-sieti` | — | Account-takeover is the most common student threat vector. |

## Courses that have no pillar yet (orphans, in priority order)

| Course | Course slug | Should a pillar exist? | Notes |
|---|---|---|---|
| Vishing — telefonické podvody | `vishing-telefonicke-podvody` | maybe | Could split off `scam-sms-a-podvodne-hovory` if voice-only content grows. |
| Investičné podvody (krypto + AI) | `investicne-podvody-krypto-ai` | **yes** | High-search-volume vertical, no pillar. Editorial backlog priority. |
| BEC — fake CEO email | `bec-pracovisko-fake-ceo` | maybe | Pure B2B angle; doesn't fit consumer-pillar set. Could live under /schools instead. |
| Fyzické podvody | `fyzicke-podvody` | no | Niche; cluster articles only. |
| QR / quishing | `qr-quishing` | no | Single-tactic course; cluster article (`one-ring-scam-zmeskany-hovor-zo-zahranicia` style) is enough. |
| Brigády a pracovné podvody | `brigady-a-pracovne-podvody` | maybe | Could pair with a "jobs scam" pillar — quarterly review. |
| Pig butchering | `pig-butchering-podvod` | no | Best as cluster under investičné pillar once that exists. |
| Romance scams — catfishing | `romance-scams-catfishing` | maybe | Single-tactic, well-defined; pillar would have legs (multiple SK-specific real cases in the news). |
| AI — čo nezdielať | `ai-bezpecnost-co-nezdielat` | no | Cluster under `digitalna-bezpecnost-kompletny-navod`. |
| AI pomocník každý deň | `ai-pomocnik-kazdy-den` | no | Tutorial-style; cluster article direction. |
| Malvertising — fake reklamy | `malvertising-fake-reklamy` | no | Already used as the "url" quiz recommendation; pillar would be redundant. |
| Chráň svojich blízkych | `chran-svojich-blizkych` | no | Already paired with two pillars (psychology + parents). |

## Wiring action items

1. **Backfill `related_course_slug`** for the 10 pillars per the grid
   above. Open `/admin/blog/<id>` → "Cross-linky" → pick course →
   Save. This populates `ContinueWithCourseCard` on each pillar article.
2. **Add a pillar for `investicne-podvody-krypto-ai`** — highest-ROI
   editorial gap. Until then, the "scenario" quiz category falls back
   to the SMS pillar, which is workable but imprecise.
3. **Review duplicates quarterly** — if two pillars both map to the
   same course (currently `chran-svojich-blizkych` is shared by the
   psychology + parents pillars), make sure each pillar's
   ContinueWithCourseCard reads natively, not as a recycled CTA.

## Quiz category → recommendation invariants

For every entry in `src/lib/quiz/category-recommendations.ts`:

| Quiz category | Course slug | Pillar slug | Both exist? |
|---|---|---|---|
| `phishing` | `email-phishing` | `phishing-kompletny-sprievodca` | ✅ |
| `url` | `malvertising-fake-reklamy` | `phishing-kompletny-sprievodca` | ✅ |
| `fake_vs_real` | `ai-hlasove-a-deepfake-podvody` | `ai-a-moderne-podvody-deepfake-voice-cloning` | ✅ |
| `scenario` | `marketplace-bazos-podvody` | `scam-sms-a-podvodne-hovory` | ✅ |

Module-load assertion in `category-recommendations.ts` guards the
course side. The pillar side is best-effort — `WeakCategoryRecommendations`
degrades silently if the post isn't published.

## Cross-check against `PILLAR_SLUGS`

If you add a row above with a pillar slug not yet in
`src/lib/blog/pillar-slugs.ts`, **also add the slug to that file** —
otherwise it won't get sitemap-priority bump, won't appear in the
/blog index featured hero, and won't show the "sprievodca" badge.
