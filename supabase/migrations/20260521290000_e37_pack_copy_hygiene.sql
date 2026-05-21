-- ============================================================================
-- E37 Phase G (subset 1) — pack copy hygiene
-- ============================================================================
-- Plan: tasks/PLAN-2026-05-20-E37-tests-coverage.md (Phase G)
--
-- Applies the **algorithmic** subset of the Phase G copy upgrade:
--   1. Drop age qualifiers from pack titles (`(55+)`, `(16+)`,
--      `(do 16 rokov)`) — they push the CTR-relevant noun off the
--      SERP visible-width on mobile.
--   2. Sweep English/Czech leakage from titles, taglines, target
--      personas, and source labels:
--        scam-y       → podvody        (Slovak plural)
--        scam-erov    → podvodníkov
--        Backoffice   → Back-office
--        operatívci   → operatíva
--        vektory      → útoky          (cybersec sense)
--   3. Strip `Fake ` prefix where it appears in taglines (Slovak
--      readers parse `falošné` more naturally).
--
-- NOT in scope of this migration (deferred to a follow-up Phase G2
-- migration that needs the SEO writer's input):
--   - Question-form CTR hooks on titles (rozpoznáš? · odhalíš?)
--   - Tagline rewrites beyond the leakage sweep
--   - Source URL deep-linking (homepage roots → specific advisory
--     pages on sk-cert.sk, minv.sk, ENISA, Europol)
--   - Target-persona prose rewrites
--
-- All UPDATEs are idempotent: each WHERE clause matches the OLD
-- string so re-running is a no-op. They DO NOT use ON CONFLICT
-- because they're UPDATEs, but the WHERE-by-old-value pattern is
-- equivalent — once the old value is gone, the row no longer
-- matches and the UPDATE is a silent no-op.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- (1) public.tests.title — drop age parens + sweep leakage
-- ----------------------------------------------------------------------------

-- Seniori (55+) → Seniori
UPDATE public.tests
   SET title = 'Seniori — podvody cielené na starších'
 WHERE slug = 'seniori'
   AND title = 'Seniori (55+) — podvody cielené na starších';

-- Študenti (16+) → Študenti
UPDATE public.tests
   SET title = 'Študenti — podvody, na ktoré naletia pri štúdiu'
 WHERE slug = 'studenti'
   AND title = 'Študenti (16+) — podvody, na ktoré naletia pri štúdiu';

-- Žiaci (do 16 rokov) → Žiaci. The `žiaci` noun already implies
-- primary/middle-school age in Slovak, so the qualifier is
-- redundant. Distinct from `študenti` (secondary / university).
UPDATE public.tests
   SET title = 'Žiaci — bezpečnosť na internete'
 WHERE slug = 'ziaci-do-16'
   AND title = 'Žiaci (do 16 rokov) — bezpečnosť na internete';

-- Autoservis — `scam-y` → `podvody`
UPDATE public.tests
   SET title = 'Autoservis — podvody proti dielenskému tímu'
 WHERE slug = 'autoservis'
   AND title = 'Autoservis — scam-y proti dielenskému tímu';

-- IT a softvérový vývoj — `vektory` → `útoky`
UPDATE public.tests
   SET title = 'IT a softvérový vývoj — pokročilé útoky'
 WHERE slug = 'it-vyvoj'
   AND title = 'IT a softvérový vývoj — pokročilé vektory';

-- ----------------------------------------------------------------------------
-- (2) public.platform_pack_metadata.tagline — sweep leakage
-- ----------------------------------------------------------------------------

-- studenti — `job scam-y` → `podvody s ponukami práce`
UPDATE public.platform_pack_metadata m
   SET tagline = 'Fake prenájmy izby pred zápisom, phishing univerzitných portálov AIS2, falošné Erasmus+ štipendiá, Discord Nitro a podvody s ponukami práce. 13 otázok.'
  FROM public.tests t
 WHERE m.test_id = t.id
   AND t.slug = 'studenti'
   AND m.tagline = 'Fake prenájmy izby pred zápisom, phishing univerzitných portálov AIS2, falošné Erasmus+ štipendiá, Discord Nitro a job scam-y. 13 otázok.';

-- ziaci-do-16 — `Discord a gaming scam-y` → `Podvody v Discorde a hrách`
UPDATE public.platform_pack_metadata m
   SET tagline = 'Podvody v Discorde a hrách, falošné súťaže na TikToku, phishing školských kont, podvody s brigádami. 14 otázok pre mladých používateľov.'
  FROM public.tests t
 WHERE m.test_id = t.id
   AND t.slug = 'ziaci-do-16'
   AND m.tagline = 'Discord a gaming scam-y, falošné súťaže na TikToku, phishing školských kont, podvody s brigádami. 14 otázok pre mladých používateľov.';

-- ai-deepfake — `4 najnovšie vektory` → `4 najnovšie útoky`
UPDATE public.platform_pack_metadata m
   SET tagline = '4 najnovšie útoky: AI-personalizovaný phishing s reálnym kontextom z LinkedIn, ChatGPT-poháňané investičné podvody, AI-generované dating profily a voice-clone vydieranie. 30 sekúnd audia stačí.'
  FROM public.tests t
 WHERE m.test_id = t.id
   AND t.slug = 'ai-deepfake'
   AND m.tagline = '4 najnovšie vektory: AI-personalizovaný phishing s reálnym kontextom z LinkedIn, ChatGPT-poháňané investičné podvody, AI-generované dating profily a voice-clone vydieranie. 30 sekúnd audia stačí.';

-- ----------------------------------------------------------------------------
-- (3) public.platform_pack_metadata.target_persona — sweep leakage
-- ----------------------------------------------------------------------------

-- eshop — Backoffice → Back-office, operatívci → operatíva,
--         scam-erov → podvodníkov.
UPDATE public.platform_pack_metadata m
   SET target_persona = 'Back-office, zákaznícka podpora a operatíva e-shopu — kontaktný bod podvodníkov, ktorí zneužívajú objednávkový a reklamačný flow.'
  FROM public.tests t
 WHERE m.test_id = t.id
   AND t.slug = 'eshop'
   AND m.target_persona = 'Backoffice, customer support a operatívci e-shopu — kontaktný bod scam-erov, ktorí zneužívajú objednávkový a reklamačný flow.';

-- ----------------------------------------------------------------------------
-- (4) Source-label leakage in JSONB arrays
-- ----------------------------------------------------------------------------
-- Replaces just the offending label string while preserving the
-- full sources_jsonb array shape. Uses jsonb regex-replace via
-- jsonb_set is not viable here (the array index is variable), so
-- we cast to text, regexp_replace, and cast back. Idempotent
-- because the WHERE clause matches on the OLD substring.

UPDATE public.platform_pack_metadata m
   SET sources_jsonb = regexp_replace(
         sources_jsonb::text,
         'Europol — gaming a social media scam-y 2024',
         'Europol — podvody v hrách a na sociálnych sieťach 2024'
       )::jsonb
  FROM public.tests t
 WHERE m.test_id = t.id
   AND t.slug = 'ziaci-do-16'
   AND sources_jsonb::text LIKE '%Europol — gaming a social media scam-y 2024%';

-- ============================================================================
-- Verification — paste after applying to confirm the sweep landed.
-- ============================================================================
--   SELECT slug, title FROM public.tests
--    WHERE slug IN ('seniori','studenti','ziaci-do-16','autoservis','it-vyvoj')
--    ORDER BY slug;
--   -- expect: no `(55+)`, `(16+)`, `(do 16 rokov)`, `scam-y`, `vektory` anywhere
--
--   SELECT t.slug, m.tagline, m.target_persona
--     FROM public.tests t
--     JOIN public.platform_pack_metadata m ON m.test_id = t.id
--    WHERE t.slug IN ('studenti','ziaci-do-16','ai-deepfake','eshop');
--   -- expect: no `scam-y`, `scam-erov`, `Backoffice`, `operatívci`, `vektory`,
--   --         `gaming` (Slovak text only).
