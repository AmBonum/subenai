# subenai.sk — LinkedIn Content Strategy

Company page: https://www.linkedin.com/company/subenai/
Goal: daily posts, unified brand graphics, maximum user acquisition for the
free Slovak scam-awareness platform.

## What we are selling (it's free — we sell the click)

Verified inventory (from the repo, 2026-06):

| Asset | Count | Route |
|---|---|---|
| Quick test (10 questions, "90 sekúnd", no signup) | 1 | `/test` |
| Audience/industry test packs (seniori, študenti, žiaci do 16, e-shop, gastro-horeca, autoservis, IT, verejné služby, všeobecný) | 9 | `/tests`, `/tests/{slug}` |
| Micro-courses (phishing, vishing, BEC, romance, pig butchering, QR quishing, AI deepfake, …) | 28 | `/courses` |
| Academy articles (blog) | 81 | `/blog/{slug}` |
| Schools / edu mode | — | `/schools` |
| Support page | — | `/support` |

Never claim numbers beyond these without re-counting the content files.

## Positioning for the SK LinkedIn audience

One platform, three doors. Every post enters through exactly one:

1. **Company door (HR / IT managers, owners of SMEs)** — "your employees
   are the attack surface; test the team in minutes, free." Anchor
   assets: industry packs (eshop, it-vyvoj, gastro-horeca, autoservis,
   verejne-sluzby), BEC/deepfake-CEO content, `internet-iq-test-pre-firmy-zamestnancov`.
2. **Edu door (teachers, school heads)** — "a ready 45-minute lesson on
   scam recognition." Anchor assets: `/schools`, packs `ziaci-do-16` +
   `studenti`, article `kybernetika-vo-vyucbe-prakticky-navod-pre-ucitelov`.
3. **Personal door (every professional as a parent / child of seniors)** —
   "protect yourself and your family." Anchor assets: quick test,
   `seniori` pack, voice-cloning / falošný policajt / marketplace articles.

LinkedIn SK is small and B2B-ish; the personal door is what gets shared,
the company and edu doors are what convert into multi-user adoption.
A person who takes the quick test after a story post is the same person
who proposes it to HR on Monday — that is the core growth loop.

## Growth loops

- **Score-share loop**: test-challenge posts ask for scores in comments;
  comments drive reach; reach drives more test-takers.
- **Employee-security loop**: a manager sees a B2B post → runs an industry
  pack with the team → results spark internal conversation → company
  members follow the page.
- **Edu loop**: one teacher post → shared into teacher groups → schools
  page signups; teachers are the highest-multiplier audience (30 students
  per click).
- **Family loop**: weekend posts explicitly ask "pošlite rodičom" — the
  share IS the CTA.

## Content pillars + mix (21-day cycle)

| Pillar | Mix | What it is | Campaign tag |
|---|---|---|---|
| Scam of the week | ~25% | Breakdown of one real scam pattern, anchored in an academy article | `scam-of-the-week` |
| Test challenge ("uhádneš podvod?") | ~20% | Interactive dare: quick test or a quiz article, score in comments | `test-challenge` |
| Academy repurpose | ~25% | Checklist / how-to distilled from one article | `academy` |
| Data & insight | ~15% | One number or psychological mechanism as the hero | `insight` |
| Mission / story / community | ~15% | Behind the project, victim stories (anonymized), asks for shares | `mission` / `story` |

## Cadence and timing (SK B2B)

- **1 post per day**, 7 days a week.
- Weekdays: publish **08:00** or **12:30 CET** (commute scroll, lunch
  scroll). Tue–Thu are the highest-reach days — reserve B2B posts for them.
- Weekends: **09:30 CET**, personal/family angle only.
- Never two B2B posts back to back; alternate doors.

## UTM convention

```
https://subenai.sk/<path>?utm_source=linkedin&utm_medium=social&utm_campaign=<pillar>&utm_content=<YYYY-MM-DD>
```

`utm_campaign` ∈ {scam-of-the-week, test-challenge, academy, insight,
mission, story, edu, b2b}. `utm_content` is the post date — one post per
day makes it a unique post ID.

## Hashtag sets (3–5 per post, no more)

- **Core (always pick 2–3)**: #kyberbezpecnost #podvody #phishing #subenai
- **B2B add-ons**: #firemnabezpecnost #BEC #ITbezpecnost #HR
- **Edu add-ons**: #skolstvo #digitalnagramotnost #vzdelavanie
- **Family add-ons**: #seniori #rodina #deti
- **Topic add-ons**: #AI #deepfake #vishing #eshop

## KPI targets (first 90 days)

| Metric | 30 d | 90 d |
|---|---|---|
| Page followers | 300 | 1 500 |
| Avg. impressions / post | 1 000 | 4 000 |
| Engagement rate | ≥ 4 % | ≥ 5 % |
| LinkedIn sessions on subenai.sk (UTM) / week | 150 | 700 |
| Quick-test starts from LinkedIn / week | 60 | 300 |

Review weekly: per-pillar CTR (UTM sessions / impressions). Double down on
the top pillar, rewrite the bottom one — kill nothing before 3 attempts.

## Brand rules for graphics

- Template: `templates/post-card.svg.mjs` — dark navy `#14141f`
  (brand oklch(0.16 0.03 265) family), acid-lime `#b8ff3d`
  (oklch(0.88 0.22 130)), red-orange `#e8553f`, sky `#7dd3fc`.
- Variant per pillar: **lime** = mission/academy, **orange** = scam
  warnings/stories, **sky** = test challenges/insight.
- Wordmark "subenai" lowercase lime bottom-left, `subenai.sk` bottom-right
  on every card. 1200×1200 default, 1200×627 (`wide: true`) for link posts.
- Post copy is Slovak; cards carry the hook, never the whole post.
