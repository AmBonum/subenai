-- E48 incident response helper: introspection RPC for schema invariant tests.
--
-- public.__test_introspect_function(p_name text) → TABLE(args text, returns text)
--
-- Returns pg_get_function_arguments + pg_get_function_result for every function
-- in the public schema whose proname matches p_name. Zero rows = function absent.
--
-- ACCESS:
--   REVOKE from PUBLIC, anon, authenticated — only service_role can call this.
--   Never exposes application data; reads only pg_catalog.pg_proc metadata.
--
-- WHY A MIGRATION (not a one-off SQL):
--   Keeping it in the migration history ensures the function is applied on any
--   from-scratch bootstrap (DEPLOY_SETUP.sql) and can be audited in git.
--
-- NOTE: The leading double-underscore (__) convention signals an internal
--   helper. Never call this from application code.

CREATE OR REPLACE FUNCTION public.__test_introspect_function(p_name text)
RETURNS TABLE (args text, returns text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    pg_get_function_arguments(p.oid)  AS args,
    pg_get_function_result(p.oid)     AS returns
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = p_name
    AND n.nspname  = 'public';
$$;

-- Lock down access: only service_role should call this introspection helper.
REVOKE EXECUTE ON FUNCTION public.__test_introspect_function(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.__test_introspect_function(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.__test_introspect_function(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.__test_introspect_function(text) TO service_role;
