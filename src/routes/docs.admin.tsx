import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireRole } from "@/integrations/supabase/role-middleware";

// E47.1 / E48.1 — `/docs/admin/*` is the in-product reference for admin
// console screens. Access is gated by the same admin-role + AAL2 check
// used by `/admin/*` itself (requireRole("admin") chains through
// requireSupabaseAuth then verifies has_role + AAL2). The leaf at
// `docs.admin.$slug.tsx` looks the slug up in ADMIN_DOCS and renders
// the shared stub (or throws notFound()).

export const Route = createFileRoute("/docs/admin")({
  beforeLoad: async ({ location }) => {
    await requireRole("admin", location.pathname);
  },
  head: () => ({
    meta: [{ name: "robots", content: "noindex,nofollow" }],
  }),
  component: () => <Outlet />,
});
