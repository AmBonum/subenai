-- SEC-2026-06 (4) — Scope the attempts demographics UPDATE policy to
-- recent rows.
--
-- 20260425174650 created `"Anyone can update demographics"` with
-- USING (true) / WITH CHECK (true) — any anonymous client that learns
-- (or enumerates) a share_id could rewrite the demographics / survey
-- columns of ANY attempt forever. Score columns are protected by the
-- forbid_attempt_score_changes trigger, but nickname / age_range /
-- gender / city / country / survey answers were mutable indefinitely.
--
-- Legitimate write path (verified 2026-06-10): the ONLY attempts UPDATE
-- in src/** is SurveyCard (src/components/quiz/survey/SurveyCard.tsx),
-- rendered exclusively on the immediate post-test results screen inside
-- TestFlow — minutes after the attempts row is inserted. The shared
-- result page /r/$shareId is read-only (SELECT + self-service DELETE),
-- so there is no edit-later path. A 24-hour window comfortably covers a
-- results tab left open overnight while ending the indefinite
-- tamper-by-share-id surface. attempts.created_at is immutable
-- (forbid_attempt_score_changes raises on change), so the window cannot
-- be extended from the client.

DROP POLICY IF EXISTS "Anyone can update demographics" ON public.attempts;
CREATE POLICY "Anyone can update demographics"
ON public.attempts
FOR UPDATE
TO anon, authenticated
USING (created_at > now() - interval '24 hours')
WITH CHECK (created_at > now() - interval '24 hours');
