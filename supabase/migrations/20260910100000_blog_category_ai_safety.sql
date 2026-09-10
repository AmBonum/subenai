-- ============================================================================
-- E65 — academy category "Bezpečná práca s AI" (safe AI usage, two lanes)
-- Source: docs/superpowers/specs/2026-09-10-E65-ai-safety-content-design.md
-- ============================================================================
-- Additive + idempotent. The articles land separately via
-- supabase/backfills/20260910_ai_safety_articles.sql (run AFTER this file).

INSERT INTO public.blog_categories (slug, name, sort_order, description, seo_title, seo_description) VALUES
  ('bezpecna-praca-s-ai', 'Bezpečná práca s AI', 55,
   'Ako používať ChatGPT, Gemini, Copilot či AI agentov bez úniku dát a bez naletenia — pre bežných používateľov aj odborníkov.',
   'bezpečná práca s ai — návody pre bežných používateľov aj odborníkov | subenai',
   'Čo nikdy nepísať do chatbota, ako overiť AI odpoveď, nastavenia súkromia, prompt injection, shadow AI a bezpečnosť AI agentov — s reálnymi prípadmi.')
ON CONFLICT (slug) DO NOTHING;
