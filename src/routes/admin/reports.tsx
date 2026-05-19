import { createFileRoute } from "@tanstack/react-router";

import { tFor as tAdmin } from "@/i18n/admin";

const tRoutes = tAdmin("route_titles");

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [{ title: tRoutes("reports") }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
