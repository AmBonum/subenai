// Phase 3 of /app redesign — shared post-login routing.
//
// Both /login (password) and /auth/callback (OAuth + magic-link) need the
// same decision tree once a session is established:
//   1. Admins must hold a verified TOTP factor; if not → /login/enroll-2fa.
//   2. Admin sessions must be at AAL2 before reaching /admin; AAL1 → /login/verify-2fa.
//   3. Authenticated admin at AAL2 → /admin.
//   4. Regular users → /app (the /app beforeLoad gate will bounce
//      first-time users to /app/onboarding via requireOnboarded).
//
// Centralizing keeps the two entry points in lock-step. Behavior matches
// the inline logic that previously lived in `src/routes/login.tsx`.

import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getAALStatus, listFactors } from "@/lib/auth/mfa";

export interface PostLoginTarget {
  to: "/app" | "/admin" | "/login/enroll-2fa" | "/login/verify-2fa";
  search?: { redirect: string };
}

export async function decidePostLoginTarget(session: Session): Promise<PostLoginTarget> {
  const { data: roleOk } = await supabase.rpc("has_role", {
    _user_id: session.user.id,
    _role: "admin",
  });
  const isAdmin = roleOk === true;

  if (!isAdmin) {
    return { to: "/app" };
  }

  const factors = await listFactors();
  const hasFactor = factors.totp.some((f) => f.status === "verified");
  if (!hasFactor) {
    return { to: "/login/enroll-2fa" };
  }

  const aal = await getAALStatus();
  if (aal.currentLevel !== "aal2") {
    return { to: "/login/verify-2fa", search: { redirect: "/admin" } };
  }

  return { to: "/admin" };
}
