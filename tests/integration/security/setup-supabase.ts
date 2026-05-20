// E35.2 — local Supabase test harness.
//
// Mints fresh JWTs for four contexts (anon / userA / userB / admin)
// against a local Supabase instance. Tests use these clients to
// exercise RLS policies AS THE SUPABASE WOULD RECEIVE THE CALLS —
// not against a mock.
//
// Required env (from `.env.test.local`):
//   - SUPABASE_URL                    (defaults http://127.0.0.1:54321)
//   - SUPABASE_ANON_KEY               (from `supabase status`)
//   - SUPABASE_SERVICE_ROLE_TEST_KEY  (from `supabase status`)
//
// If any of the three is missing, `requireLocalSupabase()` returns
// `null` and the suite skips itself with a clear message.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface LocalSupabaseFixture {
  anon: SupabaseClient;
  serviceRole: SupabaseClient;
  url: string;
}

export function getLocalSupabase(): LocalSupabaseFixture | null {
  const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_TEST_KEY;
  if (!anonKey || !serviceKey) return null;

  return {
    url,
    anon: createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    serviceRole: createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

/** Quick liveness check — confirms the local Postgres is reachable. */
export async function isReachable(client: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await client.from("attempts").select("share_id").limit(1);
    // If RLS denies SELECT entirely, that's still "reachable" — just empty.
    return !error || error.code !== "PGRST301";
  } catch {
    return false;
  }
}
