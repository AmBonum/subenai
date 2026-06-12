# LinkedIn daily playbook — subenai.sk

The 10-minute routine. No improvisation; the calendar decides, you execute.

## Daily routine (10 minutes, the evening before or 07:45)

1. Open `CALENDAR-2026-06.md`, find today's row.
2. Open the matching file in `posts/` (days 1–7 are pre-written; for later
   days, write from the calendar row using the post-file format).
3. If the PNG is missing: `node scripts/render-linkedin-cards.mjs`
   (outputs to `rendered/`, gitignored).
4. Paste the post text (everything below the `---`) into LinkedIn as the
   company page. Attach `rendered/<post>.png`.
5. Verify the UTM link resolves (click it once in a private window).
6. Schedule: **08:00 or 12:30 CET weekdays, 09:30 weekends**. B2B posts
   only Tue–Thu 08:00.
7. Done. Engagement window starts at publish time (see below).

## Post file format (`posts/YYYY-MM-DD-<slug>.md`)

```
# <date> — <weekday> — pillar: <pillar>

article: <repo path of the source asset, if any>
link: <full CTA URL with UTM>
image: {"variant":"lime|orange|sky","kicker":"...","title":"...","stat":"...","cta":"subenai.sk/..."}

---

<final Slovak post text, ready to paste>
```

The `image:` line must be valid JSON on one line — the renderer parses it.
Keep card titles under ~90 characters; use `stat` only when one number IS
the story; `wide: true` for 1200×627 link-preview style cards.

## Repurposing rules — 1 article → 3 posts

Every academy article yields three distinct posts (space them ≥ 2 weeks
apart, different hooks, different cards):

1. **Stat post** (sky/orange card with `stat`): pull the single most
   alarming number or timespan. Hook = the number.
2. **Story post** (orange card): the human scenario — who got the call,
   what they heard, what it cost. Anonymized, composite, never real PII.
3. **Checklist post** (lime card): the defense, 3–5 numbered steps,
   "uložte si / pošlite kolegom" ask.

Same source, three campaigns, three UTM `utm_content` dates — the
analytics tell you which frame converts for that topic.

## Engagement rules

- **Reply to every comment within 2 hours** of posting (the algorithm's
  golden window). A question back beats a thank-you.
- Quiz/challenge posts: react to every score comment, reply to the first
  10 with one extra tip each.
- Tag institutions (SK-CERT, preventista community, Zodpovedne.sk) **only
  when the post factually builds on their published material** — the test
  packs cite SK-CERT, PZ SR, Europol as sources, so scam-of-the-week posts
  often legitimately can. Never tag for reach alone.
- Reshare the day's post from a personal profile with one added sentence
  of personal context (not a copy of the post).
- Weekly (Friday): check UTM sessions per campaign, note the best and
  worst post in the calendar file.

## What NOT to do

- **No engagement bait** that violates LinkedIn policy: no "like if you
  agree", no follow-gates, no fake polls, no pods.
- **No victim shaming.** The editorial line is "this works on smart,
  busy people" — never "how could anyone fall for this".
- **No real victim PII, ever** (GDPR + basic decency): stories are
  anonymized composites; no names, photos, screenshots of real
  conversations, employer names, or identifiable details. If a follower
  shares their own incident in comments, never quote it in a post
  without explicit written consent.
- **No invented statistics.** Every number comes from repo content or a
  cited public source (SK-CERT, Europol, PZ SR). If you can't source it,
  cut it.
- **No fearmongering without a defense.** Every scary post ends with
  concrete steps or a test link — fear is the hook, competence is the
  product.
- **No more than 5 hashtags**, no hashtag walls, no emoji walls (max ~3
  per post, LinkedIn norm).
- Don't post the same CTA path twice in a row; alternate the three doors
  (company / edu / personal).
