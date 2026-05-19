import { createFileRoute } from "@tanstack/react-router";

import { tFor as tAdmin } from "@/i18n/admin";

const tRoutes = tAdmin("route_titles");

export const Route = createFileRoute("/admin/respondents")({
  head: () => ({
    meta: [{ title: tRoutes("respondents") }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
