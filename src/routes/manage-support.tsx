import { createFileRoute } from "@tanstack/react-router";
import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/marketing";

// Re-export for unit tests; unused in the app graph, so it tree-shakes
// out of the entry chunk (the implementation ships in the lazy chunk).
export { ManageSupportForm } from "./-manage-support-form";

const tManage = tFor("spravovat_podporu");
const PAGE_URL = `${SITE_ORIGIN}/manage-support`;

export const Route = createFileRoute("/manage-support")({
  head: () => ({
    meta: [
      { title: tManage("head_title") },
      { name: "description", content: tManage("head_description") },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
});
