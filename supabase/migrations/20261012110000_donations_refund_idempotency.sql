-- ============================================================================
-- Stripe refund idempotency — one donations row per Stripe refund step.
-- ============================================================================
-- charge.refunded is delivered at-least-once and charge.amount_refunded is
-- cumulative, so the webhook keys each negative row by the Stripe refund id
-- and relies on this UNIQUE index to drop duplicate deliveries (23505).
-- Additive + idempotent; legacy refund rows keep NULL (NULLs never collide).

ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS stripe_refund_id text;

CREATE UNIQUE INDEX IF NOT EXISTS donations_stripe_refund_id_key
  ON public.donations (stripe_refund_id);
