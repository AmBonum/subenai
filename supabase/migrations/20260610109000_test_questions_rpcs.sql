-- SEC-2026-06 (11) — test-builder RPCs: replace_test_questions + duplicate_test.
--
-- The frontend (src/lib/platform/queries.ts) already calls both RPCs:
--   * useCreateTest / useUpdateTestQuestionOrder → replace_test_questions
--     (replaces the old client-side delete-all-then-insert, which could
--     leave a test empty if the insert failed mid-flight),
--   * useDuplicateTest → duplicate_test (the old client-side copy
--     silently dropped every test_questions row).
--
-- Schema facts (20260517000000_admin_hub_schema.sql):
--   * test_questions(test_id, question_id, position int NOT NULL DEFAULT 0),
--     PK (test_id, question_id). Positions are 0-based — the removed
--     client insert used the array index directly.
--   * tests.share_id must match the respondent gate ^[a-zA-Z0-9]{6,12}$
--     (attempts_share_id_format precedent in 20260425173314_*.sql and
--     src/lib/platform/share-id.ts). Generated here as 10-char base62
--     via rejection sampling (248 = 4 * 62, no modulo bias).
--
-- Authorization follows the hash_test_password house pattern
-- (20260521220000_test_password_v2.sql): SECURITY DEFINER + explicit
-- in-body ownership check (owner OR admin — same principals the
-- test_questions_via_test_write RLS policy grants), pinned search_path,
-- EXECUTE granted to authenticated only.
--
-- Input contract for replace_test_questions: p_question_ids must be
-- non-null with no NULL elements; duplicates are REJECTED (explicit
-- 'duplicate_question_ids') rather than silently deduplicated — a dup
-- in the payload means the client's ordering state is corrupt and the
-- PK would abort the insert anyway, so fail loudly with a clean error.
-- An empty array is valid and clears the test's question list (matches
-- the old client path: delete all, skip insert).

CREATE OR REPLACE FUNCTION public.replace_test_questions(
  p_test_id uuid,
  p_question_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF p_test_id IS NULL OR p_question_ids IS NULL THEN
    RAISE EXCEPTION 'invalid_args';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_question_ids) AS u(id) WHERE u.id IS NULL) THEN
    RAISE EXCEPTION 'invalid_args';
  END IF;
  IF cardinality(p_question_ids)
     <> (SELECT count(DISTINCT u.id) FROM unnest(p_question_ids) AS u(id)) THEN
    RAISE EXCEPTION 'duplicate_question_ids';
  END IF;

  SELECT owner_id INTO v_owner FROM public.tests WHERE id = p_test_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'test_not_found';
  END IF;
  IF v_owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  DELETE FROM public.test_questions WHERE test_id = p_test_id;

  INSERT INTO public.test_questions (test_id, question_id, position)
  SELECT p_test_id, q.id, (q.ord - 1)::int
    FROM unnest(p_question_ids) WITH ORDINALITY AS q(id, ord);
END;
$$;

REVOKE ALL ON FUNCTION public.replace_test_questions(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_test_questions(uuid, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.replace_test_questions(uuid, uuid[]) IS
  'Transactionally replaces a test''s question list; position = 0-based '
  'array index. Owner/admin only. Rejects NULL elements and duplicate '
  'ids (duplicate_question_ids). Empty array clears the list.';

-- ----------------------------------------------------------------------------
-- duplicate_test: server-side copy of a tests row + its test_questions.
-- Copied columns mirror the removed client (queries.ts useDuplicateTest):
-- slug suffixed '-copy-<epoch ms>', fresh share_id, owner_id, team_id,
-- title suffixed ' (kópia)', description; status always 'draft'
-- (published_at stays NULL via default). Everything else takes table
-- defaults, exactly like the old client insert.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.duplicate_test(p_test_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_src public.tests%ROWTYPE;
  v_new_id uuid;
  v_share_id text;
  v_alphabet constant text :=
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  v_bytes bytea;
  v_byte int;
  i int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF p_test_id IS NULL THEN
    RAISE EXCEPTION 'invalid_args';
  END IF;

  SELECT * INTO v_src FROM public.tests WHERE id = p_test_id;
  IF v_src.id IS NULL THEN
    RAISE EXCEPTION 'test_not_found';
  END IF;
  IF v_src.owner_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  LOOP
    v_share_id := '';
    WHILE length(v_share_id) < 10 LOOP
      v_bytes := gen_random_bytes(16);
      FOR i IN 0..15 LOOP
        v_byte := get_byte(v_bytes, i);
        -- Rejection sampling: 248 = 4 * 62, bytes < 248 map uniformly
        -- onto the 62-char alphabet (same scheme as share-id.ts).
        IF v_byte < 248 THEN
          v_share_id := v_share_id || substr(v_alphabet, (v_byte % 62) + 1, 1);
          EXIT WHEN length(v_share_id) = 10;
        END IF;
      END LOOP;
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.tests WHERE share_id = v_share_id);
  END LOOP;

  INSERT INTO public.tests
    (slug, share_id, owner_id, team_id, title, description, status)
  VALUES (
    v_src.slug || '-copy-'
      || (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
    v_share_id,
    v_src.owner_id,
    v_src.team_id,
    v_src.title || ' (kópia)',
    v_src.description,
    'draft'
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.test_questions (test_id, question_id, position)
  SELECT v_new_id, tq.question_id, tq.position
    FROM public.test_questions tq
    WHERE tq.test_id = p_test_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.duplicate_test(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_test(uuid) TO authenticated;

COMMENT ON FUNCTION public.duplicate_test(uuid) IS
  'Copies a tests row (fresh 10-char base62 share_id, slug ''-copy-<ms>'', '
  'title '' (kópia)'', status draft) AND its test_questions in one '
  'transaction. Owner/admin only. Returns the new test id.';
