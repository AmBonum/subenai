import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/config/site";
import { supabase } from "@/integrations/supabase/client";
import { tFor } from "@/i18n/quiz";

// E34 Phase 2 (D7) — SSR-side loader fetches `creator_label` so head()
// can emit a personalized OG title to make Slack/Teams/iMessage
// previews compelling ("Test od E-shop tím — 5 minút · subenai")
// instead of the previous generic title. Robots stays noindex/nofollow
// — these are private share links, NOT for organic SEO.
//
// Loader returns the minimum needed for head() (label only). Missing
// rows return null and the head falls back to the generic title.
// The actual page component still fetches the full TestSetDto in
// `test.builder.$id.index.lazy.tsx` for the React UI; this loader is
// purely for SSR-time meta rendering and stays cheap.

interface BuilderHead {
  creator_label: string | null;
}

export const Route = createFileRoute("/test/builder/$id")({
  loader: async ({ params }): Promise<BuilderHead | null> => {
    const { data, error } = await supabase
      .from("test_sets")
      .select("creator_label")
      .eq("id", params.id)
      .maybeSingle();
    if (error || !data) return null;
    return data as BuilderHead;
  },
  head: ({ loaderData, params }) => {
    const t = tFor("composition");
    const label = loaderData?.creator_label?.trim() || null;
    const url = `${SITE_ORIGIN}/test/builder/${params.id}`;
    const title = label ? t("og_title_with_creator", { creator: label }) : t("og_title_fallback");
    const description = t("og_description");
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex, nofollow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:site_name", content: "subenai" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
    };
  },
});
