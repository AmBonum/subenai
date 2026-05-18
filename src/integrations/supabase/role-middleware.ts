// Role gate for the /admin/* layout (AH-10.1, AH-12.7).
//
// Chains after `requireSupabaseAuth`: callers should resolve the session
// first, then verify role membership via `has_role(user_id, role)` — the
// security-definer function created in AH-1.1. RLS on `user_roles` denies
// direct SELECT to non-admins, so `has_role()` is the only safe path.
//
// AH-12.7: admin role additionally requires AAL2. Sessions at AAL1 are
// pushed to /login/verify-2fa (or /login/enroll-2fa if no factor exists)
// with `?redirect=` preserving the original target. The DB-level admin
// privilege is still gated by `has_role`; the AAL2 check here is a
// session-strength requirement layered on top.

import { redirect } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAALStatus, listFactors } from "@/lib/auth/mfa";

export interface RoleContext {
  session: Session;
  role: string;
}

/**
 * Resolves the current session and verifies the user holds `role` via
 * `has_role(user_id, role)`. Throws a redirect to `/login` if no session,
 * or to `/app` if the session exists but the role check fails. For the
 * "admin" role the session must additionally have currentLevel === "aal2";
 * AAL1 admin sessions are redirected to verify/enroll.
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

  if (role === "admin") {
    const aal = await getAALStatus();
    if (aal.currentLevel !== "aal2") {
      const factors = await listFactors();
      const hasFactor = factors.totp.some((f) => f.status === "verified");
      throw redirect({
        to: hasFactor ? "/login/verify-2fa" : "/login/enroll-2fa",
        search: { redirect: redirectTo ?? "/admin" },
      });
    }
  }

  return { session, role };
}
