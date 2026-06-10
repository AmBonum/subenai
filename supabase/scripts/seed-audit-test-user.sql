-- ============================================================================
-- Audit test user — for Claude Code / agent-driven UX audits
-- ============================================================================
--
-- Run once per Supabase project (dev OR prod) via the dashboard SQL editor.
-- Idempotent: re-running ON CONFLICT-merges existing row.
--
-- Why this exists
-- ---------------
-- Live runtime audits of `/app/*` routes require a signed-in session.
-- Production Supabase has email confirmation on, so `supabase.auth.signUp`
-- from the browser leaves the user un-confirmed and sign-in fails with
-- "Email not confirmed". This script inserts auth.users directly with
-- `email_confirmed_at = now()`, plus the auth.identities row Supabase needs
-- for password sign-in, plus profile_preferences.onboarded_at so the
-- `/app/*` routes don't redirect to `/app/onboarding`.
--
-- The handle_new_user() trigger fires on the auth.users INSERT and auto-
-- creates the public.profiles + public.user_roles ('user' role) rows.
--
-- Credentials
-- -----------
--   email:    audit-bot@subenai.test
--   password: stored in 1Password ("subenai audit-bot") — NEVER commit it.
--             This repo is PUBLIC; the previous hardcoded password was
--             exposed and must be considered burned. Before running this
--             script, replace the REPLACE_ME placeholder below with the
--             current password from 1Password (do not save the edit).
--   user_id:  00000000-0000-4000-8000-0000a0d17b07
--   role:     user (NOT admin — /admin still requires AAL2 TOTP setup)
--
-- /admin coverage
-- ---------------
-- This user can audit `/app/*` (regular user routes). For `/admin/*` the
-- session additionally needs `aal2` (verified TOTP factor). Seeding a TOTP
-- factor via SQL alone is brittle — Supabase MFA stores the secret encrypted
-- and the verification flow expects a real one-time code. If admin coverage
-- is needed, the simplest path is: sign in as this user via UI, enroll TOTP
-- manually, then sign in with the 6-digit code. PR #72 already shipped
-- preventive `min-w-0` to the admin shell so the most likely overflow class
-- is covered even without runtime verification.

BEGIN;

DO $$
DECLARE
  v_user_id  uuid := '00000000-0000-4000-8000-0000a0d17b07';
  v_email    text := 'audit-bot@subenai.test';
  v_password text := 'REPLACE_ME-from-1Password';
BEGIN
  -- 1. auth.users — direct insert with confirmed email + bcrypt password.
  --    The on_auth_user_created trigger fires after this and seeds
  --    public.profiles + public.user_roles('user') automatically.
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
    jsonb_build_object('display_name', 'Audit Bot'),
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
        updated_at = now();

  -- 2. auth.identities — required for password sign-in to resolve the
  --    provider identity to the auth.users row. Supabase creates this
  --    on normal signUp; we replicate it for the direct-insert path.
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

  -- 3. profile_preferences — mark onboarded so the `/app/*` parent route
  --    does NOT redirect to /app/onboarding. Without this row,
  --    requireSupabaseAuth({ requireOnboarded: true }) sees a missing
  --    profile_preferences row → redirect loop.
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
        updated_at = now();
END $$;

COMMIT;

-- ============================================================================
-- Verification queries — run after the above to sanity-check
-- ============================================================================
-- SELECT id, email, email_confirmed_at IS NOT NULL AS confirmed
--   FROM auth.users WHERE email = 'audit-bot@subenai.test';
-- SELECT user_id, role FROM public.user_roles
--   WHERE user_id = '00000000-0000-4000-8000-0000a0d17b07';
-- SELECT user_id, onboarded_at FROM public.profile_preferences
--   WHERE user_id = '00000000-0000-4000-8000-0000a0d17b07';

-- ============================================================================
-- Optional: promote to admin (only if you also enrol a TOTP factor)
-- ============================================================================
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('00000000-0000-4000-8000-0000a0d17b07', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
--
-- After this, sign in via /login, then go to the 2FA enroll page and
-- complete TOTP setup with an authenticator app. Without that step,
-- /admin still redirects to /login/enroll-2fa.

-- ============================================================================
-- Tear-down (in case you ever want to retire this test user)
-- ============================================================================
-- DELETE FROM auth.users WHERE id = '00000000-0000-4000-8000-0000a0d17b07';
--   (CASCADE removes profiles, user_roles, profile_preferences, identities)
