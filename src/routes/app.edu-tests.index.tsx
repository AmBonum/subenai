import { createFileRoute } from "@tanstack/react-router";
import { tFor as tAppShell } from "@/i18n/app-shell";

const tRoutes = tAppShell("route_titles");

export const Route = createFileRoute("/app/edu-tests/")({
  head: () => ({
    meta: [{ title: tRoutes("edu_tests_index") }, { name: "robots", content: "noindex,nofollow" }],
  }),
});
