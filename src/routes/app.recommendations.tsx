import { createFileRoute, redirect } from "@tanstack/react-router";

// M4 — merged into /app/insights. Thin client redirect keeps old links alive.
export const Route = createFileRoute("/app/recommendations")({
  beforeLoad: () => {
    throw redirect({ to: "/app/insights", search: { tab: "recommendations" }, replace: true });
  },
});
