-- E45 Phase 4 / security review §L1 — automated audit_log row on every
-- INSERT / DELETE against `public.test_questions`.
--
-- Appendix A §5.4 specified a `test_question_modified` row written
-- "inside the server fn that handles add/remove/reorder." The Phase 1
-- implementation issued the writes directly from the client via
-- supabase-js (useAddQuestionsToTest / useRemoveQuestionFromTest /
-- useUpdateTestQuestionOrder), with no server-side wrapper to attach
-- the audit row. A Postgres trigger fills that gap automatically —
-- runs under the caller's `auth.uid()`, so the trail is honest about
-- WHO modified the question bank, and it survives any future refactor
-- of the client-side queries layer.
--
-- The trigger captures three operations:
--
--   * INSERT      → op = 'add'      (one row per question added)
--   * DELETE      → op = 'remove'   (one row per question removed)
--   * (UPDATE position-only via reorder) → handled by the delete-then-
--     insert strategy in useUpdateTestQuestionOrder, so reorder fires
--     a series of delete + insert audit rows. This is intentionally
--     more verbose than a single "reorder" entry — it preserves the
--     pre-/post-order in the timestamped sequence, which is what
--     forensics actually needs.
--
-- `actor_id = auth.uid()` works because the client call sets the JWT;
-- when the call comes from service_role (admin override), auth.uid() is
-- NULL and we log `actor_id = NULL` honestly rather than fabricating an
-- owner. Per §5.4 the trigger writes `target_id = test_id::text`,
-- `pii_access = false`, and a JSONB details payload with the question_id.

CREATE OR REPLACE FUNCTION public.log_test_question_modified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _op TEXT;
  _question_id UUID;
  _test_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _op := 'add';
    _question_id := NEW.question_id;
    _test_id := NEW.test_id;
  ELSIF TG_OP = 'DELETE' THEN
    _op := 'remove';
    _question_id := OLD.question_id;
    _test_id := OLD.test_id;
  ELSE
    -- UPDATE — currently unused by the queries layer (reorder is
    -- delete-then-insert), but include for completeness.
    _op := 'update';
    _question_id := NEW.question_id;
    _test_id := NEW.test_id;
  END IF;

  INSERT INTO public.audit_log
    (actor_id, action, target_type, target_id, pii_access, details)
    VALUES (
      auth.uid(),
      'test_question_modified',
      'test',
      _test_id::text,
      false,
      jsonb_build_object('op', _op, 'question_id', _question_id::text)
    );

  -- Trigger return: NEW for INSERT/UPDATE, OLD for DELETE.
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.log_test_question_modified() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS test_questions_modified_audit ON public.test_questions;
CREATE TRIGGER test_questions_modified_audit
  AFTER INSERT OR DELETE OR UPDATE
  ON public.test_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_test_question_modified();

COMMENT ON FUNCTION public.log_test_question_modified() IS
  'E45 / security review §L1 — appends audit_log row on every INSERT / DELETE / UPDATE of test_questions, capturing the caller (auth.uid()) and the question_id. SECURITY DEFINER so anon callers cannot bypass; REVOKE'' makes direct EXECUTE impossible.';

COMMENT ON TRIGGER test_questions_modified_audit ON public.test_questions IS
  'E45 / security review §L1 — fires log_test_question_modified() after any change to test_questions so the question-bank edit trail is captured even though the queries layer is client-driven (no server fn wrapper).';
