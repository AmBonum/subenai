# Retention loops — test plan

**Routes:** `/app/digest` · `/app/recommendations` · `/app/retest` · `/app/peer`
**Spec file:** `e2e/specs/app/retention-loops.spec.ts`
**Component(s) under test:**
- `src/routes/app.digest.lazy.tsx`
- `src/routes/app.recommendations.lazy.tsx`
- `src/routes/app.retest.lazy.tsx`
- `src/routes/app.peer.lazy.tsx`

**Prerequisites (all TCs):** Educator session active (`EDUCATOR_SESSION`), profile onboarded, cookie consent seeded via `setupEducator`.

---

## Section A — Digest (`/app/digest`)

### TC-01: Empty state when the user has no digest history

**Prerequisites:** `user_digests` table is empty.

**When** the educator navigates to `/app/digest`.

**Then** the empty-state card (`app-digest-empty-state`) is visible.

**and** the empty-state title reads "Zatiaľ žiadny súhrn".

**and** the page-header eyebrow reads "Súhrn".

---

### TC-02: Populated state — digest card renders with period label and session stat

**Prerequisites:** One row in `user_digests` with a known period and stats (sessions_count=5, completion_rate=80).

**When** the educator navigates to `/app/digest`.

**Then** the digest list (`app-digest-list`) is visible.

**and** the digest card for the seeded row is visible (testid `app-digest-card-{id}`).

**and** the sessions stat span contains "5 dokončení".

**and** the completion stat span contains "Úspešnosť 80%".

---

### TC-03: Populated digest card shows "Pozri detail" CTA linking to `/app/tests/$testId` when top_test is set

**Prerequisites:** One row in `user_digests` with `stats.top_test_id` and `stats.top_test_title` set.

**When** the educator navigates to `/app/digest`.

**Then** the top-test section (`app-digest-card-top-test-{id}`) is visible.

**and** the CTA button (`app-digest-card-top-test-cta-{id}`) has the href `/app/tests/{testId}`.

---

## Section B — Recommendations (`/app/recommendations`)

### TC-04: Empty state when no course recommendations exist

**Prerequisites:** `course_recommendations` table is empty.

**When** the educator navigates to `/app/recommendations`.

**Then** the empty-state card (`app-recommendations-empty-state`) is visible.

**and** the empty-state title reads "Zatiaľ žiadne odporúčania".

---

### TC-05: Populated state — recommendation card renders with title and reason badge

**Prerequisites:** One row in `course_recommendations` with `reason_key="new_content"` and a joined training title.

**When** the educator navigates to `/app/recommendations`.

**Then** the recommendations list (`app-recommendations-list`) is visible.

**and** the card title (`app-recommendations-card-title-{id}`) shows the training title.

**and** the reason badge (`app-recommendations-card-reason-{id}`) shows "Nový obsah".

---

### TC-06: "Pozri kurz" CTA links to `/courses/$slug` when training has a slug

**Prerequisites:** One row in `course_recommendations` with a training that has a non-null slug.

**When** the educator navigates to `/app/recommendations`.

**Then** the "Pozri kurz" button (`app-recommendations-card-view-{id}`) has href `/courses/{slug}`.

---

## Section C — Retest (`/app/retest`)

### TC-07: Empty state when no retest reminders exist

**Prerequisites:** `retest_reminders` table is empty.

**When** the educator navigates to `/app/retest`.

**Then** the empty-state card (`app-retest-empty-state`) is visible.

**and** the empty-state title reads "Zatiaľ žiadne pripomienky".

---

### TC-08: Due section visible when a reminder's `remind_after` is today or earlier

**Prerequisites:** One row in `retest_reminders` with `remind_after` in the past (e.g. 2026-01-01), `dismissed_at=null`, `retested_at=null`, `snoozed_until=null`.

**When** the educator navigates to `/app/retest`.

**Then** the due section (`app-retest-due-section`) is visible.

**and** the reminder card (`app-retest-card-{id}`) shows the test title.

**and** the "Spustiť retest" button (`app-retest-card-run-{id}`) has href `/app/tests/{test_id}`.

---

### TC-09: Upcoming section visible when `remind_after` is in the future

**Prerequisites:** One row in `retest_reminders` with `remind_after` far in the future (e.g. 2099-12-31).

**When** the educator navigates to `/app/retest`.

**Then** the upcoming section (`app-retest-upcoming-section`) is visible.

**and** the upcoming reminder card is visible with the due-in label containing "Splatné o".

---

## Section D — Peer (`/app/peer`)

### TC-10: Insufficient-cohort empty state shown when RPC returns `has_data: false, reason: "insufficient_cohort"`

**Prerequisites:** `get_peer_card` RPC returns `{ has_data: false, reason: "insufficient_cohort" }`.

**When** the educator navigates to `/app/peer`.

**Then** the insufficient-cohort card (`app-peer-empty-cohort`) is visible.

**and** the body text reads "Zatiaľ máme málo dát na porovnanie. Vráť sa o pár týždňov."

**and** the percentile card (`app-peer-percentile-card`) is NOT rendered.

---

### TC-11: Populated state — percentile card + score rows visible when RPC returns `has_data: true`

**Prerequisites:** `get_peer_card` RPC returns full data: `has_data: true`, `user_percentile: 75`, `user_score: 68`, `cohort_avg: 52`, `cohort_size: 200`, `user_attempts: 12`.

**When** the educator navigates to `/app/peer`.

**Then** the percentile card (`app-peer-percentile-card`) is visible.

**and** the percentile headline (`app-peer-percentile-headline`) contains "75. percentil".

**and** the user score value (`app-peer-score-user-value`) contains "68%".

**and** the cohort score value (`app-peer-score-cohort-value`) contains "52%".

---

### TC-12: Download button is visible and shows "Stiahnuť ako obrázok" label

**Prerequisites:** `get_peer_card` RPC returns `has_data: true` with a valid score.

**When** the educator navigates to `/app/peer`.

**Then** the download button (`app-peer-share-download`) is visible.

**and** the button label reads "Stiahnuť ako obrázok".

**and** the privacy note (`app-peer-privacy-note`) is visible.

---

## Notes on TC adjustments

- **TC-03** (originally "cadence preference can be changed"): the digest route has no cadence-change UI — `profile_preferences.digest_cadence` is set during onboarding, not on this page. TC-03 replaced with the top-test CTA assertion, which is a meaningful populated-state branch the source explicitly gates.
- **TC-12** (originally "share button opens dialog"): the peer page has no dialog. The share mechanism is a PNG download via `html-to-image`. TC-12 tests the button's visible state and label; the actual download is a side-effect of `html-to-image` and cannot be reliably asserted in Playwright without intercepting the dynamic import.
