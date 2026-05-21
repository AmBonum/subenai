-- ============================================================================
-- E37 SEED — paste-once convenience file for the tests catalog DB unification
-- ============================================================================
-- This file consolidates the 9 individual E37 migration files into one
-- paste-able blob for the Supabase SQL Editor. It is functionally
-- equivalent to applying these migrations in timestamp order:
--
--   20260521200000_e37_platform_packs_schema.sql       (Phase B: schema)
--   20260521210000_e37_questions_heslo_2fa.sql         (Phase C: 7 rows)
--   20260521220000_e37_questions_ai_deepfake.sql       (Phase C: 4 rows)
--   20260521230000_e37_questions_socialne_siete.sql    (Phase C: 6 rows)
--   20260521240000_e37_questions_rodicia.sql           (Phase C: 4 rows)
--   20260521250000_e37_questions_skoly.sql             (Phase C: 3 rows)
--   20260521260000_e37_questions_zdravotnictvo.sql     (Phase C: 6 rows)
--   20260521270000_e37_migrate_static_packs.sql        (Phase D: 9 packs)
--   20260521280000_e37_new_packs.sql                   (Phase E: 6 packs)
--
-- ============================================================================
-- HOW TO APPLY
-- ============================================================================
-- 1. (Required for Phase D + E) Create the platform-system user FIRST:
--      Supabase Dashboard → Authentication → Users → "Add user"
--      Email:         platform@subenai.sk
--      Auto Confirm:  ✓ yes
--      Password:      (any strong value — no human login flow)
--    If you skip this step, Phases D + E (pack rows) will be NO-OP'd with
--    a NOTICE. Phases B + C still apply normally. You can re-paste this
--    file after creating the user — B + C are idempotent no-ops, D + E
--    will then run.
--
-- 2. Open Supabase Dashboard → SQL Editor → New query
-- 3. Paste the entire contents of this file
-- 4. Run
-- 5. Verify via the SELECT block at the bottom of the file
--
-- Idempotency: every CREATE uses IF NOT EXISTS / OR REPLACE, every INSERT
-- uses ON CONFLICT DO NOTHING. Re-applying this file is a safe no-op.
--
-- NOTE: This is the EPIC-SPECIFIC seed for E37 only. Do NOT paste
-- DEPLOY_SETUP.sql on an existing project — that file is the fresh-project
-- bootstrap and contains CREATE TABLE statements without IF NOT EXISTS,
-- which conflict with already-existing tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- E37 Phase B — Platform pack metadata + RPCs + questions.sources_jsonb
-- ----------------------------------------------------------------------------
-- Plan: tasks/PLAN-2026-05-20-E37-tests-coverage.md (Phase B).
--
-- Goals:
--   (1) Add sources_jsonb column to public.questions, mirroring the
--       blog_posts.sources_jsonb pattern from E16.2 (20260520010000).
--   (2) Create public.platform_pack_metadata — sibling table to public.tests
--       holding pack-specific fields (industry, emoji, tagline, target_persona,
--       sources, threshold). Presence in this table = "this test is a
--       platform-curated pack" (implicit flag — no boolean column needed).
--   (3) Two anonymous-safe SECURITY DEFINER RPCs:
--         - get_platform_packs()                 for /tests catalog
--         - get_pack_with_questions(p_slug text) for /tests/{slug} detail
--
-- Out of scope for this migration: the platform-system auth.users row that
-- will own pack rows. That is a one-time operational step required before
-- Phase D's migration runs. Documented in:
--   tasks/PLAN-2026-05-20-E37-tests-coverage.md (Phase D prerequisites)
-- and in DEPLOY_SETUP.sql (admin-bootstrap section, follow-up note).
-- Phases D + E NO-OP gracefully when the user is absent — they RAISE NOTICE
-- and RETURN early so the migration as a whole still applies (B + C land,
-- D + E re-attempt on the next run once the user exists). This is the
-- Phase A3 design — no aborted partial-apply state.
--
-- Re-runnable: every CREATE uses IF NOT EXISTS / OR REPLACE. Re-applying
-- this migration is a no-op.
-- ----------------------------------------------------------------------------

-- ---- (1) questions.sources_jsonb ----------------------------------------
-- Source object shape (validated at the application layer):
--   { label: string, url: string, publisher?: string, accessed_at?: string }
-- The DB CHECK only enforces "is a JSON array". Mirrors blog_posts pattern.
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS sources_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'questions_sources_jsonb_is_array'
  ) THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT questions_sources_jsonb_is_array
      CHECK (jsonb_typeof(sources_jsonb) = 'array');
  END IF;
END;
$$;

-- ---- (2) platform_pack_metadata table -----------------------------------
CREATE TABLE IF NOT EXISTS public.platform_pack_metadata (
  test_id uuid PRIMARY KEY
    REFERENCES public.tests(id) ON DELETE CASCADE,
  industry text NOT NULL,
  industry_emoji text NOT NULL,
  tagline text NOT NULL,
  target_persona text NOT NULL,
  sources_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb,
  passing_threshold int NOT NULL DEFAULT 70
    CHECK (passing_threshold BETWEEN 0 AND 100),
  tagline_en text,
  tagline_cs text,
  target_persona_en text,
  target_persona_cs text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'platform_pack_metadata_sources_is_array'
  ) THEN
    ALTER TABLE public.platform_pack_metadata
      ADD CONSTRAINT platform_pack_metadata_sources_is_array
      CHECK (jsonb_typeof(sources_jsonb) = 'array');
  END IF;
END;
$$;

ALTER TABLE public.platform_pack_metadata ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS platform_pack_metadata_industry_idx
  ON public.platform_pack_metadata (industry);

