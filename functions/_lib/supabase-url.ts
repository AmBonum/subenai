// HARDCODE 2026-05-20 — Cloudflare Pages Production env-vars have a
// stale SUPABASE_URL pointing to `wbrxnahwzqbabbdcdrjv.supabase.co`, a
// retired project. The real prod project is `lwxichbuvcakscntjkzs`
// (matches .env VITE_SUPABASE_URL that the browser uses + .dev.vars
// SUPABASE_URL that local dev uses + the project where migrations
// 20260501000000_edu_mode.sql etc. actually applied).
//
// Diagnosed via prod fingerprint probe (commit 44e1400): Function
// reported `debug_url=https://wbrxnahwzqbabbdcdrjv.supabase.co`. The
// service_role key paste-tested fine against the right project but
// gets sent to the wrong project's PostgREST → "Invalid API key".
//
// Hardcoded here because (1) the URL is not a secret — it's already in
// .env as VITE_SUPABASE_URL — and (2) the Cloudflare Dashboard env-var
// edit is for the user to handle when they're ready; in the meantime
// every CF Function should still talk to the right Supabase.
//
// Remove this hardcode + revert to `env.SUPABASE_URL` ONLY when:
//   - Cloudflare Pages env-var SUPABASE_URL has been updated to
//     https://lwxichbuvcakscntjkzs.supabase.co for Production scope
//   - A new deploy has rebuilt the bundle with the corrected env

export const PROD_SUPABASE_URL = "https://lwxichbuvcakscntjkzs.supabase.co";
