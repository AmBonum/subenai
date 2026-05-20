-- E42 / P-18 + P-28 — GDPR Art. 15 (right of access) + Art. 20
-- (right to data portability) self-service export.
--
-- Before this migration, both rights were exercisable only via the
-- manual DSR queue (`dsr_requests` table). E42 closes the gap by
-- adding a SECURITY DEFINER RPC that lets an authenticated user
-- download a JSON of every record we hold about them, on demand,
-- without operator involvement.
--
-- The JSON is machine-readable (Art. 20 portability requirement) and
-- includes every user-scoped surface in the public schema:
--   - profile        (display_name, email, avatar_initials, created_at)
--   - dsr_requests   (any prior DSR submissions tied to the user's email)
--   - attempts       (anonymous quiz attempts are not user-scoped, so
--                     the export is empty for the anonymous flow — the
--                     share link IS the data subject's access path)
--
-- The RPC uses `auth.uid()` so a user cannot export anyone else's
-- data. Anonymous callers (no JWT) get an error.

CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email   text;
  v_payload jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized'
      USING ERRCODE = '42501', HINT = 'GDPR Art. 15 export requires an authenticated session';
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = v_user_id;

  v_payload := jsonb_build_object(
    'generated_at', now(),
    'subject',      jsonb_build_object('user_id', v_user_id, 'email', v_email),
    'rights', jsonb_build_object(
      'access',      'GDPR Art. 15',
      'portability', 'GDPR Art. 20',
      'erasure',     'GDPR Art. 17 — see /app/account/profile for delete'
    ),
    'records', jsonb_build_object(
      'profile',
        COALESCE(
          (SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = v_user_id),
          'null'::jsonb
        ),
      'dsr_requests',
        COALESCE(
          (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC)
             FROM public.dsr_requests d
             WHERE v_email IS NOT NULL AND d.requester_email = v_email),
          '[]'::jsonb
        ),
      'attempts_note',
        'Anonymous quiz attempts are not linked to your user account. '
        'Your share link (/r/<share_id>) is the access surface for those rows. '
        'Edu-mode attempts where you were the respondent are owned by the '
        'test author; exercise Art. 15 with them.'
    )
  );

  RETURN v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.export_my_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;

COMMENT ON FUNCTION public.export_my_data() IS
  'E42 / P-18 + P-28 — GDPR Art. 15 + Art. 20 self-service export. '
  'Returns a JSON snapshot of every user-scoped record tied to the '
  'current auth.uid(). Anonymous callers are rejected. Used by '
  '/api/account/export-data and the "Download my data" button on '
  '/app/account/profile.';
