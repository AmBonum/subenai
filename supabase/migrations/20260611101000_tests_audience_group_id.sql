-- E50 review fix (3) — tests.audience_group_id: persist the wizard's
-- step-2 audience selection.
--
-- Previously the selected respondent_groups id was pushed into
-- tests.segmentation — a free-tags text[] that feeds the branch filter
-- chips on /app/tests — leaking raw UUIDs into user-facing tag chips.
-- Dedicated nullable FK instead; ON DELETE SET NULL so deleting a group
-- never blocks and never cascades into tests.

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS audience_group_id uuid NULL
    REFERENCES public.respondent_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tests_audience_group_id_idx
  ON public.tests (audience_group_id)
  WHERE audience_group_id IS NOT NULL;
