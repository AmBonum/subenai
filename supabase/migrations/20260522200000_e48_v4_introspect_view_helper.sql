-- E48-v4 test infrastructure: view-definition introspection helper.
--
-- public.__test_introspect_view(p_name text) → text
--
-- Returns pg_get_viewdef() for every view in the public schema whose
-- name matches p_name. Zero rows / NULL = view absent.
--
-- Use case: schema-invariants regression tests assert that a view does
-- NOT reference forbidden tables (e.g. `auth.users` under
-- security_invoker). The string comparison runs in JS so we don't need
-- to parse SQL in Postgres.
--
-- ACCESS: service_role only. Never exposes application data; reads
-- only pg_catalog metadata.

CREATE OR REPLACE FUNCTION public.__test_introspect_view(p_name text)
RETURNS TABLE (definition text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pg_get_viewdef(c.oid, true) AS definition
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('v', 'm')
    AND n.nspname  = 'public'
    AND c.relname  = p_name;
$$;

REVOKE EXECUTE ON FUNCTION public.__test_introspect_view(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.__test_introspect_view(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.__test_introspect_view(text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.__test_introspect_view(text) TO service_role;

NOTIFY pgrst, 'reload schema';
