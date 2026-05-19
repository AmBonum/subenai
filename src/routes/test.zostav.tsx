import { createFileRoute } from "@tanstack/react-router";

import { tFor } from "@/i18n/quiz";

interface ZostavSearch {
  config?: string;
}

export const Route = createFileRoute("/test/zostav")({
  validateSearch: (search: Record<string, unknown>): ZostavSearch => ({
    config: typeof search.config === "string" ? search.config : undefined,
  }),
  head: () => {
    const t = tFor("composer");
    return {
      meta: [
        { title: t("meta_title") },
        { name: "description", content: t("meta_description") },
        { name: "robots", content: "index, follow" },
      ],
    };
  },
});
