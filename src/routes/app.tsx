import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/user/AppShell";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const Route = createFileRoute("/app")({
  beforeLoad: async ({ location }) => requireSupabaseAuth(location.pathname),
  head: () => ({
    meta: [{ name: "robots", content: "noindex,nofollow" }],
  }),
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
