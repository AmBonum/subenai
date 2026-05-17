// Role gate for the /admin/* layout (AH-10.1).
//
// Chains after `requireSupabaseAuth`: callers should resolve the session
// first, then verify role membership via `has_role(user_id, role)` — the
// security-definer function created in AH-1.1. RLS on `user_roles` denies
// direct SELECT to non-admins, so `has_role()` is the only safe path.
//
// Returns the verified session on success. Throws a `redirect` to `/app`
// when the user is authenticated but lacks the role (no 403 page in the
// SPA yet; the app dashboard is the safe landing). AH-11 may add a
// dedicated /403 surface.

import { redirect } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface RoleContext {
  session: Session;
  role: string;
}

/**
 * Resolves the current session and verifies the user holds `role` via
 * `has_role(user_id, role)`. Throws a redirect to `/login` if no session,
 * or to `/app` if the session exists but the role check fails.
 */
export async function requireRole(role: string, redirectTo?: string): Promise<RoleContext> {
  const { session } = await requireSupabaseAuth(redirectTo);
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: session.user.id,
    _role: role,
  });
  if (error || data !== true) {
    throw redirect({ to: "/app" });
  }
  return { session, role };
}
