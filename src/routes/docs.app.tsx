import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// E47.1 / E48.1 — `/docs/app/*` is the in-product reference for the
// end-user app. Per product decision, ANY authenticated user may read
// these docs — both regular `/app` users and admins. We deliberately
// do NOT pass `requireOnboarded:true`: docs are not gated behind
// onboarding (an admin without a profile_preferences row would
// otherwise loop through /app/onboarding when trying to read docs).
//
// Admin-specific docs live under /docs/admin/* with a stricter
// requireRole("admin") gate at docs.admin.tsx.

export const Route = createFileRoute("/docs/app")({
  beforeLoad: async ({ location }) => {
    await requireSupabaseAuth(location.pathname);
  },
  head: () => ({
    meta: [{ name: "robots", content: "noindex,nofollow" }],
  }),
  component: () => <Outlet />,
});
