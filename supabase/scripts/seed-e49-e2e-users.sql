-- ============================================================================
-- E49 e2e test users — TU-A, TU-B, TU-Resp, TU-Admin
-- ============================================================================
--
-- Run once per Supabase project (local OR prod) via the dashboard SQL editor.
-- Idempotent: re-running ON CONFLICT-merges existing rows.
--
-- Reconciles pre-existing accounts: if any e2e email already lives under a
-- non-deterministic UUID (e.g. a developer signed up through the UI before
-- this script ran), the rogue row is dropped first (CASCADE) so the
-- deterministic-UUID insert can land. Without this, fixtures that hard-code
-- the deterministic UUID silently own nothing (manifests as 403 `not_owner`).
--
-- Why this exists
-- ---------------
-- E49 Phase 1c integration / live-Supabase tests need deterministic signed-in
-- accounts that can drive the real /app/tests/* surface end-to-end. Browser
-- sign-up is rate-limited and requires confirmable inboxes; this script
-- inserts auth.users directly with `email_confirmed_at = now()` plus the
-- auth.identities row Supabase needs for password sign-in, plus
-- profile_preferences.onboarded_at so the `/app/*` parent route does NOT
-- redirect to /app/onboarding.
--
-- The on_auth_user_created trigger fires on the auth.users INSERT and
-- auto-creates the public.profiles + public.user_roles ('user') rows.
-- TU-Admin gets an additional `user_roles('admin')` insert at the bottom.
--
-- IMPORTANT — never touch audit-bot@subenai.test from this script.
-- That user is owned by a separate flow (`seed-audit-test-user.sql`) and is
-- shared with manual audits per `.claude/CLAUDE.md`. Deleting / overwriting
-- it would break that flow.
--
-- Credentials (stable; mirrored in `e2e/fixtures/e49-fixtures.ts`)
-- ----------------------------------------------------------------
--   TU-A:     e2e-e49-educator-a@subenai.test  /  E2E-e49-pwd-do-not-reuse
--   TU-B:     e2e-e49-educator-b@subenai.test  /  E2E-e49-pwd-do-not-reuse
--   TU-Resp:  e2e-e49-respondent@subenai.test  /  E2E-e49-pwd-do-not-reuse
--   TU-Admin: e2e-e49-admin@subenai.test       /  E2E-e49-pwd-do-not-reuse
--
-- UUIDs are deterministic and shaped `e2e0001-e49a-4001-8001-*` so the
-- teardown can prefix-match via the canonical list in
-- `e2e/fixtures/e49-fixtures.ts`.

BEGIN;

DO $$
DECLARE
  v_password text := 'E2E-e49-pwd-do-not-reuse';
  v_users    jsonb := jsonb_build_array(
    jsonb_build_object(
      'id',          'e2e00001-e49a-4001-8001-0000aaaaaa01',
      'email',       'e2e-e49-educator-a@subenai.test',
      'display_name','E2E E49 Educator A',
      'is_admin',    false
    ),
    jsonb_build_object(
      'id',          'e2e00001-e49a-4001-8001-0000bbbbbb02',
      'email',       'e2e-e49-educator-b@subenai.test',
      'display_name','E2E E49 Educator B',
      'is_admin',    false
    ),
    jsonb_build_object(
      'id',          'e2e00001-e49a-4001-8001-0000cccccc03',
      'email',       'e2e-e49-respondent@subenai.test',
      'display_name','E2E E49 Respondent',
      'is_admin',    false
    ),
    jsonb_build_object(
      'id',          'e2e00001-e49a-4001-8001-0000dddddd04',
      'email',       'e2e-e49-admin@subenai.test',
      'display_name','E2E E49 Admin',
      'is_admin',    true
    )
  );
  v_user     jsonb;
  v_user_id  uuid;
  v_email    text;
  v_display  text;
  v_is_admin boolean;
BEGIN
  FOR v_user IN SELECT * FROM jsonb_array_elements(v_users)
  LOOP
    v_user_id  := (v_user->>'id')::uuid;
    v_email    := v_user->>'email';
    v_display  := v_user->>'display_name';
    v_is_admin := (v_user->>'is_admin')::boolean;

    -- Guard: NEVER overwrite the shared audit-bot account.
    IF v_email = 'audit-bot@subenai.test' THEN
      RAISE EXCEPTION 'E49 seed: refused to touch audit-bot@subenai.test';
    END IF;

    -- 0. Reconcile pre-existing accounts.
    --    If the e2e email already lives under a non-deterministic UUID
    --    (e.g. someone signed up through /login while developing), the
    --    INSERT below would 23505 on the email unique index AND every
    --    fixture that hard-codes the deterministic UUID would silently
    --    own nothing (manifests as 403 `not_owner` against canary data).
    --    Wipe the rogue row first — CASCADE removes its identities,
    --    profiles, user_roles, and profile_preferences. Owned rows in
    --    `public.tests` etc. block the delete; those are intentional
    --    test artefacts and must be cleaned up by the caller before
    --    re-seeding.
    DELETE FROM auth.users
     WHERE email = v_email
       AND id   <> v_user_id;

    -- 1. auth.users — direct insert with confirmed email + bcrypt password.
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', v_display),
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    ON CONFLICT (id) DO UPDATE
      SET encrypted_password = EXCLUDED.encrypted_password,
          email_confirmed_at = COALESCE(auth.users.email_confirmed_at, EXCLUDED.email_confirmed_at),
          updated_at         = now();

    -- 2. auth.identities — required for password sign-in to resolve the
    --    provider identity to the auth.users row.
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'email_verified', true
      ),
      'email',
      now(),
      now(),
      now()
    )
    ON CONFLICT (provider, provider_id) DO NOTHING;

    -- 3. profile_preferences — mark onboarded so /app/* doesn't bounce to
    --    /app/onboarding.
    INSERT INTO public.profile_preferences (
      user_id,
      onboarded_at,
      audience_kind,
      scam_interests,
      digest_cadence,
      digest_quiet_weeks
    )
    VALUES (
      v_user_id,
      now(),
      'other',
      ARRAY['phishing', 'voice_clone'],
      'off',
      false
    )
    ON CONFLICT (user_id) DO UPDATE
      SET onboarded_at = COALESCE(public.profile_preferences.onboarded_at, EXCLUDED.onboarded_at),
          updated_at   = now();

    -- 4. Admin promotion for TU-Admin only. handle_new_user already seeded
    --    the 'user' role row; this adds 'admin' on top.
    IF v_is_admin THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- Verification queries
-- ============================================================================
-- SELECT id, email, email_confirmed_at IS NOT NULL AS confirmed
--   FROM auth.users
--  WHERE email LIKE 'e2e-e49-%@subenai.test'
--  ORDER BY email;
-- SELECT user_id, role FROM public.user_roles
--  WHERE user_id IN (
--    'e2e00001-e49a-4001-8001-0000aaaaaa01',
--    'e2e00001-e49a-4001-8001-0000bbbbbb02',
--    'e2e00001-e49a-4001-8001-0000cccccc03',
--    'e2e00001-e49a-4001-8001-0000dddddd04'
--  )
--  ORDER BY user_id, role;

-- ============================================================================
-- Tear-down (manual; only if you want to fully retire the e2e users)
-- ============================================================================
-- DELETE FROM auth.users
--  WHERE id IN (
--    'e2e00001-e49a-4001-8001-0000aaaaaa01',
--    'e2e00001-e49a-4001-8001-0000bbbbbb02',
--    'e2e00001-e49a-4001-8001-0000cccccc03',
--    'e2e00001-e49a-4001-8001-0000dddddd04'
--  );
-- -- (CASCADE removes profiles, user_roles, profile_preferences, identities)
