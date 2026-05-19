import { createFileRoute } from "@tanstack/react-router";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tFor } from "@/i18n/app-shell";

const tPeer = tFor("peer");

export const Route = createFileRoute("/app/peer")({
  beforeLoad: async ({ location }) => {
    await requireSupabaseAuth(location.pathname, { requireOnboarded: true });
  },
  head: () => ({
    meta: [{ title: tPeer("page_title") }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
