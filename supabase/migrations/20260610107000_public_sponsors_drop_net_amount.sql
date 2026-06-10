-- SEC-2026-06 (9) — public_sponsors: drop net_amount_eur from the
-- anon-readable view.
--
-- The sponsors / subscriptions / donations base tables have RLS enabled
-- with NO anon SELECT policies — the views exist precisely to expose a
-- safe definer-resolved subset, so they intentionally stay
-- security_definer (flipping to security_invoker would blank them for
-- every public visitor).
--
-- 20260517000000_refund_aware_views.sql added `total_eur AS
-- net_amount_eur` to public_sponsors, contradicting the original E10.2
-- contract ("never exposes total_eur") — and the frontend never reads
-- it: /sponzori and /sponzori/vsetci select only id, display_name,
-- display_link, display_message, created_at, has_refund (the "Vrátené"
-- badge needs has_refund, not the amount). Cumulative donation totals
-- per named person are financial data with no public purpose here —
-- drop the column. has_refund stays.
--
-- footer_sponsors already projects an explicit narrow column list
-- (id, display_name, display_link, created_at — created_at feeds the
-- footer's ORDER BY) and is left unchanged.
--
-- DROP + CREATE (not CREATE OR REPLACE) because Postgres cannot remove
-- a column from an existing view in-place.

DROP VIEW IF EXISTS public.public_sponsors;
CREATE VIEW public.public_sponsors AS
SELECT
  s.id,
  s.display_name,
  s.display_link,
  s.display_message,
  s.created_at,
  EXISTS (
    SELECT 1 FROM public.donations d
    WHERE d.sponsor_id = s.id AND d.kind = 'refund'
  ) AS has_refund
FROM public.sponsors s
WHERE s.display_name IS NOT NULL;

GRANT SELECT ON public.public_sponsors TO anon, authenticated;

COMMENT ON VIEW public.public_sponsors IS
  'E10.2 sponsorship — anon-readable subset with opt-in display_* fields '
  'plus has_refund (renders the "Vrátené" badge on /sponzori). '
  'SEC-2026-06: net_amount_eur removed — donation totals are never '
  'exposed publicly and the frontend never consumed the column.';
