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
//
// Phase 3 of /app redesign added the `requireOnboarded` option. When set,
// the resolved session is followed by a single read of
// `profile_preferences.onboarded_at`; a missing row or NULL value triggers
// a redirect to /app/onboarding. The onboarding route itself passes
// `requireOnboarded: false` to short-circuit the loop.

import { redirect } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthContext {
  session: Session;
}

export interface RequireAuthOptions {
  /**
   * If true, after the session check, verify that
   * `profile_preferences.onboarded_at` is non-null for this user.
   * Missing row or NULL → redirect to /app/onboarding.
   *
   * Default: false (backwards-compatible — only /app opts in).
   */
  requireOnboarded?: boolean;
}

/**
 * Resolves the current Supabase session. Throws a `redirect` to `/login`
 * (with `redirect` param preserving the requested path) if no session is
 * present. Intended for use in a route's `beforeLoad`:
 *
 *   beforeLoad: ({ location }) => requireSupabaseAuth(location.pathname),
 *
 * Pass `{ requireOnboarded: true }` as the second arg to also gate on
 * the user having completed onboarding.
 */
export async function requireSupabaseAuth(
  redirectTo?: string,
  options?: RequireAuthOptions,
): Promise<AuthContext> {
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

  if (options?.requireOnboarded) {
    const { data: prefs } = await supabase
      .from("profile_preferences")
      .select("onboarded_at")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (!prefs?.onboarded_at) {
      throw redirect({ to: "/app/onboarding" });
    }
  }

  return { session };
}
