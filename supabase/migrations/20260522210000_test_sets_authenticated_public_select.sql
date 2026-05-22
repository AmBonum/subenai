-- Restore the public-by-link contract for authenticated viewers of
-- `public.test_sets`. The original contract from
-- `20260428000000_test_sets.sql` states: "test_sets are public-by-link
-- (the random UUID IS the secret)". It shipped only a `TO anon`
-- SELECT policy, which silently breaks when a viewer happens to be
-- signed in — Supabase RLS evaluates per-role, and a `TO anon` policy
-- never applies to a request from the `authenticated` role.
--
-- E38 ownership migration (`20260521150000_e38_test_set_ownership.sql`)
-- added a `TO authenticated USING (owner_id = auth.uid())` policy, so a
-- signed-in OWNER could read their own sets via REST — but a signed-in
-- non-owner viewer of a shared link gets neither policy and 404s.
-- Surfaced 2026-05-22: any educator who copies the respondent link from
-- `EduSuccessDialog` and clicks it from their own (signed-in) tab sees
-- "Test nenájdený" while anonymous respondents see the take page fine.
--
-- Fix: add an additive `TO authenticated USING (true)` SELECT policy
-- that mirrors the anon contract. Owner SELECT policy stays for
-- typed `list_my_test_sets`-style lookups that still need owner
-- scoping. INSERT / UPDATE / DELETE policies are unchanged.
--
-- This migration was first applied manually on prod via the dashboard
-- SQL editor (2026-05-22, see PR description); committing it here
-- ensures pre-prod / local resets stay in lockstep.

DROP POLICY IF EXISTS test_sets_authenticated_public_select ON public.test_sets;
CREATE POLICY test_sets_authenticated_public_select
  ON public.test_sets
  FOR SELECT
  TO authenticated
  USING (true);
