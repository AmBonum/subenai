import { createFileRoute, redirect } from "@tanstack/react-router";
import { ROUTES } from "@/config/routes";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex,nofollow" }],
  }),
  beforeLoad: () => {
    throw redirect({ to: ROUTES.kontakt, replace: true });
  },
});
