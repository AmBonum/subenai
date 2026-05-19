import { createFileRoute } from "@tanstack/react-router";

import { tFor } from "@/i18n/quiz";

export const Route = createFileRoute("/test/builder/$id")({
  head: () => {
    const t = tFor("composition");
    return {
      meta: [{ title: t("meta_title") }, { name: "robots", content: "noindex, nofollow" }],
    };
  },
});
