import { createFileRoute } from "@tanstack/react-router";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tFor } from "@/i18n/app-shell";

const tRec = tFor("recommendations");

export const Route = createFileRoute("/app/recommendations")({
  beforeLoad: async ({ location }) => {
    await requireSupabaseAuth(location.pathname, { requireOnboarded: true });
  },
  head: () => ({
    meta: [{ title: tRec("page_title") }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
