import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tFor } from "@/i18n/app-shell";

const tInsights = tFor("insights");

export const INSIGHTS_TABS = ["digest", "recommendations", "retest", "peer"] as const;
export type InsightsTab = (typeof INSIGHTS_TABS)[number];

const searchSchema = z.object({
  tab: z.enum(INSIGHTS_TABS).catch("digest").optional(),
});

// M4 — the four retention loops (digest, recommendations, retest, peer)
// merged into one tabbed surface. Old routes redirect here with the
// matching ?tab= (see app.digest.tsx and siblings).
export const Route = createFileRoute("/app/insights")({
  validateSearch: searchSchema,
  beforeLoad: async ({ location }) => {
    await requireSupabaseAuth(location.pathname, { requireOnboarded: true });
  },
  head: () => ({
    meta: [{ title: tInsights("page_title") }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
