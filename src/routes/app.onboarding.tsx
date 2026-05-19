import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";
import { tFor } from "@/i18n/auth";

const tHead = tFor("onboarding");

export const Route = createFileRoute("/app/onboarding")({
  // Auth required, but DO NOT call requireOnboarded — that would loop.
  beforeLoad: async () => {
    const { session } = await requireSupabaseAuth(undefined, { requireOnboarded: false });
    const { data: prefs } = await supabase
      .from("profile_preferences")
      .select("onboarded_at")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (prefs?.onboarded_at) {
      throw redirect({ to: "/app" });
    }
  },
  head: () => ({
    meta: [{ title: tHead("page_title") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  staticData: { hideSiteHeader: true },
});
