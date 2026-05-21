import { createFileRoute, redirect } from "@tanstack/react-router";

// E48.6 — The empty AH-10.4 stub route. Now redirects to /admin/tickets
// so the existing admin sidebar entry + the /docs/admin/support
// references (PR #115 / E47.1) keep working.

export const Route = createFileRoute("/admin/support")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/tickets" });
  },
});
