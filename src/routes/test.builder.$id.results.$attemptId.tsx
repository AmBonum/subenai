import { createFileRoute } from "@tanstack/react-router";

import { tFor } from "@/i18n/quiz";

// Per-respondent drill-down view. Private — noindex/nofollow because
// these URLs reference an attempt UUID whose owner is the test author;
// no upside to having them in search. Loader is intentionally empty
// (no SSR fetch) because the data path is authed via cookie and the
// component re-uses the parent's /api/results-data response.
export const Route = createFileRoute("/test/builder/$id/results/$attemptId")({
  head: () => {
    const t = tFor("respondent_detail");
    return {
      meta: [{ title: t("meta_title") }, { name: "robots", content: "noindex, nofollow" }],
    };
  },
});
