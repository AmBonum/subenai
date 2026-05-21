# E37 — Tests catalog DB unification + coverage expansion

**Owner:** Claude (synthesis) — senior agent, multi-lens audit
**Date opened:** 2026-05-20
**Last revised:** 2026-05-21 (Phase A3 — reality reconciliation after PR #111 salvaged the stale branch's content into main as `E37_SEED.sql`)
**Status:** 🟡 Phase A + A2 + A3 complete. **Phase B' (mega-migration) starting on `feature/E37-tests-catalog`.** Phases F–J unchanged from original plan.
**Surfaces in scope:** `/tests` catalog · `/tests/$slug` detail pages · `public.tests` · `public.test_questions` · `public.questions` · `src/content/test-packs/**` (to be deprecated) · `src/lib/quiz/bank/questions.ts` (to be deprecated for new content) · `src/content/blog/**` (frontmatter only)

## TL;DR

The original Phase A audit found a 9-pack vs. 81-article coverage gap and proposed adding 6 new packs + 27–32 new questions. The **architectural pivot** in this revision corrects a deeper inconsistency surfaced by the project owner: the static `/tests/{slug}` route reads questions from the TS bank ([src/lib/quiz/bank/questions.ts](src/lib/quiz/bank/questions.ts)) while every other test surface (`/test`, `/admin/tests/*`, composer, `/app/tests/new`) reads from `public.questions` in Supabase. The DB was seeded from the TS bank in `20260518400000_quiz_questions_db_infra.sql` but the static read path was never migrated.

E37 now does **both**:

1. **Unifies the read path** — migrate the 9 existing test packs from `src/content/test-packs/*.ts` into `public.tests` rows under a platform owner_id, with pack-specific metadata in a sibling table `public.platform_pack_metadata`. The static TS pack files become CMS-source-of-truth-via-migration only; runtime reads go through DB.
2. **Closes the coverage gap** — adds 6 new packs (`heslo-2fa`, `ai-deepfake`, `socialne-siete`, `rodicia`, `skoly`, `zdravotnictvo`) and 27–32 new questions, all authored via SQL migration directly into `public.questions` and `public.tests`.

After E37: 15 packs live in DB; one read path for every test surface; new questions authored via SQL migrations or the existing admin `/admin/questions` UI; the static TS bank file becomes legacy-only (read by no production code path).

A single critical hotfix ([#66](https://github.com/AmBonum/subenai/pull/66), separate to main) preceded this epic to fix a typo (`univerzitnÿch`) currently shipping to `/tests/studenti` meta description. Note: that file becomes irrelevant once Phase F migrates the pack into DB — the hotfix value is the SERP repair for the days between now and Phase F landing.

## Phase A — Discovery (complete)

Four parallel agents on 2026-05-20:

| Agent | Output | Critical finding |
|---|---|---|
| Question-bank inventory | 210 IDs taxonomized; per-pack gap table | **All 6 proposed packs blocked — 27–32 new questions needed** |
| Blog→test mapping (81 posts) | Full table, primary `related_test_slug` per post | vseobecny 29 · eshop 8 · socialne-siete 8 · heslo-2fa 7 · rodicia 7 |
| UX/a11y audit | 3 P0 + 13 P1 + 8 P2 + 6 OOS | Touch targets, "help me choose", sort-label binding |
| SEO + brand-voice (9 packs) | Per-pack rewrites + keyword landscape | **Production typo studenti.ts (hotfix #66)**; titles miss CTR hooks |

## Phase A2 — Architecture pivot (this revision)

Project owner correction: questions live in DB and tests should pull/save from DB. Locked decisions:

| # | Decision | Resolution |
|---|---|---|
| D1 | Industry enum strategy | Extend by 4 (`rodicia`, `heslo_2fa`, `ai_deepfake`, `socialne_siete`). Stays in TS for the `Industry` union used by the static manifest layer; the DB stores it as a free-text column on `platform_pack_metadata`. |
| D2 | Bank coverage policy | Ship-blocking — author missing questions before pack ships |
| D3 | Typo hotfix shipping | Done (PR #66, separate to main) |
| D4 | Scope ambition | Full — all 27–32 new questions + 6 new packs + 9-pack DB migration + copy + blog + P0/P1 UX |
| D5 | Out-of-scope behavioral scenarios | Move to `/courses` follow-up epic |
| D6 | Pack storage architecture | **DB-native** — 9 + 6 packs become `public.tests` rows with metadata in `public.platform_pack_metadata` |
| D7 | Question authoring path | **SQL migration with INSERTs** into `public.questions` |
| D8 | Static TS pack files (`src/content/test-packs/*.ts`) | **Deleted in Phase G** after DB read path lands and is verified. Kept for the bake period (Phases B–F) as the only source of truth for industry-emoji/tagline/persona, then removed. |
| D9 | Platform owner_id | New `auth.users` row (or service-role UUID) — Phase B picks the safest pattern; recommendation: dedicated `platform@subenai.sk` system user, created idempotently in the migration. |

## Phase A3 — Reality reconciliation (2026-05-21)

Between the original plan (2026-05-20) and today, three things happened:

1. **PR #111** salvaged the stale `feature/E37-tests-coverage` branch by landing `E37_SEED.sql` (1,644 lines) + `tasks/E37-RECOVERY-NOTE.md` directly into `main`. The seed file is a paste-once consolidated blob of the 9 original Phase B–E migrations, with **idempotency guards on every statement** (`IF NOT EXISTS` / `OR REPLACE` / `ON CONFLICT DO NOTHING`). The recovery note explicitly says: "Decide whether E37 is still worth shipping".
2. **Timestamp slot collisions.** The original plan reserved `20260521200000`..`20260521600000`, but main has since used those for unrelated migrations (`20260521200000_dpa_requests.sql`, `20260521210000_test_question_order_mode.sql`, `20260521220000_test_password_v2.sql`, `20260521230000_admin_user_data_rpcs.sql`, `20260521230000_test_question_modified_audit.sql`, `20260521240000_e46_5_pending_erasure_cron.sql`, `20260521250000_e46_6_rectify_user_data.sql`). The next free slot is `20260521260000`.
3. **E44 Phase D** (`20260521170000_templates_anon_public_read.sql`) established the precedent of using `owner_id IS NULL` for platform-owned content. E37 will **not** adopt that pattern (see D9 amendment below) — packs need a real `created_by` audit trail and the recovery note recommends a Dashboard-created system user.

### Decisions confirmed via Question Wizard (2026-05-21)

| # | Question | Answer |
|---|---|---|
| OQ1 | Is E37 still worth shipping in its current form? | **Yes — ship as planned.** |
| — | How should the salvaged `E37_SEED.sql` content be packaged? | **Single mega-migration (Phase B').** |
| D9 (amended) | Platform owner user creation strategy | **Manual Dashboard creation, NOT `INSERT INTO auth.users`.** |

### Why a single mega-migration

The seed file is already a paste-tested, idempotent blob that encodes B + C + D + E phases. Splitting it back into 5 timestamped migrations would mean:

- Re-deriving boundaries we lost when the original 11 commits were squashed into the seed.
- 5× the review surface area for code we know is consistent (the seed was salvaged precisely because the original phases composed cleanly).
- Risk of partial application if user runs only some of the 5 migrations.

Mega-migration is the smallest reviewable diff vs. reality. **One file, one paste, one verify.**

### D9 amendment — Dashboard-created platform user

Original plan (D9): `INSERT INTO auth.users (id, email, role, ...) ... ON CONFLICT DO NOTHING` inside the migration. Recovery note's recommendation (and now the confirmed answer): create `platform@subenai.sk` manually via Supabase Dashboard → Authentication → Users → Add user (auto-confirm), then reference it by email lookup in the migration. Why:

- `auth.users` is a Supabase-managed schema. Inserting raw rows requires guessing the exact column list (which Supabase versions silently); the `auth.identities` + `auth.flow_state` companion rows are easy to miss; password hashing scheme is implementation-defined.
- The Dashboard path produces a guaranteed-correct row + the migration's `RAISE NOTICE` fallback (already in the seed at lines 1163-1166) lets Phases B + C apply even if the user forgot step 1 — Phases D + E then NO-OP and the user re-runs after creating the user.
- Aligns with the operational pattern the team has already used for the **audit test user** (CLAUDE.md): "do NOT sign up a new one — production Supabase enforces email confirmation". One-off humans-only step at Dashboard, then the migration is purely SQL.

### Revised phasing

**Phase B' replaces original B + C + D + E** (one PR, one migration, one DEPLOY_SETUP mirror). Phases F, G, H, I, J unchanged. The new shipping order is **6 PRs after #66/#111**, not 9:

| PR | Scope | Migrations | Independent? |
|---|---|---|---|
| #66 ✅ | Typo hotfix (`univerzitnÿch` → `univerzitných`) | 0 | landed |
| #111 ✅ | Salvage `E37_SEED.sql` + recovery note into main | 0 | landed |
| #PR-B' | **Phase B' — mega-migration** (B+C+D+E unified) + types regen + contract test | 1 | ✅ this PR |
| #PR-F | Phase F — read-path refactor (`/tests` + `/tests/$slug`) | 0 | ❌ blocks on B' |
| #PR-G | Phase G — copy upgrade + delete static TS packs | 1 | ❌ blocks on F |
| #PR-H | Phase H — blog frontmatter `related_test_slug` wiring (81 MDX) | 0 | ✅ any time after B' |
| #PR-I | Phase I — UX P0+P1 (3 + 12 items) | 0 | ❌ blocks on F |
| #PR-J | Phase J — tests / lint / build / CHANGELOG / closeout | 0 | ❌ last |

### Operational prerequisite, captured here so it cannot be missed

Before merging PR-B', the user must:

1. Supabase Dashboard → Authentication → Users → **Add user**
2. Email: `platform@subenai.sk` · Auto Confirm: ✓ · Password: any strong value (no human login flow)
3. Verify creation via SQL Editor: `SELECT id FROM auth.users WHERE email = 'platform@subenai.sk';`

Phases B + C of the mega-migration apply regardless; Phases D + E NO-OP with `RAISE NOTICE` until the user exists. After step 1–3 the migration's D + E blocks run on the next paste-once-then-done apply.

## Phase B — Schema groundwork (HISTORICAL — superseded by Phase B')

> **Note (2026-05-21):** This section is preserved for traceability. The actual schema work ships as **Phase B' — mega-migration** (see Phase A3 above). The schema definitions in this section match what's in `E37_SEED.sql` lines 45-460; the seed is the canonical source.

**Branch:** `feature/E37-tests-catalog`
**Migration:** `supabase/migrations/20260521260000_e37_platform_packs_unified.sql` (Phase B' — combined B+C+D+E) + `DEPLOY_SETUP.sql` mirror.

### Tables / columns / RPCs to add
```sql
-- 1. Sibling metadata table — keeps public.tests focused on the user-test
--    shape and avoids polluting it with pack-specific columns. Pack-only
--    fields (industry, emoji, tagline, target_persona, sources, threshold)
--    live here and 1:1 join on test_id.
CREATE TABLE public.platform_pack_metadata (
  test_id uuid PRIMARY KEY REFERENCES public.tests(id) ON DELETE CASCADE,
  industry text NOT NULL,
  industry_emoji text NOT NULL,
  tagline text NOT NULL,
  target_persona text NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  passing_threshold int NOT NULL DEFAULT 70 CHECK (passing_threshold BETWEEN 0 AND 100),
  -- trilingual support — match public.questions pattern
  tagline_en text,
  tagline_cs text,
  target_persona_en text,
  target_persona_cs text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_pack_metadata ENABLE ROW LEVEL SECURITY;

-- Anonymous read — packs are public content.
CREATE POLICY platform_pack_metadata_public_read
  ON public.platform_pack_metadata
  FOR SELECT TO anon, authenticated
  USING (true);

-- Admin-only write.
CREATE POLICY platform_pack_metadata_admin_write
  ON public.platform_pack_metadata
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX platform_pack_metadata_industry_idx
  ON public.platform_pack_metadata (industry);

-- 2. RPC for /tests catalog (list view, anonymous-safe).
CREATE OR REPLACE FUNCTION public.get_platform_packs()
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  tagline text,
  industry text,
  industry_emoji text,
  passing_threshold int,
  question_count int,
  published_at timestamptz
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    t.id, t.slug, t.title, m.tagline, m.industry, m.industry_emoji,
    m.passing_threshold,
    (SELECT COUNT(*) FROM public.test_questions tq WHERE tq.test_id = t.id)::int,
    t.published_at
  FROM public.tests t
  JOIN public.platform_pack_metadata m ON m.test_id = t.id
  WHERE t.status = 'published'
  ORDER BY t.published_at DESC;
$$;

-- 3. RPC for /tests/{slug} detail (pack + questions, anonymous-safe).
--    Returns the pack metadata + ordered question list with the same
--    shape as get_quick_test_questions so the front-end's existing
--    `from-db.ts` mapper can be reused.
CREATE OR REPLACE FUNCTION public.get_pack_with_questions(p_slug text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER STABLE AS $$
  WITH pack AS (
    SELECT t.*, m.*
    FROM public.tests t
    JOIN public.platform_pack_metadata m ON m.test_id = t.id
    WHERE t.slug = p_slug AND t.status = 'published'
    LIMIT 1
  ),
  questions AS (
    SELECT q.*, tq.position
    FROM public.test_questions tq
    JOIN public.questions q ON q.id = tq.question_id
    WHERE tq.test_id = (SELECT id FROM pack)
      AND q.status = 'published'
    ORDER BY tq.position ASC
  )
  SELECT jsonb_build_object(
    'pack', to_jsonb((SELECT row_to_json(p) FROM pack p)),
    'questions', COALESCE(jsonb_agg(to_jsonb(q)) FILTER (WHERE q.id IS NOT NULL), '[]'::jsonb)
  )
  FROM questions q;
$$;

-- 4. Platform-system user (idempotent). Owns all platform packs.
INSERT INTO auth.users (id, email, role, ...)
VALUES ('00000000-0000-0000-0000-000000000037', 'platform@subenai.sk', ...)
ON CONFLICT (id) DO NOTHING;
-- Note: exact INSERT shape depends on auth schema — Phase B will verify.
```

### Verification (Phase B exit criteria)
- Migration applies idempotently (re-run safe)
- `tsc --noEmit` clean after `supabase gen types` regen
- RPCs callable from anon role
- RLS policies admit-only-admin for writes
- No regression on existing `public.tests` queries (snapshot tests)

## Phase C — Question bank expansion (27–32 new questions)

**Migration:** `supabase/migrations/20260521300000_e37_new_questions.sql` + DEPLOY_SETUP mirror.

INSERTs into `public.questions` with deterministic UUIDv5 IDs (mirrors the pattern in `20260518400000_quiz_questions_db_infra.sql`). Trilingual fields populated (Slovak primary, en/cs follow). Sources stored in a new `sources jsonb` column on `public.questions` — **schema change required** (Phase B adds it) since the existing table has no sources column.

Per-pack question authoring (full topic list in Phase A's bank inventory report):

| Pack | New questions |
|---|---|
| heslo-2fa | 5–6 (recovery email phishing · passkey vs SMS legit prompt · HIBP lookalike · credential-stuffing · OAuth consent screen · password-mgr honeypot · session-expired bank popup) |
| ai-deepfake | 4 (AI-personalized phishing · ChatGPT investment scam · AI fake profile photo · voice-clone extortion) |
| socialne-siete | 6–7 (FB OAuth takeover · IG "guidelines" DM · Telegram/WhatsApp investment-group · sponsored fake-eshop ad · brand DM giveaway · compromised-friend money request · Meta security honeypot) |
| rodicia | 4 (teen sextortion · fake teen IG profile · parental-controls bypass · "your child won" SMS) |
| skoly | 3 (EduPage phishing · EU dotácie email · falošný rodič call) |
| zdravotnictvo | 5–6 (e-recept portal · clinic vishing · medical-supplier BEC · ransomware lure · NCZI SMS · eHealth honeypot) |

Each question: Slovak `prompt` (production canonical), Slovak `options[].label` with `correct`+`severity`, `visual` jsonb (sms/email/url/call payload), `branch_slug`, `difficulty`, `status='published'`, deep-linked `sources jsonb`.

## Phase D — Migrate 9 existing packs into DB

**Migration:** `supabase/migrations/20260521400000_e37_migrate_static_packs.sql`.

Per existing static pack (`vseobecny`, `seniori`, `studenti`, `ziaci-do-16`, `eshop`, `gastro-horeca`, `autoservis`, `it-vyvoj`, `verejne-sluzby`):
1. `INSERT INTO public.tests` (slug, title, owner_id=platform-system-user, status='published', published_at)
2. `INSERT INTO public.platform_pack_metadata` (test_id, industry, industry_emoji, tagline, target_persona, sources, passing_threshold)
3. `INSERT INTO public.test_questions` (test_id, question_id, position) — one row per question in the static manifest, with `question_id` resolved via the deterministic UUIDv5 of the legacy slug

The static TS files are the **source of input** for this migration. After it lands and Phase F migrates the read path, the static files are deleted in Phase G.

## Phase E — Add 6 new packs to DB

**Migration:** `supabase/migrations/20260521500000_e37_new_packs.sql`.

Mirrors Phase D's pattern, but for the 6 new packs. Uses the question UUIDs created in Phase C.

| Slug | Industry | Emoji | Question count |
|---|---|---|---|
| heslo-2fa | heslo_2fa | 🔐 | 14 |
| ai-deepfake | ai_deepfake | 🤖 | 14 |
| socialne-siete | socialne_siete | 📱 | 14 |
| rodicia | rodicia | 👨‍👩‍👧 | 13 |
| skoly | skoly | 🏫 | 13 |
| zdravotnictvo | zdravotnictvo | 🏥 | 13 |

## Phase F — Migrate read paths to DB

**Files to refactor:**
- `src/routes/tests.index.tsx` — replace `listPublishedPacks()` (static) with `usePlatformPacks()` hook calling `get_platform_packs()` RPC. SSR-safe via TanStack Query.
- `src/routes/tests.$slug.tsx` — replace `getPackBySlug()` (static) + `getQuestionById()` (static) with a single `usePackWithQuestions(slug)` hook calling `get_pack_with_questions(slug)` RPC.
- `src/components/test-packs/TestPackCard.tsx` — accept the new DB-row shape (or a normalized type bridging static+DB during transition).
- `src/components/test-packs/RelatedTestPacks.tsx` — query via RPC.
- New: `src/lib/platform/pack-queries.ts` — encapsulates the two RPCs.
- New: `src/lib/quiz/from-db.ts` — extend to handle pack questions (probably already covers most of it).
- `src/lib/seo/quiz-jsonld.ts` — `buildPackQuizJsonLd` accepts the new shape.
- `src/components/blog/RelatedTestPackArticleCard.tsx` and `src/components/tests/TestsLearningStrip.tsx` — already DB-backed via `related_test_slug` column; no changes expected.

### Verification
- All 15 `/tests/{slug}` URLs render via DB read with no static fallback
- `tsc --noEmit` clean
- Existing Vitest + Playwright specs pass after locator/query updates
- Lighthouse: no regression on FCP/LCP (DB call is cached via Tanstack Query)

## Phase G — Copy upgrade across all 15 packs

**Migration:** `supabase/migrations/20260521600000_e37_pack_copy_upgrade.sql`.

UPDATE statements on `public.tests` (title) and `public.platform_pack_metadata` (tagline, target_persona, sources) applying the paste-ready Slovak rewrites from Phase A's SEO audit. Per-pack changes documented in the audit; cross-cutting changes:

- Move `X otázok · ~Y min` to front of tagline
- Drop `(55+)`, `(16+)`, `(do 16 rokov)` parens from title
- Replace 18/26 homepage-root source URLs with deep advisory links
- Sweep English/Czech leakage (`scam-y`, `študentský life`, `backoffice`, `operatívci`, `vektory`)
- Apply question-form CTR hook to titles (`rozpoznáš?`, `odhalíš?`, `naletíš?`)

**Phase G also deletes** `src/content/test-packs/*.ts` (all 9 manifest files + `_schema.ts` + `_template.ts` + `index.ts`) and updates `src/i18n/quiz.ts` references. The static layer becomes unreachable from production code.

## Phase H — Wire `related_test_slug` on 81 blog MDX

Unchanged from original plan. Apply primary `related_test_slug` per Phase A's mapping table. Content-only edit of `src/content/blog/*.mdx` frontmatter. 75 of 81 wired; 6 multi-pack candidates resolved to primary.

## Phase I — UX/UI fixes (3 P0 + 12 P1)

Unchanged from original plan. Touch targets, "Pomôž mi vybrať" affordance, sort-label binding, result-count badge, mobile filter scroll-rail, sticky filter, featured-spotlight visual upgrade, CTA reorder, helpful empty state, card meta rewrite, SR-only grid h2, hero aria fix, learning-strip i18n, contrast audit, industry chip relocation. P2 deferred.

Note: Phase F migration may shift testids slightly (DB-shape rows render through different code paths). UX fixes ship **after** Phase F so the testids reflect the final DOM.

## Phase J — Tests, lint, build, CHANGELOG, story closeout

- Vitest: query unit per new RPC, snapshot per new pack, `validatePackQuestionIds`-equivalent against DB
- Vitest: question-CRUD authoring via the new sources jsonb column
- Playwright: E2E per new `/tests/{slug}` route, asserting head meta + h1 + DB-fetched question count
- Playwright: regression on all 9 existing `/tests/{slug}` after Phase F migration
- `npm run lint` → 0/0
- `npm run build` → ✓
- `supabase gen types` regen → committed
- `CHANGELOG.md` Slovak entry
- `tasks/stories/E37.*.md` per-story closeout

## Phasing / shipping order — HISTORICAL

> **Note (2026-05-21):** Superseded by the revised table in Phase A3. The
> original 9-PR breakdown is preserved here for traceability; the new
> shipping path is 6 PRs (B+C+D+E collapsed into Phase B' mega-migration).

| PR | Scope | Files (est.) | Migrations | Tests | Independent? |
|---|---|---|---|---|---|
| #66 ✅ | Typo hotfix | 1 | 0 | 0 | ✅ landed |
| ~~#PR-B~~ | Phase B (schema groundwork) — collapsed into B' | 2 | 1 | 5 | — |
| ~~#PR-C~~ | Phase C (27–32 new questions) — collapsed into B' | 1 | 1 | 30 | — |
| ~~#PR-D~~ | Phase D (migrate 9 existing packs) — collapsed into B' | 1 | 1 | 9 | — |
| ~~#PR-E~~ | Phase E (6 new packs) — collapsed into B' | 1 | 1 | 6 | — |
| #PR-B' | **Phase B' (mega-migration)** | 2 (migration + DEPLOY_SETUP) | 1 | ~15 contract | ✅ |
| #PR-F | Phase F (read-path refactor) | 8 + new hooks | 0 | 15 | ❌ blocks on B' |
| #PR-G | Phase G (copy upgrade + delete static TS) | 1 migration + delete ~12 files | 1 | 9 | ❌ blocks on F |
| #PR-H | Phase H (blog frontmatter) | 81 MDX | 0 | 0 | ✅ (any time after B') |
| #PR-I | Phase I (UX P0+P1) | ~7 + i18n | 0 | 10 | ❌ blocks on F |
| #PR-J | Phase J (closeout) | CHANGELOG + stories | 0 | full suite | ❌ last |

**Total:** 6 PRs after #66 + #111. ~30 files of new/changed application code, ~2 SQL migrations (mega-B' + Phase-G copy upgrade), ~80 MDX content edits, ~85 new tests.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Schema migration on prod requires manual SQL apply per CLAUDE.md | High | Med | Each migration is idempotent + `DEPLOY_SETUP.sql` mirrored. User applies in sequence; preview deploys are non-functional until applied. |
| Platform owner_id creates an auth.users row with no real credentials → security audit flags | Med | Med | Document the row in `tasks/stories/E37.x.md`; assign a non-credential email; explicitly block password auth via constraint. Coordinate with E35 security epic if conflicts arise. |
| DB read path slower than static at SSR | Low | Low | Cache via Tanstack Query + SSR; existing `get_quick_test_questions` is the precedent and performs fine on Cloudflare Pages. |
| 27–32 senior-quality scam scenarios slip timeline | High | Med | Per-pack PRs in waves (PR-C ships in 6 commits — one per pack — for fast review cadence) |
| Static TS file deletion (Phase G) breaks an unnoticed import | Med | Low | `grep -r 'test-packs/' src/` before Phase G; CI catches via `tsc --noEmit` if any reference survives. |
| 5 packs ship with zero blog corpus (`gastro-horeca`, `autoservis`, `verejne-sluzby`, `ziaci-do-16`, `zdravotnictvo`) → detail-page learning-strip empty | High | Low | Flagged as separate "blog topical-coverage" epic. `TestsLearningStrip` already renders gracefully for sparse results. |
| `Industry` enum extension cascades into composer / analytics | Low | Med | Enum stays in TS for the static-manifest deprecation period only. DB stores `industry` as free text — no enum drift risk. Audit before PR-B lands. |
| Bumping `CONSENT_VERSION` accidentally | Low | High | None of these phases touch consent surface. Confirmed. |
| Hotfix #66 becomes irrelevant after Phase G deletes studenti.ts | Cert | Nil | Acceptable. The hotfix repaired SERP for the days between now and Phase G — value extracted. |

## Decisions locked (no further questions before kickoff)

| # | Decision | Resolution |
|---|---|---|
| D1 | Industry enum strategy | Extend by 4 in TS for the deprecation window; DB stores as free-text |
| D2 | Bank coverage policy | Ship-blocking |
| D3 | Typo hotfix shipping | Done (#66) |
| D4 | Scope ambition | Full |
| D5 | Out-of-scope behavioral scenarios | `/courses` follow-up epic |
| D6 | Pack storage architecture | DB-native (`public.tests` + `public.platform_pack_metadata`) |
| D7 | Question authoring path | SQL migration INSERT into `public.questions` |
| D8 | Static TS pack files | Deleted in Phase G after read path lands |
| D9 | Platform owner_id strategy | ~~Dedicated `platform@subenai.sk` system user, idempotent INSERT in Phase B~~ → **Amended 2026-05-21 (Phase A3): created manually via Supabase Dashboard before applying Phase B' migration.** The migration looks up the user by email; D + E blocks NO-OP with `RAISE NOTICE` if absent, so paste-now-create-later is a recoverable mistake. |

## Open questions for project owner (low-priority, surface at PR-B time)

| # | Question |
|---|---|
| OQ1 | Should `public.platform_pack_metadata` include a `featured_position int` column to make the catalog's "spotlight" tile editorial (vs. algorithmic-by-published_at)? Currently algorithmic; editorial is more flexible but adds a CMS surface to maintain. |
| OQ2 | Should the existing `quick_test_config` table be treated as a "platform pack of slug `quick`" and unified under this schema, or kept as a separate construct? Out-of-scope for E37 either way — flagged for a future cleanup epic. |
| OQ3 | Three-language pack copy (sk/en/cs) is wired in the schema but not in scope of this epic's authoring. When the EN+CS translation epic ships, the schema already supports it. |

## Next step (revised 2026-05-21)

Kick off **PR-B' (Phase B' — mega-migration)** on branch `feature/E37-tests-catalog`. The branch is already checked out from the post-#120 main.

**Pre-merge user action (one-off):**
1. Supabase Dashboard → Authentication → Users → Add user
2. Email `platform@subenai.sk`, Auto Confirm ✓, any strong password (no human login flow)
3. Confirm with `SELECT id FROM auth.users WHERE email = 'platform@subenai.sk';`

**What PR-B' contains:**
- `supabase/migrations/20260521260000_e37_platform_packs_unified.sql` — adapted verbatim from `E37_SEED.sql` (1,644 lines), Slovak header stripped of "HOW TO APPLY" CTAs (those live in the PR description / runbook). Idempotent throughout.
- `DEPLOY_SETUP.sql` mirror block (between the existing E46.6 and the end-of-file verify section).
- `src/integrations/supabase/types.ts` — add `platform_pack_metadata` Row/Insert/Update, `sources_jsonb` on `questions`, `get_platform_packs` + `get_pack_with_questions` RPC signatures.
- `tests/db/e37_platform_packs.test.ts` — regex contract test (table shape, RPCs, RLS, idempotency guards).

**PR-B' stops before** any application-code refactor. Phase F (read-path migration in `src/routes/tests.*`) ships as a separate PR so the schema diff can be reviewed independently and the platform-user prerequisite is unambiguously a B'-time concern.

The plan is the contract. PR #66 + #111 have landed; **PR-B' is the next deliverable**.
