-- E44 Phase D — anon-read access to platform defaults + public+published
-- templates. Phase A only granted SELECT to `authenticated`; the public
-- `/sablony` SEO gallery serves anon visitors (and Googlebot) and would
-- otherwise see an empty page.
--
-- Sister policies (existing, untouched):
--   - templates_read_defaults             (TO authenticated)
--   - templates_read_public_published     (TO authenticated)
--   - templates_read_own                  (TO authenticated)
--   - templates_insert_own / _update_own / _delete_own / _admin_all
--
-- We add two anon-scoped read policies. We do NOT widen the existing
-- authenticated policies because that would also have to widen the
-- write policies that share the same name — keeping anon as separate
-- policies is the smallest, most reviewable diff.
--
-- Anon DOES NOT see:
--   - private templates (visibility != 'public' OR status != 'published')
--   - templates owned by other users that are unpublished
--   - the AI precheck JSON (lives on `template_submissions`, never readable
--     by anon — RLS on that table grants no anon role)
--
-- After this migration, an unauthenticated Googlebot crawler can read
-- the title / description / question_ids / age_rating / slug /
-- author_display_name / published_at / updated_at columns for every
-- platform-default or admin-approved community template. Same data the
-- public `/sablony` gallery renders.

CREATE POLICY templates_anon_read_defaults ON public.templates
  FOR SELECT TO anon
  USING (owner_id IS NULL);

CREATE POLICY templates_anon_read_public_published ON public.templates
  FOR SELECT TO anon
  USING (visibility = 'public' AND status = 'published');

-- Self-check after applying:
--   SELECT polname, roles FROM pg_policies
--     WHERE tablename = 'templates'
--       AND polname IN ('templates_anon_read_defaults', 'templates_anon_read_public_published');
--     -- expect 2 rows, each with roles = {anon}
--
-- Smoke (run as anon JWT or via PostgREST without auth header):
--   SELECT count(*) FROM public.templates WHERE owner_id IS NULL;
--     -- expect 15 (platform defaults seeded in Phase A)
--   SELECT count(*) FROM public.templates
--     WHERE visibility = 'public' AND status = 'published';
--     -- expect ≥ 15 (defaults are public+published; plus any approved community templates)
