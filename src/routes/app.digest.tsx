import { createFileRoute, redirect } from "@tanstack/react-router";

// M4 — merged into /app/insights. Thin client redirect keeps old links alive.
export const Route = createFileRoute("/app/digest")({
  beforeLoad: () => {
    throw redirect({ to: "/app/insights", search: { tab: "digest" }, replace: true });
  },
});