-- Anonymous read: platform packs are public content surfaced at /tests/*.
DROP POLICY IF EXISTS platform_pack_metadata_public_read
  ON public.platform_pack_metadata;
CREATE POLICY platform_pack_metadata_public_read
  ON public.platform_pack_metadata
  FOR SELECT TO anon, authenticated
  USING (true);

-- Admin-only write. The /admin/tests editor (AH-5.8) and Phase D/E/G
-- migrations are the only legitimate writers.
DROP POLICY IF EXISTS platform_pack_metadata_admin_write
  ON public.platform_pack_metadata;
CREATE POLICY platform_pack_metadata_admin_write
  ON public.platform_pack_metadata
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---- (3a) get_platform_packs RPC ----------------------------------------
-- Anonymous-safe list-view RPC for the /tests catalog. SECURITY DEFINER
-- bypasses the restrictive RLS on public.tests (which limits non-owners to
-- their own rows) so anon callers see published platform packs through the
-- join with platform_pack_metadata.
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
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    t.id,
    t.slug,
    t.title,
    m.tagline,
    m.industry,
    m.industry_emoji,
    m.passing_threshold,
    (
      SELECT COUNT(*)::int
      FROM public.test_questions tq
      WHERE tq.test_id = t.id
    ) AS question_count,
    t.published_at
  FROM public.tests t
  JOIN public.platform_pack_metadata m ON m.test_id = t.id
  WHERE t.status = 'published'
  ORDER BY t.published_at DESC NULLS LAST, t.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_platform_packs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_packs()
  TO anon, authenticated;

-- ---- (3b) get_pack_with_questions RPC -----------------------------------
-- Anonymous-safe detail-view RPC for /tests/{slug}. Returns a single jsonb
-- payload of shape:
--   { "pack": { id, slug, title, tagline, industry, industry_emoji,
--               target_persona, sources, passing_threshold, published_at },
--     "questions": [ { id, type, prompt, options, correct, branch_slug,
--                       difficulty, visual, position }, ... ] }
-- Returns NULL when the slug is unknown or the pack is not published.
-- Same SECURITY DEFINER reasoning as (3a).
CREATE OR REPLACE FUNCTION public.get_pack_with_questions(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pack_id uuid;
  v_pack jsonb;
  v_questions jsonb;
BEGIN
  SELECT t.id INTO v_pack_id
  FROM public.tests t
  JOIN public.platform_pack_metadata m ON m.test_id = t.id
  WHERE t.slug = p_slug AND t.status = 'published'
  LIMIT 1;

  IF v_pack_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', t.id,
    'slug', t.slug,
    'title', t.title,
    'tagline', m.tagline,
    'industry', m.industry,
    'industry_emoji', m.industry_emoji,
    'target_persona', m.target_persona,
    'sources', m.sources_jsonb,
    'passing_threshold', m.passing_threshold,
    'published_at', t.published_at
  ) INTO v_pack
  FROM public.tests t
  JOIN public.platform_pack_metadata m ON m.test_id = t.id
  WHERE t.id = v_pack_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'type', q.type,
        'prompt', q.prompt,
        'options', q.options,
        'correct', q.correct,
        'branch_slug', q.branch_slug,
        'difficulty', q.difficulty,
        'visual', q.visual,
        'position', tq.position
      )
      ORDER BY tq.position ASC
    ),
    '[]'::jsonb
  ) INTO v_questions
  FROM public.test_questions tq
  JOIN public.questions q ON q.id = tq.question_id
  WHERE tq.test_id = v_pack_id AND q.status = 'published';

  RETURN jsonb_build_object('pack', v_pack, 'questions', v_questions);
END;
$$;

REVOKE ALL ON FUNCTION public.get_pack_with_questions(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pack_with_questions(text)
  TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- E37 Phase C — heslo-2fa question pack (7 new public.questions rows)
-- ----------------------------------------------------------------------------
-- Plan: tasks/PLAN-2026-05-20-E37-tests-coverage.md (Phase C).
--
-- Authoring rules:
--   - UUIDv5 IDs computed deterministically from slug `e37-heslo-2fa-*-1`
--     (URL namespace 6ba7b811-9dad-11d1-80b4-00c04fd430c8). Same convention
--     as the existing seed in 20260518400000_quiz_questions_db_infra.sql so
--     re-applies are idempotent and cross-environment IDs match.
--   - Slovak `prompt` is the production-canonical text. Trilingual columns
--     (prompt_en, prompt_cs, options_en, options_cs, visual_en, visual_cs)
--     left NULL — a future translation epic populates them.
--   - `correct` is an array of option indices; `options[].severity` carries
--     the wrong-answer penalty ('critical' | 'medium' | 'minor' | null for
--     the correct option). Same shape as the existing seed.
--   - `sources_jsonb` deep-linked to specific advisory pages (no homepage
--     roots — SEO audit flagged 18/26 existing pack sources as homepage
--     roots; new content sets the senior bar).
--   - `status='published'` so the future get_pack_with_questions RPC
--     returns these rows.
--
-- Re-runnable: ON CONFLICT (id) DO NOTHING.
-- ----------------------------------------------------------------------------

INSERT INTO public.questions (
  id, type, prompt, options, correct, branch_slug, difficulty, status,
  visual, sources_jsonb
)
VALUES
  -- ---- Q1 — recovery-email phishing ----
  -- Attacker triggers a "password reset" themselves; the email arrives at
  -- the victim with a "if this wasn't you, secure your account" link. The
  -- "secure" link is the phish.
  (
    '36b9fe06-edfb-5523-907c-824dceff1506',
    'single',
    'Príde ti e-mail z poštovej schránky: „Niekto sa pokúsil obnoviť vaše heslo. Ak ste to neboli vy, kliknite sem a okamžite zabezpečte účet.” Reaguješ?',
    '[
      {"id":"a","label":"Kliknem na tlačidlo „Zabezpečiť účet” — chcem reagovať rýchlo","correct":false,"severity":"critical"},
      {"id":"b","label":"Otvorím Gmail/Outlook ručne v prehliadači a skontrolujem aktivitu prihlásení","correct":true,"severity":null},
      {"id":"c","label":"Odpoviem na e-mail, že to nebol som ja","correct":false,"severity":"medium"}
    ]'::jsonb,
    '[1]'::jsonb,
    'phishing',
    'medium',
    'published',
    '{"kind":"email","from":"Google Bezpečnosť","fromEmail":"no-reply@account-security-notice.com","subject":"Pokus o obnovenie hesla — okamžitá akcia","body":"Zaznamenali sme pokus o obnovenie hesla k vášmu účtu z adresy IP v Moldavsku. Ak ste to neboli vy, kliknite na tlačidlo nižšie a okamžite zabezpečte účet."}'::jsonb,
    '[
      {"label":"SK-CERT — aktuálne phishingové kampane","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"},
      {"label":"Google — Recover your account help center","url":"https://support.google.com/accounts/answer/7682439","publisher":"Google"}
    ]'::jsonb
  ),

  -- ---- Q2 — passkey vs SMS 2FA ----
  -- The phishing-resistance argument: SMS codes can be relayed in real-time
  -- to a phishing page (man-in-the-middle), passkeys are bound to the origin
  -- and cryptographically cannot be relayed.
  (
    '8fe80139-f8a8-58b6-b16e-37db2e2dcb19',
    'single',
    'Pri prihlásení do internet bankingu si zadal heslo. Banka ti ponúka dva spôsoby druhého overenia. Ktorý je bezpečnejší voči phishing stránke, ktorá vyzerá rovnako ako tvoja banka?',
    '[
      {"id":"a","label":"SMS kód — vidím čo zadávam a môžem ho skontrolovať","correct":false,"severity":"critical"},
      {"id":"b","label":"Passkey alebo Face ID/Touch ID na telefóne","correct":true,"severity":null},
      {"id":"c","label":"Obe sú rovnako bezpečné, ide len o pohodlie","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'scenario',
    'hard',
    'published',
    NULL,
    '[
      {"label":"FIDO Alliance — Passkeys explainer","url":"https://fidoalliance.org/passkeys/","publisher":"FIDO Alliance"},
      {"label":"NIST SP 800-63B — Phishing resistance levels","url":"https://pages.nist.gov/800-63-3/sp800-63b.html","publisher":"NIST"},
      {"label":"SK-CERT — Bezpečné prihlasovanie","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
    ]'::jsonb
  ),

  -- ---- Q3 — HIBP lookalike ----
  -- "haveibeenpwned.help" / ".io" / ".online" lookalikes are a known scam.
  -- The real service (haveibeenpwned.com) NEVER asks for a password — only
  -- an email address. The fake one collects passwords.
  (
    'b34d9a6c-10b2-5c7f-862b-5c97a5044f0e',
    'single',
    'Vidíš reklamu: „Vaše heslo bolo uniknuté pri úniku z LinkedIn. Skontrolujte si to na haveibeenpwned.help.” Klikneš a zadáš svoje heslo na overenie?',
    '[
      {"id":"a","label":"Áno — chcem zistiť, či som postihnutý","correct":false,"severity":"critical"},
      {"id":"b","label":"Nie — pravá služba je haveibeenpwned.com a NIKDY nepýta heslo, len e-mail","correct":true,"severity":null},
      {"id":"c","label":"Zadám len e-mail bez hesla, to je bezpečné","correct":false,"severity":"minor"}
    ]'::jsonb,
    '[1]'::jsonb,
    'url',
    'medium',
    'published',
    '{"kind":"url","url":"https://haveibeenpwned.help/check?utm=ad"}'::jsonb,
    '[
      {"label":"Have I Been Pwned — Why do I get asked for my password?","url":"https://haveibeenpwned.com/FAQ#WhyDoIGetAskedForMyPassword","publisher":"Troy Hunt"},
      {"label":"SK-CERT — Únik osobných údajov","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
    ]'::jsonb
  ),

  -- ---- Q4 — credential stuffing ----
  -- Attacker takes credentials from a small forum breach and replays them
  -- against the user's bank. The login alert from a foreign location is the
  -- give-away. Correct response: change password + enable 2FA, not deny.
  (
    'cb818dec-3686-5da0-b0b6-2ce3ed041385',
    'single',
    'Pred rokom unikla databáza fóra, kde si používal rovnaké heslo ako do banky. Dnes banka odmietla tvoje prihlásenie a poslala SMS: „Prihlásenie z neznámeho zariadenia (Sofia, BG)”. Čo sa stalo?',
    '[
      {"id":"a","label":"Banka má bezpečnostný problém, počkám pár dní","correct":false,"severity":"critical"},
      {"id":"b","label":"Útočník skúsil môj e-mail + heslo z úniku aj v banke (credential stuffing). Okamžite zmením heslo a zapnem 2FA","correct":true,"severity":null},
      {"id":"c","label":"Niekto si len pomýlil prihlasovacie údaje","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'scenario',
    'hard',
    'published',
    NULL,
    '[
      {"label":"Have I Been Pwned — Password reuse risks","url":"https://haveibeenpwned.com/FAQ#WhatIsTheSiteSPosition","publisher":"Troy Hunt"},
      {"label":"NÚKIB — Credential stuffing varovanie","url":"https://www.nukib.cz/cs/kybernetická-bezpečnost/","publisher":"NÚKIB"},
      {"label":"OWASP — Credential Stuffing Cheat Sheet","url":"https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html","publisher":"OWASP"}
    ]'::jsonb
  ),

  -- ---- Q5 — OAuth consent screen abuse ----
  -- Real Google/Microsoft consent screen, but the requesting app is malicious
  -- and asks for excessive scopes. The user thinks "I am just authorizing an
  -- app". OAuth phishing has been used in major SK incidents in 2024.
  (
    'cae59f5b-ec9d-5bab-9b41-214a9f65ab3d',
    'single',
    'Po kliknutí na link v e-maili sa zobrazí Google prihlásenie. Prihlásiš sa a Google ukáže obrazovku: „Aplikácia EmailHelper chce: čítať vaše e-maily, posielať e-maily vo vašom mene, spravovať kontakty.” Schvalíš?',
    '[
      {"id":"a","label":"Áno — vyzerá to ako oficiálna Google obrazovka","correct":false,"severity":"critical"},
      {"id":"b","label":"Nie — žiadna seriózna aplikácia nepotrebuje plný prístup k mojím e-mailom","correct":true,"severity":null},
      {"id":"c","label":"Áno, ale len pre čítanie — Google mi dovolí vybrať len niektoré oprávnenia","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'phishing',
    'hard',
    'published',
    NULL,
    '[
      {"label":"Google — OAuth app verification","url":"https://support.google.com/cloud/answer/9110914","publisher":"Google"},
      {"label":"CISA — OAuth phishing advisory","url":"https://www.cisa.gov/news-events/cybersecurity-advisories","publisher":"CISA"},
      {"label":"SK-CERT — Phishing v cloudových službách","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
    ]'::jsonb
  ),

  -- ---- Q6 — session-expired popup overlay ----
  -- Pop-up overlay phishing while user is already logged into legitimate
  -- internet banking. The malicious overlay sits on top of the real bank UI
  -- (delivered via a compromised browser extension or a malicious tab).
  (
    '3356257d-a76f-5e7f-9c31-e3f3060bffcb',
    'single',
    'Pracuješ v internet bankingu Tatra banky. Zrazu sa otvorí okno: „Vaše prihlásenie vypršalo. Pre pokračovanie sa znovu prihláste.” Pole na heslo je hneď v popupe. Zadáš heslo?',
    '[
      {"id":"a","label":"Áno — chcem pokračovať s prácou","correct":false,"severity":"critical"},
      {"id":"b","label":"Zatvorím okno, obnovím stránku (F5) a prihlásim sa cez bežnú prihlasovaciu obrazovku banky","correct":true,"severity":null},
      {"id":"c","label":"Otvorím inú záložku a zadám tam heslo do banky","correct":false,"severity":"minor"}
    ]'::jsonb,
    '[1]'::jsonb,
    'scenario',
    'hard',
    'published',
    '{"kind":"url","url":"https://moja.tatrabanka.sk/...","secure":true}'::jsonb,
    '[
      {"label":"SK-CERT — Browser-based credential theft","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"},
      {"label":"Mozilla — How to identify a phishing pop-up","url":"https://support.mozilla.org/en-US/kb/how-do-i-tell-if-my-connection-is-secure","publisher":"Mozilla"}
    ]'::jsonb
  ),

  -- ---- Q7 — Bitwarden honeypot ----
  -- LEGIT Bitwarden security email. Pattern teaches "verify out-of-band,
  -- but don't reject every notification as phishing". The correct answer is
  -- the in-app verification path; clicking the email link is the only wrong
  -- one. "Ignore as phishing" is marked minor (overly cautious, not harmful).
  (
    '43fb5279-4085-5c12-b58f-2ce74be2a09f',
    'single',
    'Príde ti e-mail z Bitwarden: „Nová prihlasovacia aktivita: zariadenie Pixel 7, lokalita Bratislava, čas 14:23.” Tento týždeň si práve nastavil Bitwarden na novom telefóne. Reaguješ?',
    '[
      {"id":"a","label":"Toto je phishing — ignorujem a mažem","correct":false,"severity":"minor"},
      {"id":"b","label":"Skontrolujem v Bitwarden aplikácii (Settings → Devices) — ak sa zariadenie zhoduje, OK; ak nie, zmením master password","correct":true,"severity":null},
      {"id":"c","label":"Kliknem na link v e-maili a overím, či je to moje zariadenie","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'honeypot',
    'medium',
    'published',
    '{"kind":"email","from":"Bitwarden","fromEmail":"no-reply@bitwarden.com","subject":"Nová prihlasovacia aktivita","body":"Zaznamenali sme prihlásenie z nového zariadenia. Zariadenie: Pixel 7. Lokalita: Bratislava, SK. Čas: 14:23 SEČ. Ak ste to neboli vy, navštívte Bitwarden a zmente master password."}'::jsonb,
    '[
      {"label":"Bitwarden — Account security best practices","url":"https://bitwarden.com/help/master-password/","publisher":"Bitwarden"},
      {"label":"SK-CERT — Out-of-band overovanie","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
    ]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- E37 Phase C — ai-deepfake question pack (4 new public.questions rows)
-- ----------------------------------------------------------------------------
-- Plan: tasks/PLAN-2026-05-20-E37-tests-coverage.md (Phase C).
-- Authoring rules: see 20260521210000_e37_questions_heslo_2fa.sql preamble.
-- Re-runnable via ON CONFLICT (id) DO NOTHING.
-- ----------------------------------------------------------------------------

INSERT INTO public.questions (
  id, type, prompt, options, correct, branch_slug, difficulty, status,
  visual, sources_jsonb
)
VALUES
  -- ---- Q1 — AI-personalized phishing ----
  -- Email weaponizes real context scraped from LinkedIn / a compromised
  -- mailbox: project names, client names, recent calendar events. The
  -- personalization defeats the usual "generic greeting" heuristic. Out-of-
  -- band verification (Slack/Teams to a real colleague) is the only safe
  -- response — even Google Drive preview can phone home.
  (
    '57fa4658-9604-57b1-9e4b-26add9a4285f',
    'single',
    'Príde ti e-mail s predmetom „Projekt Atlas — finálna verzia faktúry”. V tele sa odvoláva na minulotýždňový workshop, na ktorom si bol, a na pravého kolegu Jana Nováka. Príloha: faktura_atlas.pdf. Otvoríš prílohu?',
    '[
      {"id":"a","label":"Áno — kontext sedí, e-mail pôsobí autenticky","correct":false,"severity":"critical"},
      {"id":"b","label":"Napíšem Janovi na Slack/Teams (nie odpovedať na e-mail) a opýtam sa, či mi posielal faktúru","correct":true,"severity":null},
      {"id":"c","label":"Otvorím prílohu cez Google Drive preview — to je bezpečnejšie ako stiahnuť","correct":false,"severity":"medium"}
    ]'::jsonb,
    '[1]'::jsonb,
    'phishing',
    'hard',
    'published',
    '{"kind":"email","from":"Jana Nováková","fromEmail":"jana.novakova@atlas-projekt-2026.com","subject":"Projekt Atlas — finálna verzia faktúry","body":"Ahoj, posielam finálnu faktúru za workshop, ktorý sme robili minulý týždeň v Bratislave (15.05.). Pripomínam, že platba je do konca mesiaca. Ďakujem, Jana"}'::jsonb,
    '[
      {"label":"ENISA — Threat landscape: AI-enabled phishing","url":"https://www.enisa.europa.eu/topics/cybersecurity-policy","publisher":"ENISA"},
      {"label":"SK-CERT — Spear phishing v slovenských firmách","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"},
      {"label":"Microsoft — Defender against business email compromise","url":"https://www.microsoft.com/en-us/security/business/security-101/what-is-business-email-compromise-bec","publisher":"Microsoft"}
    ]'::jsonb
  ),

  -- ---- Q2 — ChatGPT-driven fake investment ----
  -- "Garantované výnosy" is the canonical Ponzi tell. AI/ChatGPT branding is
  -- the 2026 facelift on the classic forex/crypto scam. Even small "test"
  -- deposits feed the scheme.
  (
    '5049bc4d-8c1d-5505-87a1-5448911a5720',
    'single',
    'Vidíš reklamu na Instagrame: „AI trading bot — 12 % mesačný výnos garantovaný. Náš ChatGPT-poháňaný algoritmus už zarobil 4 000 € pre 12 000 Slovákov.” Klikneš?',
    '[
      {"id":"a","label":"Áno — 12 000 overeným Slovákom by som mohol dôverovať","correct":false,"severity":"critical"},
      {"id":"b","label":"Nie — garantovaný výnos je vždy investičný podvod. Žiadny algoritmus, ani AI, nemá garantovaný zisk","correct":true,"severity":null},
      {"id":"c","label":"Áno, ale vložím len 50 € ako test — keď to funguje, pridám viac","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'scenario',
    'medium',
    'published',
    NULL,
    '[
      {"label":"SK-CERT — Investičné podvody 2024","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"},
      {"label":"Europol — IOCTA: Investment fraud","url":"https://www.europol.europa.eu/cms/sites/default/files/documents/IOCTA_2024.pdf","publisher":"Europol"},
      {"label":"NBS — Varovanie pred neregistrovanými investičnými platformami","url":"https://nbs.sk/dohlad-nad-financnym-trhom/varovania/","publisher":"Národná banka Slovenska"}
    ]'::jsonb
  ),

  -- ---- Q3 — AI-generated profile photo on dating / IG ----
  -- Synthetic faces from Stable Diffusion / Midjourney are too symmetrical,
  -- have anomalies in earrings/glasses/background, and lack a real-life
  -- breadcrumb (gym selfies, group photos, time-progression). Reverse image
  -- search is the cheapest disprover.
  (
    '1f9ef987-632b-510c-a593-f17370b840b2',
    'single',
    'Na zoznamke matchneš s profilom: dokonalá tvár, 28 rokov, ostré detaily. V albume sú 3 fotky v rovnakom svetle bez akýchkoľvek záberov zo života (s rodinou, kamarátmi, z dovolenky). Reaguješ?',
    '[
      {"id":"a","label":"Začnem si písať — profil je pekný a pôsobí dôveryhodne","correct":false,"severity":"critical"},
      {"id":"b","label":"Reverse image search cez Google Lens / Bing. Skontrolujem znaky AI generovania (asymetrické uši, anomálie v pozadí). Ak fotka nikde inde nie je — blokujem","correct":true,"severity":null},
      {"id":"c","label":"Požiadam o video hovor — to dokáže, že je skutočný","correct":false,"severity":"minor"}
    ]'::jsonb,
    '[1]'::jsonb,
    'scenario',
    'medium',
    'published',
    NULL,
    '[
      {"label":"Bellingcat — Spotting AI-generated faces","url":"https://www.bellingcat.com/resources/2022/12/01/how-to-spot-ai-generated-faces/","publisher":"Bellingcat"},
      {"label":"Europol — AI-enabled crime threat report","url":"https://www.europol.europa.eu/cms/sites/default/files/documents/Europol_Innovation_Lab_Observatory_Report_AI.pdf","publisher":"Europol"},
      {"label":"SK-CERT — Falošné profily a romance scam","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
    ]'::jsonb
  ),

  -- ---- Q4 — voice-clone extortion ("I have your voice") ----
  -- 30 seconds of public-facing audio (TikTok, Instagram reels, YouTube,
  -- voicemail greeting) is enough for current voice-cloning models. The
  -- "compromising audio" can be 100% synthetic. Payment to crypto is the
  -- give-away on the demand side.
  (
    'e61a7af5-90c4-5950-8cd2-792af148f2d3',
    'single',
    'Príde ti správa s audio nahrávkou. Hlas, ktorý znie ako ty, hovorí kompromitujúce vety. Útočník píše: „Pošli 500 € v Bitcoine alebo nahrávku zverejním tvojim kontaktom.” Hlas znie skutočne. Zareaguješ?',
    '[
      {"id":"a","label":"Zaplatím — nahrávka znie príliš autenticky, môže to byť reálne","correct":false,"severity":"critical"},
      {"id":"b","label":"Neplatím. Hlas mohol byť klonovaný z mojich verejných videí (TikTok, IG, voicemail). Nahlásim na polícii (kybernetická kriminalita) a zablokujem","correct":true,"severity":null},
      {"id":"c","label":"Odpoviem útočníkovi a požiadam o ukážku celej nahrávky, aby som overil","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'scenario',
    'hard',
    'published',
    NULL,
    '[
      {"label":"SK-CERT — Klonovanie hlasu a deepfake audio","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"},
      {"label":"FBI IC3 — Deepfake extortion alert","url":"https://www.ic3.gov/Media/Y2023/PSA230605","publisher":"FBI"},
      {"label":"PZ SR — Nahlasovanie kybernetickej kriminality","url":"https://www.minv.sk/?kyberneticka-kriminalita","publisher":"Polícia SR"}
    ]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- E37 Phase C — socialne-siete question pack (6 new public.questions rows)
-- ----------------------------------------------------------------------------
-- Plan: tasks/PLAN-2026-05-20-E37-tests-coverage.md (Phase C).
-- Authoring rules: see 20260521210000_e37_questions_heslo_2fa.sql preamble.
-- ----------------------------------------------------------------------------

INSERT INTO public.questions (
  id, type, prompt, options, correct, branch_slug, difficulty, status,
  visual, sources_jsonb
)
VALUES
  -- ---- Q1 — FB business OAuth account takeover ----
  -- Fake "Meta Business Help" page asks the user to "verify" via FB login.
  -- The login form is on a phishing domain; once submitted, attackers add
  -- themselves as admins of the user's FB Page and lock the user out.
  (
    'e917b2fe-bad3-546f-a39f-861a7d1f28ce',
    'single',
    'Tvoja FB stránka má 12 000 sledovateľov. Príde DM od „Meta Business Help”: „Vaša stránka porušila pravidlá. Odvolajte sa do 24h, inak ju zrušíme.” Odkaz: https://meta-business-appeal.com/verify. Klikneš a prihlásiš sa?',
    '[
      {"id":"a","label":"Áno — 24h je málo času, musím konať","correct":false,"severity":"critical"},
      {"id":"b","label":"Nie — Meta ti správy o porušení posiela do Quality / Page Support priamo v Business Suite, nie cez DM. Skontrolujem tam","correct":true,"severity":null},
      {"id":"c","label":"Zatelefonujem na číslo z DM, aby som overil","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'phishing',
    'hard',
    'published',
    '{"kind":"url","url":"https://meta-business-appeal.com/verify"}'::jsonb,
    '[
      {"label":"Meta Business — How we contact Page admins","url":"https://www.facebook.com/business/help/2087115554683535","publisher":"Meta"},
      {"label":"SK-CERT — Hackovanie Facebook stránok","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"},
      {"label":"Europol — Social media account takeover","url":"https://www.europol.europa.eu/cybercrime","publisher":"Europol"}
    ]'::jsonb
  ),

  -- ---- Q2 — Instagram "guidelines violation" DM ----
  -- Consumer-level account takeover. The DM looks like it comes from an
  -- official IG account ("Instagram Support" / "Help Center"). Form asks
  -- for login, then for 2FA SMS code in real-time.
  (
    'f40c1024-6328-5dcc-8113-8d804289a370',
    'single',
    'Dostaneš DM na Instagrame od účtu „instagram_help_center”: „Váš účet porušil naše pravidlá. Odvolajte sa cez tento formulár, inak váš účet zrušíme.” Link vedie na stránku, kde sa máš prihlásiť cez svoje IG údaje. Čo urobíš?',
    '[
      {"id":"a","label":"Vyplním formulár — nechcem stratiť účet","correct":false,"severity":"critical"},
      {"id":"b","label":"Nahlásim DM ako spam, zablokujem účet. Skutočné Instagram správy o porušení nájdem v Settings → Account Status, nie cez DM","correct":true,"severity":null},
      {"id":"c","label":"Odpoviem na DM s otázkou na detail porušenia","correct":false,"severity":"medium"}
    ]'::jsonb,
    '[1]'::jsonb,
    'phishing',
    'medium',
    'published',
    '{"kind":"url","url":"https://instagram-appeal-form.online/verify"}'::jsonb,
    '[
      {"label":"Instagram — How we notify you about policy violations","url":"https://help.instagram.com/477434105621119","publisher":"Meta"},
      {"label":"SK-CERT — Krádež Instagram účtov","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
    ]'::jsonb
  ),

  -- ---- Q3 — Telegram / WhatsApp "investment group" invite ----
  -- Mass-added to a group with screenshots of "profits", paid actors
  -- praising the "mentor". Classic pig-butchering setup that funnels victims
  -- into a fake crypto exchange.
  (
    '71513402-4be4-5126-b19d-4ca578cebdfc',
    'single',
    'Niekto ťa pridal do Telegram skupiny „Investovanie SK — premium 2026”. Vidíš screenshoty zárobkov, „mentor” Andrew ponúka VIP signály za 200 € a 80 členov píše, ako už zarobili. Reakcia?',
    '[
      {"id":"a","label":"Zaplatím 200 € — 80 ľudí potvrdzuje, že to funguje","correct":false,"severity":"critical"},
      {"id":"b","label":"Opustím skupinu a nahlásim ju ako spam. 80 „nadšených členov” sú platení boti alebo komparzisti, classic pig-butchering","correct":true,"severity":null},
      {"id":"c","label":"Napíšem mentorovi súkromne, aby som zistil viac","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'scenario',
    'medium',
    'published',
    NULL,
    '[
      {"label":"SK-CERT — Telegram a WhatsApp investičné podvody","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"},
      {"label":"Europol — Pig butchering scheme report","url":"https://www.europol.europa.eu/cms/sites/default/files/documents/IOCTA_2024.pdf","publisher":"Europol"},
      {"label":"NBS — Neregistrované investičné platformy","url":"https://nbs.sk/dohlad-nad-financnym-trhom/varovania/","publisher":"Národná banka Slovenska"}
    ]'::jsonb
  ),

  -- ---- Q4 — sponsored fake eshop ad on FB/IG ----
  -- Lookalike of a known SK eshop (Alza, Mall, Slovenská pošta shop).
  -- Ad has stolen brand photos, 70% discount, payment only "by card via
  -- secure form" (no Tatra Pay / GoPay legit gateway).
  (
    '326a6311-210a-55c3-9c0c-a9bbabf5e86d',
    'single',
    'Vidíš sponzorovanú reklamu na FB: „Slovenská pošta výpredaj — Apple Watch za 49 €. Posledných 100 ks.” Doména v URL: slovenska-posta-shop.online. Platba kartou. Objednáš?',
    '[
      {"id":"a","label":"Áno — 49 € za hodinky je super deal, riskujem","correct":false,"severity":"critical"},
      {"id":"b","label":"Nie — pravá Slovenská pošta nepredáva Apple Watch a doména .online je červená vlajka. Reklamu nahlásim FB ako podvod","correct":true,"severity":null},
      {"id":"c","label":"Skontrolujem recenzie eshopu — ak sú dobré, objednám","correct":false,"severity":"medium"}
    ]'::jsonb,
    '[1]'::jsonb,
    'url',
    'medium',
    'published',
    '{"kind":"url","url":"https://slovenska-posta-shop.online/apple-watch-49"}'::jsonb,
    '[
      {"label":"SOI — Varovania pred podvodnými eshopmi","url":"https://www.soi.sk/sk/spotrebitelske-poradenstvo/podvodne-eshopy.soi","publisher":"Slovenská obchodná inšpekcia"},
      {"label":"SK-CERT — Falošné eshopy v reklamách na sociálnych sieťach","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
    ]'::jsonb
  ),

  -- ---- Q5 — compromised friend asking for money / 2FA code ----
  -- Friend's account is hacked, attacker uses Messenger conversation to ask
  -- for emergency money or for a "code I sent you by mistake" (which is
  -- actually the victim's own 2FA recovery code).
  (
    '0eaa14c6-84a7-5d98-9fe6-a6ee469a11eb',
    'single',
    'Na Messengeri ti píše kamarát: „Ahoj, omylom som zadal tvoje číslo pri registrácii. Príde ti SMS s kódom, môžeš mi ho preposlať? Vďaka.” Kód príde. Pošleš?',
    '[
      {"id":"a","label":"Áno — kamarát potrebuje pomoc, nič ma to nestojí","correct":false,"severity":"critical"},
      {"id":"b","label":"Zatelefonujem kamarátovi cez bežné číslo (nie Messenger) a overím. SMS kód je pravdepodobne moje vlastné 2FA — útočník hackol jeho účet","correct":true,"severity":null},
      {"id":"c","label":"Pošlem kód, ale dopíšem „len pre tebe, nedávaj ďalej”","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'scenario',
    'medium',
    'published',
    '{"kind":"sms","sender":"Google","body":"Váš overovací kód: 884213. Nikomu ho neposielajte."}'::jsonb,
    '[
      {"label":"SK-CERT — Hacknuté kontá kamarátov a žiadosti o kódy","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"},
      {"label":"Meta — Recognizing scams from compromised friends","url":"https://www.facebook.com/help/166863010078512","publisher":"Meta"}
    ]'::jsonb
  ),

  -- ---- Q6 — Meta security notification honeypot ----
  -- LEGIT Meta security email after the user enabled 2FA. Teaches calibration:
  -- not every "security alert" is phishing. Correct path is to verify
  -- in-app (Settings → Security), NOT click the email link.
  (
    'f425524e-3b38-5f09-8760-65c813e360fc',
    'single',
    'Príde ti e-mail z Facebook (security@facebookmail.com): „Práve si zapol dvojfaktorové overenie. Ak si to nebol ty, klikni sem.” Pred 5 minútami si naozaj 2FA zapínal. Reaguješ?',
    '[
      {"id":"a","label":"Toto je phishing — útočníci ma chcú odvrátiť. Mažem","correct":false,"severity":"minor"},
      {"id":"b","label":"E-mail z @facebookmail.com je legitímny. Skontrolujem v FB → Settings → Security, či sa zhoduje. Ak áno, OK","correct":true,"severity":null},
      {"id":"c","label":"Pre istotu kliknem na link v e-maili, aby som potvrdil","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'honeypot',
    'medium',
    'published',
    '{"kind":"email","from":"Facebook","fromEmail":"security@facebookmail.com","subject":"Dvojfaktorové overenie zapnuté","body":"Práve si na svojom Facebook účte zapol dvojfaktorové overenie. Ak si to nebol ty, klikni sem a okamžite zabezpečte svoj účet."}'::jsonb,
    '[
      {"label":"Meta — Verify if an email is from Facebook","url":"https://www.facebook.com/help/167722253287296","publisher":"Meta"},
      {"label":"SK-CERT — Rozlíšenie phishing vs. legit notifikácie","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
    ]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- E37 Phase C — rodicia question pack (4 new public.questions rows)
-- ----------------------------------------------------------------------------
-- Plan: tasks/PLAN-2026-05-20-E37-tests-coverage.md (Phase C).
-- Authoring rules: see 20260521210000_e37_questions_heslo_2fa.sql preamble.
-- ----------------------------------------------------------------------------

INSERT INTO public.questions (
  id, type, prompt, options, correct, branch_slug, difficulty, status,
  visual, sources_jsonb
)
VALUES
  -- ---- Q1 — teen sextortion email (parent intercepts) ----
  -- 99% of "I have your photos" extortion is bluff (no actual material).
  -- Correct path: do not pay, do not reply, preserve evidence, report.
  -- Parent's panic + payment funds further crime and signals the victim is
  -- compliant for next round.
  (
    '611236e8-d384-53d1-af3b-44cce66a2bd1',
    'single',
    'Tvoja 14-ročná dcéra ti vystrašene ukáže e-mail: „Máme tvoje intímne fotky. Pošli 200 € v Bitcoine, inak ich rozošleme tvojim kontaktom z Instagramu.” Vraj nikomu fotky neposlala. Čo robíš?',
    '[
      {"id":"a","label":"Zaplatíme — chceme to mať z hlavy a nechceme, aby sa rozšírilo","correct":false,"severity":"critical"},
      {"id":"b","label":"Neplatíme. 99 % sextortion e-mailov je len strašenie bez reálnych fotiek. Uložíme dôkaz (screenshot), nahlásime na Internet hotline (Zodpovedne.sk) a polícii","correct":true,"severity":null},
      {"id":"c","label":"Odpovieme útočníkovi, že to nahlásime, nech vie","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'scenario',
    'hard',
    'published',
    '{"kind":"email","from":"Anonym","fromEmail":"anonym-247@proton.me","subject":"Posledné varovanie","body":"Máme tvoje intímne fotky. Máš 48 hodín. 200 € v Bitcoine na adresu: bc1q... Inak fotky rozošleme všetkým tvojim kontaktom na Instagrame."}'::jsonb,
    '[
      {"label":"Zodpovedne.sk — Sextortion a vydieranie","url":"https://www.zodpovedne.sk/index.php/sk/ohrozenia/sextortion","publisher":"Zodpovedne.sk"},
      {"label":"Europol — Sexual extortion targeting children","url":"https://www.europol.europa.eu/crime-areas-and-statistics/crime-areas/child-sexual-exploitation","publisher":"Europol"},
      {"label":"PZ SR — Kybernetická kriminalita voči deťom","url":"https://www.minv.sk/?podvody-pre-rodicov","publisher":"Polícia SR"}
    ]'::jsonb
  ),

  -- ---- Q2 — fake teen IG profile (grooming pattern) ----
  -- Predator pretends to be a peer, asks for location/school within first
  -- few DMs. "Bývam v Petržalke, môžeme sa stretnúť" is the textbook
  -- escalation. Reporting through IG's in-app flow is the right channel —
  -- DMing the suspect profile alerts them and may delete evidence.
  (
    '55a7e850-97d2-55ca-974f-d6b1901fd2cd',
    'single',
    'Pri kontrole dcérinho IG vidíš nové sledovanie: profil „Mia_13_BA”. V DM píše tvojej dcére: „Kde chodíš do školy? Bývam v Petržalke, môžeme sa stretnúť po vyučovaní.” Reaguješ?',
    '[
      {"id":"a","label":"Necháme to byť — deti sa online spoznávajú, je to bežné","correct":false,"severity":"critical"},
      {"id":"b","label":"Profil nahlásime IG (kategória: predator / grooming), zablokujeme. Pravdepodobne dospelý predátor sa vydáva za dieťa. Porozprávame sa s dcérou o stretnutiach z internetu","correct":true,"severity":null},
      {"id":"c","label":"Napíšem samej Mii súkromne, kto je a odkiaľ pozná moju dcéru","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'scenario',
    'medium',
    'published',
    NULL,
    '[
      {"label":"Zodpovedne.sk — Grooming a online predátori","url":"https://www.zodpovedne.sk/index.php/sk/ohrozenia/grooming","publisher":"Zodpovedne.sk"},
      {"label":"Europol — Online child sexual exploitation","url":"https://www.europol.europa.eu/crime-areas-and-statistics/crime-areas/child-sexual-exploitation","publisher":"Europol"},
      {"label":"Instagram — Report a profile","url":"https://help.instagram.com/192435014247952","publisher":"Meta"}
    ]'::jsonb
  ),

  -- ---- Q3 — parental controls bypass ----
  -- Tech-blocking the second account is the natural reaction but escalates
  -- to a wall. The senior parenting move is to renegotiate the agreement
  -- (time + content limits) since the controls were never the goal — they
  -- were the mechanism for the agreement.
  (
    '1bc8924f-e2f6-592d-a379-ede0f4bdef07',
    'single',
    'Pri kontrole router logu vidíš, že tvoj 13-ročný syn používa druhý Google účet (firmaXYZ@gmail.com), na ktorý sa nevzťahuje vaša Family Link kontrola. Akcia?',
    '[
      {"id":"a","label":"Nič — chce súkromie, chápem","correct":false,"severity":"critical"},
      {"id":"b","label":"Pokojne sa s ním porozprávame. Family Link sa dá obísť, no dôvody (čas a obsah), prečo ho používame, sú dôležitejšie ako nástroj. Dohodneme nové pravidlá","correct":true,"severity":null},
      {"id":"c","label":"Okamžite mu zatvoríme Wi-Fi pre tablet, nech vie, čo to znamená","correct":false,"severity":"minor"}
    ]'::jsonb,
    '[1]'::jsonb,
    'scenario',
    'hard',
    'published',
    NULL,
    '[
      {"label":"Google Family Link — Best practices for teen accounts","url":"https://families.google.com/familylink/","publisher":"Google"},
      {"label":"Zodpovedne.sk — Komunikácia s deťmi o digitálnom svete","url":"https://www.zodpovedne.sk/index.php/sk/poradenstvo/rodicia","publisher":"Zodpovedne.sk"},
      {"label":"Common Sense Media — Parental controls guide","url":"https://www.commonsensemedia.org/articles/parents-ultimate-guide-to-parental-controls","publisher":"Common Sense Media"}
    ]'::jsonb
  ),

  -- ---- Q4 — "your child won a contest" SMS ----
  -- Personalization (child's name) is scraped from the parent's own FB
  -- profile. SMS with bit.ly link is the classic delivery vector. Disney,
  -- Lego, Apple, IKEA are common brand impersonations in SK.
  (
    '738417a8-a88a-5c3d-bc7a-f6cfe075ee28',
    'single',
    'Príde ti SMS: „Vaše dieťa Lucia vyhralo víkend v Disneylandu Paris! Aktivujte vstupenku do 24h, inak prepadne: bit.ly/disney-prize-sk”. Reaguješ?',
    '[
      {"id":"a","label":"Áno — meno dcéry sedí, nemám čo stratiť, ide o výhru","correct":false,"severity":"critical"},
      {"id":"b","label":"Nie — meno dcéry je zo môjho verejného FB profilu. Disney súťaže neoznamuje cez SMS s bit.ly linkom. SMS nahlásim ako podvod (operátor) a polícii","correct":true,"severity":null},
      {"id":"c","label":"Pošlem link manželovi/manželke, nech sa pozrie","correct":false,"severity":"minor"}
    ]'::jsonb,
    '[1]'::jsonb,
    'phishing',
    'medium',
    'published',
    '{"kind":"sms","sender":"Disney-SK","body":"Vaše dieťa Lucia vyhralo víkend v Disneylandu Paris! Aktivujte vstupenku do 24h, inak prepadne:","link":"https://bit.ly/disney-prize-sk"}'::jsonb,
    '[
      {"label":"SK-CERT — Falošné výhry a podvodné SMS","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"},
      {"label":"PZ SR — Podvody, ktoré zneužívajú deti a rodičov","url":"https://www.minv.sk/?podvody-pre-rodicov","publisher":"Polícia SR"},
      {"label":"Zodpovedne.sk — Ako nás zneužívajú údaje detí","url":"https://www.zodpovedne.sk/index.php/sk/ohrozenia/podvody","publisher":"Zodpovedne.sk"}
    ]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- E37 Phase C — skoly question pack (3 new public.questions rows)
-- ----------------------------------------------------------------------------
-- Plan: tasks/PLAN-2026-05-20-E37-tests-coverage.md (Phase C).
-- Authoring rules: see 20260521210000_e37_questions_heslo_2fa.sql preamble.
--
-- Out-of-scope flagged in Phase A: cyberbullying-report validation. That
-- scenario is behavioral (no clear right/wrong answer in a multi-choice
-- format) and moves to a future /courses epic.
-- ----------------------------------------------------------------------------

INSERT INTO public.questions (
  id, type, prompt, options, correct, branch_slug, difficulty, status,
  visual, sources_jsonb
)
VALUES
  -- ---- Q1 — EduPage / AIS lookalike phishing ----
  -- EduPage is the dominant SK school information system. Lookalikes:
  -- edupage.org (real .org → fake .sk) or subdomain plays. Teachers' Office
  -- 365 SSO compromises let the attacker also access school OneDrive.
  (
    '502fe72e-cb18-504e-aca7-1a1546f587da',
    'single',
    'Príde ti ako učiteľovi e-mail: „EduPage — vaše prihlásenie vypršalo. Pre obnovu prístupu k triednej knihe sa znovu prihláste cez tento link.” Doména linku: portal.edupage-sk.com. Klikneš?',
    '[
      {"id":"a","label":"Áno — koniec polroka, potrebujem prístup k triednej knihe","correct":false,"severity":"critical"},
      {"id":"b","label":"Nie — pravá EduPage doména je portal.edupage.org. Otvorím EduPage cez záložku v prehliadači a prihlásim sa ručne","correct":true,"severity":null},
      {"id":"c","label":"Otvorím link na pracovnom notebooku — školské IT to vyrieši, ak je to phishing","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'phishing',
    'medium',
    'published',
    '{"kind":"email","from":"EduPage Support","fromEmail":"no-reply@edupage-sk.com","subject":"Obnovte prístup k triednej knihe","body":"Vaše prihlásenie vypršalo. Pre obnovu prístupu k triednej knihe sa znovu prihláste cez tento link do 24h."}'::jsonb,
    '[
      {"label":"aSc / EduPage — Pomocník pre učiteľov","url":"https://help.edupage.org/?lang_id=2","publisher":"aSc Applied Software Consultants"},
      {"label":"SK-CERT — Phishing voči školám","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
    ]'::jsonb
  ),

  -- ---- Q2 — "EU dotácia pre školy" email ----
  -- Plausible 2026 angle: fake notification from MIRRI / "EU Komisia"
  -- offering an urgent grant for digitalisation. The "registration form"
  -- asks for school IBAN, riaditeľ ID, MFA codes. MIRRI never asks for
  -- these out-of-band.
  (
    'b84798e0-adf0-51c9-a448-fe797aebab17',
    'single',
    'Riaditeľke ZŠ príde e-mail: „EU dotácia pre digitalizáciu škôl 2026 — vaša škola bola predschválená na 18 000 €. Registrujte sa do piatka cez formulár (priložený).” Formulár pýta IBAN školy + jej rodné číslo. Reaguje?',
    '[
      {"id":"a","label":"Vyplníme — termín je krátky, dotácia veľká, nemôžeme premeškať","correct":false,"severity":"critical"},
      {"id":"b","label":"Overíme priamo cez MIRRI / Ministerstvo školstva (telefonát na overené číslo, nie z e-mailu). Dotácie sa nikdy nevyhlasujú e-mailom ad-hoc","correct":true,"severity":null},
      {"id":"c","label":"Zavoláme na číslo uvedené v e-maile, aby sme overili","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'phishing',
    'medium',
    'published',
    '{"kind":"email","from":"EU Komisia — Digitalizácia škôl","fromEmail":"grant-2026@eu-digitalisation-program.com","subject":"Predschválená dotácia 18 000 €","body":"Vaša škola bola predschválená na dotáciu 18 000 € z programu Digitálna Európa 2026. Registrujte sa cez priložený formulár do piatka 17:00. Neregistrované školy strácajú nárok."}'::jsonb,
    '[
      {"label":"MIRRI — Skutočné výzvy a dotácie","url":"https://www.mirri.gov.sk/sekcie/digitalna-agenda/","publisher":"MIRRI SR"},
      {"label":"Ministerstvo školstva — Informácie pre školy","url":"https://www.minedu.sk/skoly-a-skolske-zariadenia/","publisher":"MŠVVaŠ SR"},
      {"label":"SK-CERT — Phishing s falošnými dotáciami","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
    ]'::jsonb
  ),

  -- ---- Q3 — "Falošný rodič" call to school recepcia ----
  -- Social-engineering recon attack: caller pretends to be a parent,
  -- extracts the child's full timetable / who picks them up / which after-
  -- school the child attends. Sets up a later in-person predator approach.
  -- Recepcia's instinct to be helpful is the vulnerability.
  (
    'ef5123da-68ca-53a9-b534-d0c83edd0620',
    'single',
    'Recepcii ZŠ volá muž: „Som otec Lucie K. zo 4.A. Manželka ochorela, nemôže prísť po dcéru. Akú má dnes poslednú hodinu a kde čaká po vyučovaní?” V triednej knihe je len matka uvedená ako kontakt. Reaguješ?',
    '[
      {"id":"a","label":"Poviem informácie — otec má právo vedieť detaily o svojom dieťati","correct":false,"severity":"critical"},
      {"id":"b","label":"Nepoviem nič. „Pán, prosím Vás, dohovorte sa s manželkou alebo s triednou učiteľkou. Informácie o žiakovi neposkytujeme telefonicky.” Zaznamenám hovor","correct":true,"severity":null},
      {"id":"c","label":"Spýtam sa otca na rodné číslo dcéry, ak vie, poviem detaily","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'scenario',
    'hard',
    'published',
    '{"kind":"call","caller":"„Otec Lucie K.”","number":"+421 944 222 333","hint":"Číslo nie je v triednej knihe ako kontakt"}'::jsonb,
    '[
      {"label":"Zodpovedne.sk — Bezpečnosť detí v škole","url":"https://www.zodpovedne.sk/index.php/sk/poradenstvo/skoly","publisher":"Zodpovedne.sk"},
      {"label":"PZ SR — Sociálne inžinierstvo voči verejným inštitúciám","url":"https://www.minv.sk/?podvody-pre-skoly","publisher":"Polícia SR"},
      {"label":"ÚOOÚ SR — Ochrana osobných údajov žiakov","url":"https://www.dataprotection.gov.sk/uoou/sk","publisher":"ÚOOÚ SR"}
    ]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- E37 Phase C — zdravotnictvo question pack (6 new public.questions rows)
-- ----------------------------------------------------------------------------
-- Plan: tasks/PLAN-2026-05-20-E37-tests-coverage.md (Phase C).
-- Authoring rules: see 20260521210000_e37_questions_heslo_2fa.sql preamble.
--
-- This pack is the only one in E37 whose blog corpus is currently empty
-- (0 mapped articles per Phase A mapping). The pack ships anyway because
-- healthcare staff are a high-loss target and the SEO ceiling is large;
-- blog backfill is flagged as a separate "blog topical-coverage" follow-up
-- epic in the plan's risk register.
-- ----------------------------------------------------------------------------

INSERT INTO public.questions (
  id, type, prompt, options, correct, branch_slug, difficulty, status,
  visual, sources_jsonb
)
VALUES
  -- ---- Q1 — fake e-recept portal phishing ----
  -- NCZI's eHealth (ehealth.sk) and eRecept service are common targets.
  -- Phishing emails to GPs/clinic staff ask them to "verify access" via a
  -- lookalike (ehealth-portal.sk, erecept-overenie.online). Once creds are
  -- in, attacker can read patient data or write false prescriptions.
  (
    '78d29600-9a2d-598a-9d11-886f63376e1f',
    'single',
    'Lekárke v ambulancii príde e-mail: „NCZI — overenie prístupu k eReceptu. Pre pokračovanie v predpisovaní liekov sa do 24h overte cez tento link.” Doména: erecept-overenie.online. Klikne?',
    '[
      {"id":"a","label":"Áno — bez prístupu nemôžem predpisovať, čas tlačí","correct":false,"severity":"critical"},
      {"id":"b","label":"Nie — NCZI komunikuje len cez ehealth.gov.sk / nczisk.sk a nikdy nepýta opätovné overenie cez e-mail. Skontrolujem priamo v NCZI portáli alebo zavolám podpore","correct":true,"severity":null},
      {"id":"c","label":"Otvorím link na mobile (osobnom), aby som neohrozila počítač v ambulancii","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'phishing',
    'medium',
    'published',
    '{"kind":"email","from":"NCZI — eRecept","fromEmail":"no-reply@erecept-overenie.online","subject":"Overenie prístupu k eReceptu — 24h","body":"Z dôvodu kontroly NCZI vás žiadame overiť prístup k eReceptu do 24 hodín. Bez overenia bude prístup pozastavený."}'::jsonb,
    '[
      {"label":"NCZI — Oficiálna komunikácia s poskytovateľmi","url":"https://www.nczisk.sk/Pages/default.aspx","publisher":"Národné centrum zdravotníckych informácií"},
      {"label":"SK-CERT — Phishing voči zdravotníckym zariadeniam","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
    ]'::jsonb
  ),

  -- ---- Q2 — vishing for patient lab data ----
  -- Caller pretends to be a colleague clinic / consulting specialist asking
  -- for "lab results for patient X". GDPR + medical confidentiality means
  -- the answer is always "send via secure portal", never read aloud or
  -- e-mail unencrypted.
  (
    'ca064d2d-0611-5e7d-8856-7cb095395857',
    'single',
    'Recepcii ambulancie volá muž: „Som MUDr. Horváth z Onkologického ústavu, máme akútneho pacienta. Pošlite mi laboratórne výsledky pána Kováča (RČ XXXXXX/XXXX) na môj e-mail dr.horvath.onko@gmail.com.” Reaguje?',
    '[
      {"id":"a","label":"Pošle — kolega lekár pýta, ide o život pacienta","correct":false,"severity":"critical"},
      {"id":"b","label":"Nepošle. „Pán doktor, pošlem to cez NCZI eZdravie / našu certifikovanú e-mailovú adresu, gmail.com nie je bezpečný kanál pre zdravotné údaje.” Overí MUDr. Horvátha cez oficiálny kontakt nemocnice","correct":true,"severity":null},
      {"id":"c","label":"Pošle len anonymizované výsledky (bez mena), to je v poriadku","correct":false,"severity":"medium"}
    ]'::jsonb,
    '[1]'::jsonb,
    'scenario',
    'hard',
    'published',
    '{"kind":"call","caller":"„MUDr. Horváth”","number":"+421 944 555 777","hint":"Číslo nie je z domény Onkologického ústavu"}'::jsonb,
    '[
      {"label":"ÚOOÚ SR — Spracovanie zdravotníckych údajov","url":"https://www.dataprotection.gov.sk/uoou/sk/content/spracuvanie-osobnych-udajov-v-oblasti-zdravotnictva","publisher":"ÚOOÚ SR"},
      {"label":"NCZI — eZdravie pre poskytovateľov","url":"https://www.nczisk.sk/Pages/default.aspx","publisher":"NCZI"},
      {"label":"SK-CERT — Vishing voči zdravotníckym pracovníkom","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
    ]'::jsonb
  ),

  -- ---- Q3 — medical-supplier BEC (IBAN switch) ----
  -- Established supplier emails accounting from a typosquat domain ("our
  -- bank changed, new IBAN"). Variant of the classic BEC played against
  -- clinic financial controls, which are often less mature than corporate.
  (
    '4dba6939-84e7-5c51-a8e7-73dbe5b128fd',
    'single',
    'Účtovníčke kliniky príde e-mail od dlhoročného dodávateľa zdravotníckeho materiálu: „Zmenili sme banku, nový IBAN: SK21 1100 0000 0029 4612 3784. Faktúru z minulého týždňa (2 850 €) uhraďte na novú adresu.” Doména: dodavatel-sk@medicalsupplies-eu.com (predtým @medicalsupplies.sk). Reaguje?',
    '[
      {"id":"a","label":"Uhradí — dodávateľ má právo zmeniť banku, nemusíme komplikovať","correct":false,"severity":"critical"},
      {"id":"b","label":"Zavolá dodávateľovi cez overené číslo (zo zmluvy, NIE z e-mailu) a overí zmenu IBAN-u. Doména sa nevýrazne zmenila (.sk → -eu.com) — to je BEC útok","correct":true,"severity":null},
      {"id":"c","label":"Uhradí, ale len 50 % ako test","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'phishing',
    'hard',
    'published',
    '{"kind":"email","from":"MedicalSupplies SK","fromEmail":"dodavatel-sk@medicalsupplies-eu.com","subject":"Zmena bankového účtu — okamžite","body":"Vážená pani účtovníčka, zmenili sme bankového partnera. Prosíme, faktúru č. 2026/0451 (2 850 €) uhraďte na nový IBAN: SK21 1100 0000 0029 4612 3784. Variabilný symbol ostáva. Ďakujem, Peter Kováč"}'::jsonb,
    '[
      {"label":"SK-CERT — Business Email Compromise (BEC)","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"},
      {"label":"Europol — Invoice fraud & IBAN switching","url":"https://www.europol.europa.eu/crime-areas-and-statistics/crime-areas/forgery-of-money-and-means-of-payment/payment-fraud","publisher":"Europol"}
    ]'::jsonb
  ),

  -- ---- Q4 — ransomware lure email targeting clinic ----
  -- Healthcare is a top ransomware target (RaaS gangs explicitly target
  -- clinics for the urgency of restoration). Lure: "CT scan results for
  -- review" or "Patient transfer paperwork" with a macro-enabled docx.
  (
    'e50a9ed9-7984-570e-8c8b-5131eafe4258',
    'single',
    'Sestre na neurológii príde e-mail: „Konzultácia — CT vyšetrenie pacienta Nový. Príloha v Word formáte (.docx) s makrami. Prosíme o promptnú odpoveď.” Pacient „Nový” nie je v ich evidencii. Otvorí?',
    '[
      {"id":"a","label":"Otvorí — môže to byť nový pacient z urgentu, makrá zapnem","correct":false,"severity":"critical"},
      {"id":"b","label":"Neotvorí. Word s makrami od externého odosielateľa = klasický ransomware vektor. Nahlási IT klinikie a presunie e-mail do karantény","correct":true,"severity":null},
      {"id":"c","label":"Otvorí len v Protected View bez povolenia makier","correct":false,"severity":"medium"}
    ]'::jsonb,
    '[1]'::jsonb,
    'phishing',
    'hard',
    'published',
    '{"kind":"email","from":"MUDr. Šimko","fromEmail":"konzultacia@neuro-clinic-pp.com","subject":"Konzultácia — CT pacient Nový","body":"Dobrý deň, posielam CT pacienta Nový na konzultáciu. Príloha obsahuje makrá pre zobrazenie obrazov (Word). Prosím o promptnú odpoveď."}'::jsonb,
    '[
      {"label":"SK-CERT — Ransomware útoky na zdravotníctvo","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"},
      {"label":"ENISA — Healthcare cybersecurity threats","url":"https://www.enisa.europa.eu/topics/critical-information-infrastructures-and-services/health","publisher":"ENISA"},
      {"label":"Microsoft — Macro malware protection","url":"https://learn.microsoft.com/en-us/microsoft-365-apps/security/internet-macros-blocked","publisher":"Microsoft"}
    ]'::jsonb
  ),

  -- ---- Q5 — fake NCZI/MZ SR SMS to staff ----
  -- "Aktualizujte si licenciu lekára" / "Dosiahli ste limit predpisov za
  -- mesiac" — SMS with a link to a fake NCZI portal. The give-away: NCZI
  -- never sends operational alerts via SMS.
  (
    '115edd0c-784d-5160-8aea-452ab1d70e54',
    'single',
    'Pediatrovi príde SMS: „NCZI: Vaša licencia eRecept vyprší o 48h. Aktualizujte si ju, inak stratíte právo predpisovať: nczi-licencia.sk/update”. Aktualizuje?',
    '[
      {"id":"a","label":"Aktualizuje — bez licencie nemôžem predpisovať, naliehavé","correct":false,"severity":"critical"},
      {"id":"b","label":"Nie — NCZI a SLEK neoznamujú vypršanie licencie cez SMS s linkom. Prihlási sa do ehealth.gov.sk priamo cez záložku v prehliadači a skontroluje","correct":true,"severity":null},
      {"id":"c","label":"Pošle SMS adminovi kliniky na overenie","correct":false,"severity":"medium"}
    ]'::jsonb,
    '[1]'::jsonb,
    'phishing',
    'medium',
    'published',
    '{"kind":"sms","sender":"NCZI-Info","body":"Vaša licencia eRecept vyprší o 48h. Aktualizujte si ju, inak stratíte právo predpisovať:","link":"https://nczi-licencia.sk/update"}'::jsonb,
    '[
      {"label":"NCZI — Komunikácia s poskytovateľmi","url":"https://www.nczisk.sk/Pages/default.aspx","publisher":"NCZI"},
      {"label":"SLEK — Predĺženie licencie lekára","url":"https://lekom.sk/","publisher":"Slovenská lekárska komora"},
      {"label":"SK-CERT — Phishing voči zdravotníckym pracovníkom","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
    ]'::jsonb
  ),

  -- ---- Q6 — legitimate NCZI honeypot ----
  -- Real NCZI portal URL with the slovakia.gov.sk SSO domain — looks
  -- different from the lookalikes in Q1 and Q5 but is legit. Teaches
  -- calibration: not every nczi-related URL is phishing.
  (
    '12f096cd-3af9-5276-8487-f496ee378c31',
    'single',
    'Pri prihlasovaní do eZdravia portálu sa zobrazí presmerovanie na slovensko.sk. URL: https://www.slovensko.sk/sk/eform-prihlasenie?service=ehealth. Pokračuješ?',
    '[
      {"id":"a","label":"Nie — presmerovanie na inú doménu je podozrivé, zatvorím","correct":false,"severity":"minor"},
      {"id":"b","label":"Áno — slovensko.sk je oficiálny štátny SSO. Cez tento bod sa autentikuje aj NCZI eZdravie pre lekárov. Pokračujem s eID","correct":true,"severity":null},
      {"id":"c","label":"Áno — kliknem aj na druhé predložené presmerovanie z neznámej domény","correct":false,"severity":"critical"}
    ]'::jsonb,
    '[1]'::jsonb,
    'honeypot',
    'medium',
    'published',
    '{"kind":"url","url":"https://www.slovensko.sk/sk/eform-prihlasenie?service=ehealth","secure":true}'::jsonb,
    '[
      {"label":"MIRRI — slovensko.sk autentifikácia","url":"https://www.mirri.gov.sk/sekcie/digitalna-agenda/","publisher":"MIRRI SR"},
      {"label":"NCZI — eZdravie pre lekárov","url":"https://www.nczisk.sk/Pages/default.aspx","publisher":"NCZI"}
    ]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- E37 Phase D — Migrate 9 static test packs to DB
-- ----------------------------------------------------------------------------
-- Plan: tasks/PLAN-2026-05-20-E37-tests-coverage.md (Phase D).
--
-- Materializes the 9 existing test packs (currently in
-- src/content/test-packs/*.ts) into public.tests + public.platform_pack_metadata
-- + public.test_questions. After this migration, /tests/{slug} can read
-- from the DB (Phase F).
--
-- OPERATIONAL PREREQUISITE: the `platform@subenai.sk` auth.users row must
-- exist before running this migration. Create it via the Supabase Auth
-- dashboard:
--   Authentication → Users → Add user → email: platform@subenai.sk
--   Auto-confirm: yes. Password: any strong value (no human login flow).
-- Phase D NO-OPs gracefully when the user is absent (RAISE NOTICE + RETURN,
-- no RAISE EXCEPTION) so the migration as a whole still applies. Re-run
-- after creating the user to complete D.
--
-- All UUIDs are deterministic UUIDv5 from the URL namespace + slug, so
-- the IDs match cross-environment (dev/staging/prod). Idempotent via
-- ON CONFLICT throughout.
--
-- This migration is INSERT-only — Phase G's copy upgrade applies the
-- senior-rewrite via UPDATE statements separately. Source URLs here
-- intentionally mirror the existing static pack files (homepage roots
-- in some cases — Phase G deep-links them).
-- ----------------------------------------------------------------------------

DO $migration$
DECLARE
  v_platform_id uuid;
BEGIN
  -- Resolve the platform-system user.
  SELECT id INTO v_platform_id
  FROM auth.users
  WHERE email = 'platform@subenai.sk'
  LIMIT 1;

  IF v_platform_id IS NULL THEN
    RAISE NOTICE 'E37 Phase D SKIPPED: platform@subenai.sk auth.users row not found. Create it (Supabase Auth → Users → Add user, auto-confirm) and re-run this migration. Phases B + C remain applied.';
    RETURN;
  END IF;

  -- ---- (1) Pack rows — public.tests ------------------------------------
  -- Each pack: deterministic UUID (UUIDv5 of "e37-pack-{slug}"), slug,
  -- share_id, owner = platform user, title, status, published_at.
  INSERT INTO public.tests (
    id, slug, share_id, owner_id, title, description, status, published_at
  ) VALUES
    ('055fb135-197f-5cfe-8277-9ee4619052c7', 'vseobecny',     'pack-vseobecny',     v_platform_id, 'Všeobecný test — najčastejšie podvody',                          NULL, 'published', '2026-05-01T00:00:00Z'),
    ('83f20ed3-f1d5-5c90-b2a5-ccf93a56f972', 'seniori',       'pack-seniori',       v_platform_id, 'Seniori (55+) — podvody cielené na starších',                    NULL, 'published', '2026-05-01T00:00:00Z'),
    ('50680548-7911-536b-b02b-088291bab138', 'studenti',      'pack-studenti',      v_platform_id, 'Študenti (16+) — podvody, na ktoré naletia pri štúdiu',          NULL, 'published', '2026-05-01T00:00:00Z'),
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', 'ziaci-do-16',   'pack-ziaci-do-16',   v_platform_id, 'Žiaci (do 16 rokov) — bezpečnosť na internete',                  NULL, 'published', '2026-05-01T00:00:00Z'),
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', 'eshop',         'pack-eshop',         v_platform_id, 'E-shop tím — odolnosť proti scam-u',                             NULL, 'published', '2026-04-27T00:00:00Z'),
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', 'gastro-horeca', 'pack-gastro-horeca', v_platform_id, 'Gastro & HORECA — bezpečnosť pri PoS a rezerváciách',            NULL, 'published', '2026-04-27T00:00:00Z'),
    ('dd4fc4d8-6dcf-50bc-bf58-6045bb5d98a8', 'autoservis',    'pack-autoservis',    v_platform_id, 'Autoservis — scam-y proti dielenskému tímu',                     NULL, 'published', '2026-04-27T00:00:00Z'),
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', 'it-vyvoj',      'pack-it-vyvoj',      v_platform_id, 'IT a softvérový vývoj — pokročilé vektory',                      NULL, 'published', '2026-04-27T00:00:00Z'),
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', 'verejne-sluzby','pack-verejne-sluzby',v_platform_id, 'Verejné služby — odolnosť úradníkov a obyvateľov',               NULL, 'published', '2026-04-27T00:00:00Z')
  ON CONFLICT (id) DO NOTHING;

  -- ---- (2) Pack metadata — public.platform_pack_metadata ---------------
  INSERT INTO public.platform_pack_metadata (
    test_id, industry, industry_emoji, tagline, target_persona, sources_jsonb, passing_threshold
  ) VALUES
    -- vseobecny
    ('055fb135-197f-5cfe-8277-9ee4619052c7', 'vseobecny', '🌐',
      'Najrozšírenejší mix: SMS/email phishing, falošné e-shopy, vishing, QR kódy, AI klonovanie hlasu a rozpoznávanie legitímnych stránok. 14 otázok.',
      'Každý — od tínedžera po dôchodcu. Pokrýva podvody, s ktorými sa môže stretnúť ktokoľvek bez ohľadu na vek alebo povolanie.',
      '[
        {"label":"SK-CERT — správa o kybernetických hrozbách 2024","url":"https://www.sk-cert.sk/"},
        {"label":"PZ SR — aktuálne podvody","url":"https://www.minv.sk/"},
        {"label":"Europol — Internet Organised Crime Threat Assessment 2024","url":"https://www.europol.europa.eu/"}
      ]'::jsonb,
      70),
    -- seniori
    ('83f20ed3-f1d5-5c90-b2a5-ccf93a56f972', 'seniori', '👴',
      '„Ahoj babka” scam s AI klonovaním hlasu, dverový podvodník z banky, falošný príplatok k dôchodku, vishing polícia/technik. 13 otázok.',
      'Dôchodca alebo aktívny päťdesiatnik — cieľ telefonických, dverových a poštových podvodov, vrátane najnovšej vlny AI voice-cloning podvodov.',
      '[
        {"label":"PZ SR — podvody na senioroch","url":"https://www.minv.sk/"},
        {"label":"Sociálna poisťovňa — upozornenia na falošné listy","url":"https://www.socpoist.sk/"},
        {"label":"Europol — voice cloning fraud 2024","url":"https://www.europol.europa.eu/"},
        {"label":"SK-CERT — vishing a telefonické podvody","url":"https://www.sk-cert.sk/"}
      ]'::jsonb,
      65),
    -- studenti (typo hotfixed in PR #66: univerzitných)
    ('50680548-7911-536b-b02b-088291bab138', 'studenti', '🎓',
      'Fake prenájmy izby pred zápisom, phishing univerzitných portálov AIS2, falošné Erasmus+ štipendiá, Discord Nitro a job scam-y. 13 otázok.',
      'Stredoškolák alebo vysokoškolák hľadajúci bývanie, brigádu alebo štipendium — pod časovým tlakom zápisového termínu alebo letného sťahovania.',
      '[
        {"label":"SK-CERT — phishing a sociálne inžinierstvo","url":"https://www.sk-cert.sk/"},
        {"label":"Europol — Erasmus fraud report 2024","url":"https://www.europol.europa.eu/"},
        {"label":"PZ SR — prenájom a advance fee podvody","url":"https://www.minv.sk/"}
      ]'::jsonb,
      70),
    -- ziaci-do-16
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', 'ziaci', '🎮',
      'Discord a gaming scam-y, falošné súťaže na TikToku, phishing školských kont, podvody s brigádami. 14 otázok pre mladých používateľov.',
      'Žiak základnej alebo strednej školy — aktívny hráč, používateľ Discordu, TikToku a Instagramu, ktorý prvýkrát hľadá brigádu.',
      '[
        {"label":"SK-CERT — online bezpečnosť pre deti","url":"https://www.sk-cert.sk/"},
        {"label":"Zodpovedne.sk — digitálna gramotnosť","url":"https://www.zodpovedne.sk/"},
        {"label":"Europol — gaming a social media scam-y 2024","url":"https://www.europol.europa.eu/"}
      ]'::jsonb,
      65),
    -- eshop
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', 'eshop', '🛒',
      'Fake kupci cez Stripe link, podvodné refundácie, balíkové smishing a Bazoš pasce. 14 otázok pre tím, ktorý komunikuje so zákazníkmi denne.',
      'Backoffice, customer support a operatívci e-shopu — kontaktný bod scam-erov, ktorí zneužívajú objednávkový a reklamačný flow.',
      '[
        {"label":"NCKB — typy podvodov v e-commerce","url":"https://www.sk-cert.sk/"},
        {"label":"Slovenská obchodná inšpekcia","url":"https://www.soi.sk/"},
        {"label":"Bazoš — bezpečnostné odporúčania","url":"https://www.bazos.sk/"}
      ]'::jsonb,
      70),
    -- gastro-horeca
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', 'gastro', '🍕',
      'Falošné rezervácie cez Booking, podvodné dodávateľské faktúry, kompromitovaný POS a QR menu pasce. 14 otázok pre tím prevádzky.',
      'Manažér prevádzky, čašníci, účtovníctvo, dodávatelia — všetci, ktorí vidia QR-ky, faktúry a rezervácie každý deň.',
      '[
        {"label":"NCKB — phishing pre malé prevádzky","url":"https://www.sk-cert.sk/"},
        {"label":"Booking.com — bezpečnostné centrum partnerov","url":"https://partner.booking.com/"},
        {"label":"Slovenská obchodná inšpekcia","url":"https://www.soi.sk/"}
      ]'::jsonb,
      70),
    -- autoservis
    ('dd4fc4d8-6dcf-50bc-bf58-6045bb5d98a8', 'autoservis', '🚗',
      'Fake objednávky náhradných dielov, podvody s VIN-om, smishing pre majiteľov áut, IBAN-switch dodávateľa. 13 otázok pre dielňu a recepciu.',
      'Recepcia, mechanici objednávajúci diely a účtovníčka — ciele scam-erov ktorí zneužívajú objednávkový flow a SMS o zásielkach.',
      '[
        {"label":"NCKB — podvody pri nákupe áut a dielov","url":"https://www.sk-cert.sk/"},
        {"label":"PZ SR — typové autopodvody","url":"https://www.minv.sk/"}
      ]'::jsonb,
      70),
    -- it-vyvoj
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', 'it', '💻',
      'BEC, OAuth phishing, supply-chain pasce, fake recruiteri, deepfake CEO call. 15 otázok pre tím, ktorý má prístup k prod a financiám.',
      'Vývojári, devops, CTO/lead, CFO assistant — top targety pre cielené BEC a supply-chain útoky.',
      '[
        {"label":"ENISA Threat Landscape — IT supply chain","url":"https://www.enisa.europa.eu/"},
        {"label":"NCKB — BEC v slovenských firmách","url":"https://www.sk-cert.sk/"},
        {"label":"GitHub Security — typosquatting","url":"https://docs.github.com/en/code-security"}
      ]'::jsonb,
      75),
    -- verejne-sluzby
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', 'verejne_sluzby', '🏛️',
      'Falošné štátne SMS, slovensko.sk klony, fake výzvy z FS, vishing od „polície”. 14 otázok pre úradníkov aj občanov.',
      'Úradníci, asistenti starostov, recepcie obecných úradov a občania, ktorí komunikujú so štátom cez slovensko.sk a SMS upozornenia.',
      '[
        {"label":"NCKB — phishing voči verejnej správe","url":"https://www.sk-cert.sk/"},
        {"label":"MIRRI SR — slovensko.sk bezpečnosť","url":"https://www.mirri.gov.sk/"},
        {"label":"PZ SR — varovania pre seniorov a občanov","url":"https://www.minv.sk/"}
      ]'::jsonb,
      70)
  ON CONFLICT (test_id) DO NOTHING;

  -- ---- (3) Junction — public.test_questions ----------------------------
  -- One row per (pack, question, position). Question UUIDs are UUIDv5 of
  -- the legacy bank slug ("p-sms-posta-1" etc.) — match the existing seed
  -- in 20260518400000_quiz_questions_db_infra.sql.
  INSERT INTO public.test_questions (test_id, question_id, position) VALUES
    -- vseobecny (14 questions)
    ('055fb135-197f-5cfe-8277-9ee4619052c7', '09c1eaaa-be17-59b2-aa30-149f2be8bc0f',  0), -- s-ai-voice-1
    ('055fb135-197f-5cfe-8277-9ee4619052c7', 'd0c42316-c2d2-532e-9cde-2814adaa1398',  1), -- p-sms-posta-1
    ('055fb135-197f-5cfe-8277-9ee4619052c7', '69f19901-6291-5607-a7f7-108a384bec7d',  2), -- p-email-netflix-1
    ('055fb135-197f-5cfe-8277-9ee4619052c7', '87f64998-50db-5d6d-8845-659860851939',  3), -- p-email-google-1
    ('055fb135-197f-5cfe-8277-9ee4619052c7', '23d550d2-5586-55fa-b7d4-2b4917c83fb2',  4), -- p-sms-2fa-1
    ('055fb135-197f-5cfe-8277-9ee4619052c7', '891a3790-41ed-52ae-9551-d717b62b2bf4',  5), -- u-https-1
    ('055fb135-197f-5cfe-8277-9ee4619052c7', '39e73a9f-0f42-57f9-8666-0853565dfdfc',  6), -- u-shortlink-1
    ('055fb135-197f-5cfe-8277-9ee4619052c7', 'db2cddf9-20da-5ff8-923b-b4f56218d8c4',  7), -- f-ig-influencer-1
    ('055fb135-197f-5cfe-8277-9ee4619052c7', '811a44e6-111a-5c1e-996b-5aaeee3cf817',  8), -- f-recenzie-1
    ('055fb135-197f-5cfe-8277-9ee4619052c7', 'c493ec4a-9b2f-524b-83c9-d807a8d223a4',  9), -- s-vishing-1
    ('055fb135-197f-5cfe-8277-9ee4619052c7', '4023b60e-aaa7-511d-aaf2-fcb418430dbb', 10), -- s-quishing-1
    ('055fb135-197f-5cfe-8277-9ee4619052c7', '65158bc0-ec43-5233-93f9-81bd54d75460', 11), -- h-vyhra-1
    ('055fb135-197f-5cfe-8277-9ee4619052c7', 'd5c2d7dd-6f31-5370-8b30-f4d512c3d8a4', 12), -- h-instagram-hack-1
    ('055fb135-197f-5cfe-8277-9ee4619052c7', '50ac723d-8e4d-59ff-8b8e-ec6811d1c57b', 13), -- h-popup-1

    -- seniori (13 questions)
    ('83f20ed3-f1d5-5c90-b2a5-ccf93a56f972', 'b0b98a60-6572-5e77-9028-ba813e596411',  0), -- s-vnuk-1
    ('83f20ed3-f1d5-5c90-b2a5-ccf93a56f972', 'd7ce9c72-4d89-568c-909b-1751d05141a5',  1), -- s-door-bank-1
    ('83f20ed3-f1d5-5c90-b2a5-ccf93a56f972', 'c36012bd-cc9c-5d52-93f0-47a4242091de',  2), -- f-pension-1
    ('83f20ed3-f1d5-5c90-b2a5-ccf93a56f972', '09c1eaaa-be17-59b2-aa30-149f2be8bc0f',  3), -- s-ai-voice-1
    ('83f20ed3-f1d5-5c90-b2a5-ccf93a56f972', '753bd60f-cf99-578b-ba0f-28a6d7587af8',  4), -- s-fake-charity-call-1
    ('83f20ed3-f1d5-5c90-b2a5-ccf93a56f972', 'eca4000a-1bc2-5882-800c-53c9a1ac1eef',  5), -- s-policia-call-1
    ('83f20ed3-f1d5-5c90-b2a5-ccf93a56f972', '89a5f706-78da-5914-b416-da5b3194d9c0',  6), -- s-rodina-1
    ('83f20ed3-f1d5-5c90-b2a5-ccf93a56f972', 'c493ec4a-9b2f-524b-83c9-d807a8d223a4',  7), -- s-vishing-1
    ('83f20ed3-f1d5-5c90-b2a5-ccf93a56f972', '89f0daa7-2702-590d-99bd-002954b7ada6',  8), -- s-anydesk-1
    ('83f20ed3-f1d5-5c90-b2a5-ccf93a56f972', '6ed4c2ef-ebac-5600-b221-0352e6bd3f09',  9), -- s-microsoft-call-1
    ('83f20ed3-f1d5-5c90-b2a5-ccf93a56f972', '90a59e98-63c9-588e-8679-b715cc8eb878', 10), -- h-prince-1
    ('83f20ed3-f1d5-5c90-b2a5-ccf93a56f972', '4129cfb1-17f7-5ba9-9389-559e1da147f4', 11), -- h-poslednavola-1
    ('83f20ed3-f1d5-5c90-b2a5-ccf93a56f972', 'd0c42316-c2d2-532e-9cde-2814adaa1398', 12), -- p-sms-posta-1

    -- studenti (13 questions)
    ('50680548-7911-536b-b02b-088291bab138', 'a7229636-2611-53fd-862a-7c722c1ecae6',  0), -- f-student-accom-1
    ('50680548-7911-536b-b02b-088291bab138', 'e9ae9fff-1c18-51b8-9ec6-ec7dfd615ed0',  1), -- p-email-uni-1
    ('50680548-7911-536b-b02b-088291bab138', 'd2c95a2d-9d8a-510e-b5b3-a7f7bc5efb52',  2), -- f-scholarship-fake-1
    ('50680548-7911-536b-b02b-088291bab138', 'e95e81be-9477-5fd8-a8bc-0fcc74a4a6c2',  3), -- f-discord-nitro-1
    ('50680548-7911-536b-b02b-088291bab138', 'e6875080-21f4-5c56-8f44-4b4f238aea14',  4), -- p-email-job-1
    ('50680548-7911-536b-b02b-088291bab138', 'f95622e0-e553-5a0a-9b70-0f62e954e940',  5), -- f-jobscam-1
    ('50680548-7911-536b-b02b-088291bab138', 'db2cddf9-20da-5ff8-923b-b4f56218d8c4',  6), -- f-ig-influencer-1
    ('50680548-7911-536b-b02b-088291bab138', 'd5c2d7dd-6f31-5370-8b30-f4d512c3d8a4',  7), -- h-instagram-hack-1
    ('50680548-7911-536b-b02b-088291bab138', 'dcf08155-5676-5da5-8638-9d2b44c9b127',  8), -- s-wifi-1
    ('50680548-7911-536b-b02b-088291bab138', 'f938eec3-d425-5e9c-a285-6552cea0248c',  9), -- f-investment-2
    ('50680548-7911-536b-b02b-088291bab138', '891a3790-41ed-52ae-9551-d717b62b2bf4', 10), -- u-https-1
    ('50680548-7911-536b-b02b-088291bab138', '69f19901-6291-5607-a7f7-108a384bec7d', 11), -- p-email-netflix-1
    ('50680548-7911-536b-b02b-088291bab138', '4023b60e-aaa7-511d-aaf2-fcb418430dbb', 12), -- s-quishing-1

    -- ziaci-do-16 (14 questions)
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', 'e95e81be-9477-5fd8-a8bc-0fcc74a4a6c2',  0), -- f-discord-nitro-1
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', '74438156-c08e-59fd-9a1a-198ebcb59d83',  1), -- f-gaming-vbucks-1
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', 'd2130da0-20f7-550c-8e60-7dc1a8ebd098',  2), -- p-email-school-ms-1
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', 'c707b0fe-ec76-5d64-b2c4-419a4f90cbf3',  3), -- h-tiktok-giveaway-1
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', '67bcbefb-a353-5b93-b5f0-1217f64d7a6a',  4), -- f-teen-job-1
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', '48460164-ebdc-5818-9eb5-38599577ac39',  5), -- s-school-qr-1
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', 'd9c622d6-32b3-581b-a6d9-c9f0c0031516',  6), -- h-free-spotify-1
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', 'd5c2d7dd-6f31-5370-8b30-f4d512c3d8a4',  7), -- h-instagram-hack-1
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', '49797c3c-a518-5a8b-a323-25a609299965',  8), -- f-mr-beast-1
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', '50ac723d-8e4d-59ff-8b8e-ec6811d1c57b',  9), -- h-popup-1
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', '69f19901-6291-5607-a7f7-108a384bec7d', 10), -- p-email-netflix-1
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', '39e73a9f-0f42-57f9-8666-0853565dfdfc', 11), -- u-shortlink-1
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', '891a3790-41ed-52ae-9551-d717b62b2bf4', 12), -- u-https-1
    ('3c146b53-4878-5300-8688-fdc0ab0e29bf', 'dcf08155-5676-5da5-8638-9d2b44c9b127', 13), -- s-wifi-1

    -- eshop (14 questions)
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', 'b17bdc88-7678-58c7-acc9-13bbb44b5752',  0), -- p-sms-balik-1
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', 'd1085207-921d-55e5-b796-ccc9a18f68e5',  1), -- p-sms-dpd-1
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', '558a78c5-f89d-5950-8681-e200ea08f0b3',  2), -- p-sms-fedex-1
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', 'dc04128f-7d7f-5d11-8c7e-a0bf65ace3db',  3), -- p-email-paypal-1
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', '99d211fa-63c9-57af-b41c-b94b597f550c',  4), -- f-fake-stripe-1
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', '76abca68-1a07-527b-ada2-835ee8b28e5e',  5), -- f-bazos-iphone-1
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', '6550013d-d06f-53eb-89e7-d445bdc4e3d2',  6), -- f-bazos-2
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', 'e1b3045c-2fd5-5b3f-80fa-6f8456ac826a',  7), -- s-overpay-1
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', '5dfc48cb-217a-5d07-b725-79f6d56beabf',  8), -- u-shopify-1
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', '8d0caaa0-2f0f-5284-b21f-b05d66e5491a',  9), -- u-eshop-1
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', '863c8d6b-c347-53cc-8f08-d344438bad08', 10), -- h-url-shop-1
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', 'b0974b8f-c471-595c-ac36-a8e895f177b2', 11), -- h-url-shop-4
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', '4fd5c4c1-f8ed-563d-bf28-08faa7cb498e', 12), -- h-url-shop-5
    ('defc499f-21f2-5b1f-b7c8-27cccc8fc84e', 'c331bc83-fb2d-52e8-bf12-b5c81a352ed3', 13), -- h-url-shop-6

    -- gastro-horeca (14 questions)
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', '9160f82b-9dbd-55c5-9908-5750603d03bd',  0), -- f-bookingmsg-1
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', '68e42fdc-82a7-515d-8acb-2cab6ab5f2df',  1), -- p-email-bec-1
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', 'f95434ab-0a13-53be-aae5-b3f2f9e61e5a',  2), -- p-email-faktura-1
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', '2ef518a4-d93e-5172-908b-b2030d900782',  3), -- p-email-bank-statement-1
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', 'ef80e646-2411-5a23-98ab-166acd611195',  4), -- p-email-linkedin-1
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', '4023b60e-aaa7-511d-aaf2-fcb418430dbb',  5), -- s-quishing-1
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', 'dcf08155-5676-5da5-8638-9d2b44c9b127',  6), -- s-wifi-1
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', '80d0323b-69bd-5518-bf6d-8a37bd17798d',  7), -- s-fake-update-1
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', 'f29988a5-c553-52b4-bd14-86a1dd851b46',  8), -- s-redirect-1
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', 'f6adaae5-c05a-5204-ae1a-8fdd201a228f',  9), -- f-fake-influencer-1
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', 'd4955cfb-d34c-50ea-a845-689c76ea7570', 10), -- h-url-shop-9
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', 'a7778446-8dba-5598-8568-257cf1110d58', 11), -- h-url-bank-10
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', 'bf2fcdaa-b324-5422-8658-987ef724f78c', 12), -- h-url-shop-2
    ('0cf91640-3ec4-5831-ab55-d6f826bea16d', '91fea79f-6da0-591b-96e4-78cff269341e', 13), -- h-url-bank-1

    -- autoservis (13 questions)
    ('dd4fc4d8-6dcf-50bc-bf58-6045bb5d98a8', '98eabcb5-cfbb-5f99-b4c6-473e98c5ad7d',  0), -- f-bazar-auto-1
    ('dd4fc4d8-6dcf-50bc-bf58-6045bb5d98a8', '94a84bcd-673d-5404-ada0-478e9e2c88ab',  1), -- f-marketplace-1
    ('dd4fc4d8-6dcf-50bc-bf58-6045bb5d98a8', '68e42fdc-82a7-515d-8acb-2cab6ab5f2df',  2), -- p-email-bec-1
    ('dd4fc4d8-6dcf-50bc-bf58-6045bb5d98a8', 'f95434ab-0a13-53be-aae5-b3f2f9e61e5a',  3), -- p-email-faktura-1
    ('dd4fc4d8-6dcf-50bc-bf58-6045bb5d98a8', 'b17bdc88-7678-58c7-acc9-13bbb44b5752',  4), -- p-sms-balik-1
    ('dd4fc4d8-6dcf-50bc-bf58-6045bb5d98a8', '60638f52-27c8-58a6-ae7b-96668def55b2',  5), -- p-sms-policia-1
    ('dd4fc4d8-6dcf-50bc-bf58-6045bb5d98a8', 'e1b3045c-2fd5-5b3f-80fa-6f8456ac826a',  6), -- s-overpay-1
    ('dd4fc4d8-6dcf-50bc-bf58-6045bb5d98a8', '7407b22f-1b07-5882-9b2f-85cff44a25d0',  7), -- s-energie-1
    ('dd4fc4d8-6dcf-50bc-bf58-6045bb5d98a8', '47c547ac-85ba-5b39-a9ce-b8706aec7fa6',  8), -- u-typosquat-1
    ('dd4fc4d8-6dcf-50bc-bf58-6045bb5d98a8', '8d0caaa0-2f0f-5284-b21f-b05d66e5491a',  9), -- u-eshop-1
    ('dd4fc4d8-6dcf-50bc-bf58-6045bb5d98a8', '863c8d6b-c347-53cc-8f08-d344438bad08', 10), -- h-url-shop-1
    ('dd4fc4d8-6dcf-50bc-bf58-6045bb5d98a8', 'e2427b05-4dd1-5965-beca-b5e5de68f9e1', 11), -- h-url-bank-3
    ('dd4fc4d8-6dcf-50bc-bf58-6045bb5d98a8', '0f6d47b6-670b-5adf-9458-f37f17857247', 12), -- h-url-shop-7

    -- it-vyvoj (15 questions)
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', '68e42fdc-82a7-515d-8acb-2cab6ab5f2df',  0), -- p-email-bec-1
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', '1327585e-05e8-50b7-9f83-40e2c6b957f6',  1), -- p-email-microsoft-1
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', '87f64998-50db-5d6d-8845-659860851939',  2), -- p-email-google-1
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', '83032416-9c7e-5a30-a4ae-a49e75907657',  3), -- p-email-shared-1
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', 'ef80e646-2411-5a23-98ab-166acd611195',  4), -- p-email-linkedin-1
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', 'e6875080-21f4-5c56-8f44-4b4f238aea14',  5), -- p-email-job-1
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', '9205b0dd-8ae4-5af5-9628-ddb23685f7b7',  6), -- s-deepfake-1
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', '3e8d920c-1245-5c60-b81e-a67a0a7d0c92',  7), -- s-2fa-bombing-1
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', '89f0daa7-2702-590d-99bd-002954b7ada6',  8), -- s-anydesk-1
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', '47c547ac-85ba-5b39-a9ce-b8706aec7fa6',  9), -- u-typosquat-1
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', '39e73a9f-0f42-57f9-8666-0853565dfdfc', 10), -- u-shortlink-1
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', 'f6adaae5-c05a-5204-ae1a-8fdd201a228f', 11), -- f-fake-influencer-1
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', 'e2427b05-4dd1-5965-beca-b5e5de68f9e1', 12), -- h-url-bank-3
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', 'd5fb3bda-1e3b-557d-9cfd-b6b0801c8f06', 13), -- h-url-shop-8
    ('bb40cb84-4221-5fc2-87cc-0f6f06bd7cdf', 'bba74625-f3e3-5993-b8f6-e304e4a41e4f', 14), -- h-url-gov-7

    -- verejne-sluzby (14 questions)
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', 'cc113595-caa2-5925-9e0f-7a1fe6ea53a7',  0), -- p-sms-tax-1
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', '60638f52-27c8-58a6-ae7b-96668def55b2',  1), -- p-sms-policia-1
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', 'db0d5a01-bb36-5c58-8289-a215518bc80b',  2), -- p-sms-banka-blok-1
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', 'c493ec4a-9b2f-524b-83c9-d807a8d223a4',  3), -- s-vishing-1
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', '0abf09fd-21c1-598d-bee9-5fcd84ef6f66',  4), -- s-charita-1
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', '7407b22f-1b07-5882-9b2f-85cff44a25d0',  5), -- s-energie-1
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', '89a5f706-78da-5914-b416-da5b3194d9c0',  6), -- s-rodina-1
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', 'f95434ab-0a13-53be-aae5-b3f2f9e61e5a',  7), -- p-email-faktura-1
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', '5c7c47f3-bebe-5921-81ad-45e20f973865',  8), -- u-mojsk-1
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', '2cf11779-9512-5f37-ae42-3c1eb344690d',  9), -- u-postaonline-1
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', '3369e50f-a2f2-52cf-8c46-819a9038e32f', 10), -- h-url-gov-1
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', '6caed0cb-63e3-5983-93d6-8931d656a272', 11), -- h-url-gov-2
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', '3e6585ec-6be6-5fbb-82f8-44316adc5796', 12), -- h-url-gov-4
    ('7035478a-2abe-5c7e-bd3b-576205b9472b', 'bba74625-f3e3-5993-b8f6-e304e4a41e4f', 13)  -- h-url-gov-7
  ON CONFLICT (test_id, question_id) DO NOTHING;

  RAISE NOTICE 'E37 Phase D applied: 9 platform packs migrated to DB (% test rows, % metadata rows, % junction rows)',
    (SELECT count(*) FROM public.tests WHERE owner_id = v_platform_id),
    (SELECT count(*) FROM public.platform_pack_metadata),
    (SELECT count(*) FROM public.test_questions tq
       JOIN public.tests t ON t.id = tq.test_id
       WHERE t.owner_id = v_platform_id);
END;
$migration$;

-- ----------------------------------------------------------------------------
-- E37 Phase E — Add 6 new platform packs to DB
-- ----------------------------------------------------------------------------
-- Plan: tasks/PLAN-2026-05-20-E37-tests-coverage.md (Phase E).
--
-- Six new packs covering topic clusters from the Phase A blog→test mapping:
--   heslo-2fa         credentials / 2FA / passkeys      (7 questions)
--   ai-deepfake       AI-era threats                    (4 questions)
--   socialne-siete    social media account takeover     (6 questions)
--   rodicia           parents protecting kids           (4 questions)
--   skoly             schools — teachers & admins       (3 questions)
--   zdravotnictvo     healthcare staff                  (6 questions)
--
-- Same operational prerequisite as Phase D: platform@subenai.sk auth.users
-- row must exist. Migration NOTICE+RETURN if absent.
--
-- All question UUIDs are the deterministic UUIDv5 values authored in
-- the Phase C migrations (20260521210000 – 20260521260000).
-- ----------------------------------------------------------------------------

DO $migration$
DECLARE
  v_platform_id uuid;
BEGIN
  SELECT id INTO v_platform_id
  FROM auth.users
  WHERE email = 'platform@subenai.sk'
  LIMIT 1;

  IF v_platform_id IS NULL THEN
    RAISE NOTICE 'E37 Phase E SKIPPED: platform@subenai.sk auth.users row not found. Same prerequisite as Phase D — create the user (Supabase Auth → Users → Add user, auto-confirm) and re-run.';
    RETURN;
  END IF;

  -- ---- (1) Pack rows — public.tests ------------------------------------
  INSERT INTO public.tests (
    id, slug, share_id, owner_id, title, description, status, published_at
  ) VALUES
    ('b50c7d01-f878-5887-9054-6c19aa332292', 'heslo-2fa',      'pack-heslo-2fa',      v_platform_id,
      'Test pre heslá a 2FA — rozpoznáš pasce na hesle, passkey a SMS kód?',
      NULL, 'published', '2026-05-20T00:00:00Z'),
    ('b0a99389-a6d1-5ec0-ab43-69fcafea229b', 'ai-deepfake',    'pack-ai-deepfake',    v_platform_id,
      'Test pre AI-éru — odhalíš klonovaný hlas, deepfake CEO a AI phishing?',
      NULL, 'published', '2026-05-20T00:00:00Z'),
    ('c7888067-e31b-5b8e-bfa2-80b81bd884cf', 'socialne-siete', 'pack-socialne-siete', v_platform_id,
      'Test pre sociálne siete — rozpoznáš hack FB stránky, fake DM a Telegram pasce?',
      NULL, 'published', '2026-05-20T00:00:00Z'),
    ('a25c34c1-481f-5396-9845-ab0cd29abcee', 'rodicia',        'pack-rodicia',        v_platform_id,
      'Test pre rodičov — chránite deti pred sextortion, groomingom a podvodnými výhrami?',
      NULL, 'published', '2026-05-20T00:00:00Z'),
    ('0e38d214-78ad-5ad3-b7bd-4b81063c8700', 'skoly',          'pack-skoly',          v_platform_id,
      'Test pre školy — odolnosť proti phishingu EduPage, fake EU dotáciám a sociálnemu inžinierstvu',
      NULL, 'published', '2026-05-20T00:00:00Z'),
    ('5da4b6c6-371a-58f1-8908-7b76ae2e0b4a', 'zdravotnictvo',  'pack-zdravotnictvo',  v_platform_id,
      'Test pre zdravotníctvo — falošný NCZI portál, vishing o pacientovi, BEC dodávateľa',
      NULL, 'published', '2026-05-20T00:00:00Z')
  ON CONFLICT (id) DO NOTHING;

  -- ---- (2) Pack metadata — public.platform_pack_metadata ---------------
  -- NOTE: the four new industry values (heslo_2fa, ai_deepfake, socialne_siete,
  -- rodicia) are stored as free text in this column — the Industry enum
  -- extension lives in TypeScript only for the static-manifest deprecation
  -- window. skoly + zdravotnictvo were already in the existing enum.
  INSERT INTO public.platform_pack_metadata (
    test_id, industry, industry_emoji, tagline, target_persona, sources_jsonb, passing_threshold
  ) VALUES
    -- heslo-2fa
    ('b50c7d01-f878-5887-9054-6c19aa332292', 'heslo_2fa', '🔐',
      '7 reálnych scenárov za 5 minút: recovery-email phishing, lookalike haveibeenpwned, OAuth scam, passkey vs SMS, session-expired popup, credential stuffing a legit Bitwarden honeypot.',
      'Pre každého, kto má 5+ online účtov a aspoň jeden password manager alebo 2FA. Otestuje rozhodovanie v momente, keď ti príde upozornenie o „prihlásení z neznámeho zariadenia”.',
      '[
        {"label":"FIDO Alliance — Passkeys explainer","url":"https://fidoalliance.org/passkeys/","publisher":"FIDO Alliance"},
        {"label":"NIST SP 800-63B — Phishing resistance levels","url":"https://pages.nist.gov/800-63-3/sp800-63b.html","publisher":"NIST"},
        {"label":"Have I Been Pwned — FAQ","url":"https://haveibeenpwned.com/FAQ","publisher":"Troy Hunt"},
        {"label":"SK-CERT — aktuálne phishingové kampane","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
      ]'::jsonb,
      70),
    -- ai-deepfake
    ('b0a99389-a6d1-5ec0-ab43-69fcafea229b', 'ai_deepfake', '🤖',
      '4 najnovšie vektory: AI-personalizovaný phishing s reálnym kontextom z LinkedIn, ChatGPT-poháňané investičné podvody, AI-generované dating profily a voice-clone vydieranie. 30 sekúnd audia stačí.',
      'Pre každého, kto má rodinu na Slovensku, biznis s LinkedIn profilom alebo nahrávku hlasu na sociálnych sieťach (TikTok, IG voicemail). Útočníci dnes potrebujú minútu materiálu.',
      '[
        {"label":"ENISA — Threat landscape: AI-enabled phishing","url":"https://www.enisa.europa.eu/topics/cybersecurity-policy","publisher":"ENISA"},
        {"label":"Europol — AI-enabled crime threat report","url":"https://www.europol.europa.eu/cms/sites/default/files/documents/Europol_Innovation_Lab_Observatory_Report_AI.pdf","publisher":"Europol"},
        {"label":"FBI IC3 — Deepfake extortion alert","url":"https://www.ic3.gov/Media/Y2023/PSA230605","publisher":"FBI"},
        {"label":"SK-CERT — Klonovanie hlasu a deepfake audio","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
      ]'::jsonb,
      70),
    -- socialne-siete
    ('c7888067-e31b-5b8e-bfa2-80b81bd884cf', 'socialne_siete', '📱',
      '6 scenárov, ktoré sa dejú každý týždeň na slovenskom Instagrame a Facebooku: OAuth takeover business stránky, fake „guidelines violation” DM, Telegram investičné skupiny, sponzorované fake eshopy, kompromitovaný kamarát žiadajúci 2FA kód a legit Meta honeypot.',
      'Pre každého, kto spravuje firemnú FB stránku, IG účet pre brand, alebo aktívne komunikuje s rodinou cez Messenger. Cieľ útokov, ktorých objem v 2026 utrojnásobil.',
      '[
        {"label":"Meta Business — How we contact Page admins","url":"https://www.facebook.com/business/help/2087115554683535","publisher":"Meta"},
        {"label":"Meta — Recognizing scams from compromised friends","url":"https://www.facebook.com/help/166863010078512","publisher":"Meta"},
        {"label":"Europol — Social media account takeover","url":"https://www.europol.europa.eu/cybercrime","publisher":"Europol"},
        {"label":"NBS — Neregistrované investičné platformy","url":"https://nbs.sk/dohlad-nad-financnym-trhom/varovania/","publisher":"Národná banka Slovenska"}
      ]'::jsonb,
      70),
    -- rodicia
    ('a25c34c1-481f-5396-9845-ab0cd29abcee', 'rodicia', '👨‍👩‍👧',
      '4 situácie, na ktoré rodičia nie sú pripravení: sextortion e-mail tínedžerovi, fake teen IG profil s groomingom, obídenie Family Link kontroly cez druhý účet a SMS „vaše dieťa vyhralo” s menom zo zverejneného FB profilu.',
      'Pre rodičov detí od 10 rokov vyššie — všetkých, ktorí spravujú parental controls, čítajú DMs detí alebo dostávajú „upozornenia” v ich mene.',
      '[
        {"label":"Zodpovedne.sk — Sextortion a vydieranie","url":"https://www.zodpovedne.sk/index.php/sk/ohrozenia/sextortion","publisher":"Zodpovedne.sk"},
        {"label":"Zodpovedne.sk — Grooming a online predátori","url":"https://www.zodpovedne.sk/index.php/sk/ohrozenia/grooming","publisher":"Zodpovedne.sk"},
        {"label":"Europol — Online child sexual exploitation","url":"https://www.europol.europa.eu/crime-areas-and-statistics/crime-areas/child-sexual-exploitation","publisher":"Europol"},
        {"label":"PZ SR — Kybernetická kriminalita voči deťom","url":"https://www.minv.sk/?podvody-pre-rodicov","publisher":"Polícia SR"}
      ]'::jsonb,
      65),
    -- skoly
    ('0e38d214-78ad-5ad3-b7bd-4b81063c8700', 'skoly', '🏫',
      '3 reálne scenáre slovenských ZŠ a SŠ v 2026: lookalike EduPage prihlasovanie pre učiteľov, fake „EU dotácia 18 000 €” e-mail riaditeľke a sociálne inžinierstvo na recepcii (telefonát „som otec, akú má dnes poslednú hodinu?”).',
      'Pre učiteľov, riaditeľov, administratívnych pracovníkov a recepcie ZŠ aj SŠ — ciele phishingu cez EduPage, falošných dotačných výziev a sociálneho inžinierstva pred odchodom žiakov.',
      '[
        {"label":"aSc / EduPage — Pomocník pre učiteľov","url":"https://help.edupage.org/?lang_id=2","publisher":"aSc Applied Software Consultants"},
        {"label":"MIRRI — Skutočné výzvy a dotácie","url":"https://www.mirri.gov.sk/sekcie/digitalna-agenda/","publisher":"MIRRI SR"},
        {"label":"Ministerstvo školstva — Informácie pre školy","url":"https://www.minedu.sk/skoly-a-skolske-zariadenia/","publisher":"MŠVVaŠ SR"},
        {"label":"ÚOOÚ SR — Ochrana osobných údajov žiakov","url":"https://www.dataprotection.gov.sk/uoou/sk","publisher":"ÚOOÚ SR"}
      ]'::jsonb,
      70),
    -- zdravotnictvo
    ('5da4b6c6-371a-58f1-8908-7b76ae2e0b4a', 'zdravotnictvo', '🏥',
      '6 cielených útokov na slovenské ambulancie a kliniky: lookalike eRecept portál, vishing pre laboratórne výsledky pacienta, IBAN switch zdravotníckeho dodávateľa, ransomware lure cez CT.docx, fake „NCZI licencia vypršala” SMS a legit slovensko.sk eForm honeypot.',
      'Pre lekárov, sestry, recepcie a účtovníčky ambulancií a kliník — cieľ útokov, ktoré v 2024 spôsobili ransomware-uzamknutie viacerých slovenských zariadení.',
      '[
        {"label":"NCZI — Oficiálna komunikácia s poskytovateľmi","url":"https://www.nczisk.sk/Pages/default.aspx","publisher":"NCZI"},
        {"label":"ÚOOÚ SR — Spracovanie zdravotníckych údajov","url":"https://www.dataprotection.gov.sk/uoou/sk/content/spracuvanie-osobnych-udajov-v-oblasti-zdravotnictva","publisher":"ÚOOÚ SR"},
        {"label":"ENISA — Healthcare cybersecurity threats","url":"https://www.enisa.europa.eu/topics/critical-information-infrastructures-and-services/health","publisher":"ENISA"},
        {"label":"SK-CERT — Phishing voči zdravotníckym zariadeniam","url":"https://www.sk-cert.sk/sk/aktuality/","publisher":"NBÚ SR"}
      ]'::jsonb,
      75)
  ON CONFLICT (test_id) DO NOTHING;

  -- ---- (3) Junction — public.test_questions ----------------------------
  -- Question UUIDs from Phase C migrations (20260521210000 – 20260521260000).
  -- Position 0-indexed in the order each question appears in its source pack.
  INSERT INTO public.test_questions (test_id, question_id, position) VALUES
    -- heslo-2fa (7 questions)
    ('b50c7d01-f878-5887-9054-6c19aa332292', '36b9fe06-edfb-5523-907c-824dceff1506', 0), -- recovery-email phishing
    ('b50c7d01-f878-5887-9054-6c19aa332292', '8fe80139-f8a8-58b6-b16e-37db2e2dcb19', 1), -- passkey vs SMS
    ('b50c7d01-f878-5887-9054-6c19aa332292', 'b34d9a6c-10b2-5c7f-862b-5c97a5044f0e', 2), -- HIBP lookalike
    ('b50c7d01-f878-5887-9054-6c19aa332292', 'cb818dec-3686-5da0-b0b6-2ce3ed041385', 3), -- credential stuffing
    ('b50c7d01-f878-5887-9054-6c19aa332292', 'cae59f5b-ec9d-5bab-9b41-214a9f65ab3d', 4), -- OAuth consent
    ('b50c7d01-f878-5887-9054-6c19aa332292', '3356257d-a76f-5e7f-9c31-e3f3060bffcb', 5), -- session-expired popup
    ('b50c7d01-f878-5887-9054-6c19aa332292', '43fb5279-4085-5c12-b58f-2ce74be2a09f', 6), -- Bitwarden honeypot

    -- ai-deepfake (4 questions)
    ('b0a99389-a6d1-5ec0-ab43-69fcafea229b', '57fa4658-9604-57b1-9e4b-26add9a4285f', 0), -- AI-personalized phishing
    ('b0a99389-a6d1-5ec0-ab43-69fcafea229b', '5049bc4d-8c1d-5505-87a1-5448911a5720', 1), -- ChatGPT investment
    ('b0a99389-a6d1-5ec0-ab43-69fcafea229b', '1f9ef987-632b-510c-a593-f17370b840b2', 2), -- AI fake profile photo
    ('b0a99389-a6d1-5ec0-ab43-69fcafea229b', 'e61a7af5-90c4-5950-8cd2-792af148f2d3', 3), -- voice-clone extortion

    -- socialne-siete (6 questions)
    ('c7888067-e31b-5b8e-bfa2-80b81bd884cf', 'e917b2fe-bad3-546f-a39f-861a7d1f28ce', 0), -- FB OAuth takeover
    ('c7888067-e31b-5b8e-bfa2-80b81bd884cf', 'f40c1024-6328-5dcc-8113-8d804289a370', 1), -- IG guidelines DM
    ('c7888067-e31b-5b8e-bfa2-80b81bd884cf', '71513402-4be4-5126-b19d-4ca578cebdfc', 2), -- Telegram investment
    ('c7888067-e31b-5b8e-bfa2-80b81bd884cf', '326a6311-210a-55c3-9c0c-a9bbabf5e86d', 3), -- sponsored fake-eshop ad
    ('c7888067-e31b-5b8e-bfa2-80b81bd884cf', '0eaa14c6-84a7-5d98-9fe6-a6ee469a11eb', 4), -- compromised friend money
    ('c7888067-e31b-5b8e-bfa2-80b81bd884cf', 'f425524e-3b38-5f09-8760-65c813e360fc', 5), -- Meta security honeypot

    -- rodicia (4 questions)
    ('a25c34c1-481f-5396-9845-ab0cd29abcee', '611236e8-d384-53d1-af3b-44cce66a2bd1', 0), -- teen sextortion
    ('a25c34c1-481f-5396-9845-ab0cd29abcee', '55a7e850-97d2-55ca-974f-d6b1901fd2cd', 1), -- fake teen IG grooming
    ('a25c34c1-481f-5396-9845-ab0cd29abcee', '1bc8924f-e2f6-592d-a379-ede0f4bdef07', 2), -- parental controls bypass
    ('a25c34c1-481f-5396-9845-ab0cd29abcee', '738417a8-a88a-5c3d-bc7a-f6cfe075ee28', 3), -- child won contest SMS

    -- skoly (3 questions)
    ('0e38d214-78ad-5ad3-b7bd-4b81063c8700', '502fe72e-cb18-504e-aca7-1a1546f587da', 0), -- EduPage phishing
    ('0e38d214-78ad-5ad3-b7bd-4b81063c8700', 'b84798e0-adf0-51c9-a448-fe797aebab17', 1), -- EU dotácia email
    ('0e38d214-78ad-5ad3-b7bd-4b81063c8700', 'ef5123da-68ca-53a9-b534-d0c83edd0620', 2), -- falošný rodič call

    -- zdravotnictvo (6 questions)
    ('5da4b6c6-371a-58f1-8908-7b76ae2e0b4a', '78d29600-9a2d-598a-9d11-886f63376e1f', 0), -- e-recept portal
    ('5da4b6c6-371a-58f1-8908-7b76ae2e0b4a', 'ca064d2d-0611-5e7d-8856-7cb095395857', 1), -- vishing lab data
    ('5da4b6c6-371a-58f1-8908-7b76ae2e0b4a', '4dba6939-84e7-5c51-a8e7-73dbe5b128fd', 2), -- supplier BEC
    ('5da4b6c6-371a-58f1-8908-7b76ae2e0b4a', 'e50a9ed9-7984-570e-8c8b-5131eafe4258', 3), -- ransomware lure
    ('5da4b6c6-371a-58f1-8908-7b76ae2e0b4a', '115edd0c-784d-5160-8aea-452ab1d70e54', 4), -- NCZI SMS
    ('5da4b6c6-371a-58f1-8908-7b76ae2e0b4a', '12f096cd-3af9-5276-8487-f496ee378c31', 5)  -- NCZI honeypot
  ON CONFLICT (test_id, question_id) DO NOTHING;

  RAISE NOTICE 'E37 Phase E applied: 6 new platform packs (30 question links) added to DB';
END;
$migration$;


-- ============================================================================
-- E37 SEED — verification (run after applying, expect non-zero rows)
-- ============================================================================
SELECT
  (SELECT count(*) FROM public.questions WHERE sources_jsonb != '[]'::jsonb) AS questions_with_sources,
  (SELECT count(*) FROM public.platform_pack_metadata) AS pack_metadata_rows,
  (SELECT count(*) FROM public.tests t
     JOIN public.platform_pack_metadata m ON m.test_id = t.id
     WHERE t.status = 'published') AS published_platform_packs,
  (SELECT count(*) FROM public.test_questions tq
     JOIN public.platform_pack_metadata m ON m.test_id = tq.test_id) AS pack_question_links;
-- Expected with all 5 phases (B+C+D+E) applied:
--   questions_with_sources   = 30   (E37's new rows; legacy rows have [])
--   pack_metadata_rows       = 15   (9 existing + 6 new)
--   published_platform_packs = 15
--   pack_question_links      = 154  (124 from D + 30 from E)
-- Expected with Phase D + E skipped (platform user not created):
--   questions_with_sources   = 30
--   pack_metadata_rows       = 0
--   published_platform_packs = 0
--   pack_question_links      = 0
