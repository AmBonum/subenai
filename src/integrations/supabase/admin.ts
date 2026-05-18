// AH-11.3 — Service-role Supabase client factory for Cloudflare Pages Functions.
//
// This module MUST NOT be imported from anything that ships to the browser.
// The ESLint guard in eslint.config.js (`no-restricted-imports`) enforces
// the boundary; the allow-list is `*.server.ts`, `*.functions.ts`,
// `src/integrations/supabase/admin.ts` itself, and `functions/**`.
//
// The service-role key bypasses RLS. Every caller is responsible for
// verifying that the request is from an authenticated admin BEFORE
// performing any mutation. See `functions/api/admin/users/[id].ts` for
// the canonical pattern (Authorization header → JWT verify → has_role).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface AdminSupabaseEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export function createAdminClient(env: AdminSupabaseEnv): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("supabase_admin_not_configured");
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
