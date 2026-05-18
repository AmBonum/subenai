// Centralized sign-out helper. Called from the AppShell logout button
// (/app/*) and the AdminSidebar footer (/admin/*).
//
// Calls `supabase.auth.signOut()` which revokes the refresh token
// server-side and clears the session from local storage. Then redirects
// to the public homepage so the user lands on something useful — not
// `/login`, which is a noisy entry point and would feel like the click
// did nothing.
//
// Failure mode: if signOut throws (network error, refresh token already
// invalid), we still navigate away. The session may linger client-side
// for a few minutes until the access token expires; that is acceptable
// — protected routes re-check via getSession on each navigation.

import { supabase } from "@/integrations/supabase/client";

export async function signOutAndRedirect(redirectTo: string = "/"): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // Swallow — we still want to land the user on a safe page.
  }
  // Hard navigation rather than TanStack router navigate(): a full
  // page reload guarantees every module-level cached state (TanStack
  // Query, mock stores, custom hooks) drops to its initial state. The
  // user sees a clean public site.
  if (typeof window !== "undefined") {
    window.location.href = redirectTo;
  }
}
