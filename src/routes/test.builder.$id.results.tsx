import { createFileRoute } from "@tanstack/react-router";

import { tFor } from "@/i18n/quiz";

export const Route = createFileRoute("/test/builder/$id/results")({
  head: () => {
    const t = tFor("results_page");
    return {
      meta: [{ title: t("meta_title") }, { name: "robots", content: "noindex, nofollow" }],
    };
  },
});
