import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/user/AppShell";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const Route = createFileRoute("/app")({
  // `/app/onboarding` is a CHILD route (TanStack flat-routing dot convention
  // turns `app.onboarding.tsx` into a child of `app.tsx`). That means the
  // parent `/app` beforeLoad runs FIRST in the chain — even when the user
  // is navigating directly to `/app/onboarding`. If we unconditionally
  // enforced `requireOnboarded:true` here, an un-onboarded user would loop:
  // parent throws redirect to /app/onboarding, TanStack re-matches the same
  // chain, parent throws again, ad infinitum. So we skip the onboarded
  // check exactly when the matched leaf IS the onboarding page itself —
  // the leaf's own beforeLoad handles the inverse case (redirect to /app
  // when already onboarded). For every other /app/* route the gate stays
  // intact.
  beforeLoad: async ({ location }) => {
    const skipOnboardedGate = location.pathname === "/app/onboarding";
    return requireSupabaseAuth(location.pathname, {
      requireOnboarded: !skipOnboardedGate,
    });
  },
  head: () => ({
    meta: [{ name: "robots", content: "noindex,nofollow" }],
  }),
  staticData: { hideSiteHeader: true },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
