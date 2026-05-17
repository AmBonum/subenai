// Auth gate for the /app/* layout (AH-3.1).
//
// AH-3 is mock-first: this module's only Supabase touchpoint is the
// session-cookie read (no data queries). When AH-11 wires real data, the
// `requireSupabaseAuth` shape stays stable — callers either use it as a
// route `beforeLoad` (client SPA path, current state) or as a TanStack
// `createServerFn` middleware (server-side, AH-11). The function returns
// the resolved session or throws a `redirect` to `/login`.
//
// Why an explicit redirect throw: TanStack Router treats a thrown
// `redirect()` from `beforeLoad` as a hard route gate — children never
// render, so we cannot leak protected UI in the brief window before a
// client redirect would land.

import { redirect } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthContext {
  session: Session;
}

/**
 * Resolves the current Supabase session. Throws a `redirect` to `/login`
 * (with `redirect` param preserving the requested path) if no session is
 * present. Intended for use in a route's `beforeLoad`:
 *
 *   beforeLoad: ({ location }) => requireSupabaseAuth(location.pathname),
 *
 * AH-11 swaps this for a `createServerFn` middleware reading the session
 * cookie server-side. The return shape stays the same.
 */
export async function requireSupabaseAuth(redirectTo?: string): Promise<AuthContext> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw redirect({
      to: "/login",
      search: redirectTo ? { redirect: redirectTo } : undefined,
    });
  }
  if (!session) {
    throw redirect({
      to: "/login",
      search: redirectTo ? { redirect: redirectTo } : undefined,
    });
  }
  return { session };
}
