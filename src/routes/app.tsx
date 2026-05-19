import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/user/AppShell";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const Route = createFileRoute("/app")({
  beforeLoad: async ({ location }) =>
    requireSupabaseAuth(location.pathname, { requireOnboarded: true }),
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
