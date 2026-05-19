import { createFileRoute } from "@tanstack/react-router";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tFor } from "@/i18n/app-shell";

const tDigest = tFor("digest");

export const Route = createFileRoute("/app/digest")({
  beforeLoad: async ({ location }) => {
    await requireSupabaseAuth(location.pathname, { requireOnboarded: true });
  },
  head: () => ({
    meta: [{ title: tDigest("page_title") }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
