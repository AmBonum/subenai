# E37 — Tests catalog DB unification + coverage expansion

**Owner:** Claude (synthesis) — senior agent, multi-lens audit
**Date opened:** 2026-05-20
**Status:** 🟡 Phase A complete (discovery via 4 parallel agents). Phase A2 (architecture pivot, this revision) complete. Phases B–J awaiting kickoff.
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

## Phase B — Schema groundwork

**Branch:** `feature/E37-tests-coverage`
**Migration:** `supabase/migrations/20260521200000_e37_platform_packs_schema.sql` + `DEPLOY_SETUP.sql` mirror.

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

## Phasing / shipping order

| PR | Scope | Files (est.) | Migrations | Tests | Independent? |
|---|---|---|---|---|---|
| #66 ✅ | Typo hotfix | 1 | 0 | 0 | ✅ landed |
| #PR-B | Phase B (schema groundwork) | 2 (migration + DEPLOY_SETUP) | 1 | 5 | ✅ |
| #PR-C | Phase C (27–32 new questions) | 1 migration | 1 | 30 | ❌ blocks on B |
| #PR-D | Phase D (migrate 9 existing packs to DB) | 1 migration | 1 | 9 | ❌ blocks on B+C |
| #PR-E | Phase E (6 new packs to DB) | 1 migration | 1 | 6 | ❌ blocks on B+C |
| #PR-F | Phase F (read-path refactor) | 8 + new hooks | 0 | 15 | ❌ blocks on D+E |
| #PR-G | Phase G (copy upgrade + delete static TS) | 1 migration + delete ~12 files | 1 | 9 | ❌ blocks on F |
| #PR-H | Phase H (blog frontmatter) | 81 MDX | 0 | 0 | ✅ (any time after C) |
| #PR-I | Phase I (UX P0+P1) | ~7 + i18n | 0 | 10 | ❌ blocks on F |
| #PR-J | Phase J (closeout) | CHANGELOG + stories | 0 | full suite | ❌ last |

**Total:** 9 PRs after the hotfix. ~30 files of new/changed application code, ~6 SQL migrations, ~80 MDX content edits, ~85 new tests.

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
| D9 | Platform owner_id strategy | Dedicated `platform@subenai.sk` system user, idempotent INSERT in Phase B |

## Open questions for project owner (low-priority, surface at PR-B time)

| # | Question |
|---|---|
| OQ1 | Should `public.platform_pack_metadata` include a `featured_position int` column to make the catalog's "spotlight" tile editorial (vs. algorithmic-by-published_at)? Currently algorithmic; editorial is more flexible but adds a CMS surface to maintain. |
| OQ2 | Should the existing `quick_test_config` table be treated as a "platform pack of slug `quick`" and unified under this schema, or kept as a separate construct? Out-of-scope for E37 either way — flagged for a future cleanup epic. |
| OQ3 | Three-language pack copy (sk/en/cs) is wired in the schema but not in scope of this epic's authoring. When the EN+CS translation epic ships, the schema already supports it. |

## Next step

Kick off **PR-B (Phase B — schema groundwork)** on branch `feature/E37-tests-coverage`. Migration is the contract — once it lands and the platform user exists, every downstream PR is a series of INSERT/UPDATE statements + application-code refactors. Stops before PR-C to let the user code-review the schema and platform-owner pattern before any content authoring.

The plan is the contract. PR #66 has landed; PR-B starts when the user confirms kickoff.
