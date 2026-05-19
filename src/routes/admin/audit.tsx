import { createFileRoute } from "@tanstack/react-router";

import { tFor as tAdmin } from "@/i18n/admin";

const tRoutes = tAdmin("route_titles");

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [{ title: tRoutes("audit") }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
