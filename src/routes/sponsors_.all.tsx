import { createFileRoute, redirect } from "@tanstack/react-router";

// M3 — /sponsors/all merged into /sponsors. Client-side redirect keeps
// old in-app links and dev-server URLs working; production also 301s via
// public/_redirects before the SPA loads. The `sponsors_` prefix un-nests
// from the /sponsors route so the redirect fires without mounting it.
export const Route = createFileRoute("/sponsors_/all")({
  beforeLoad: () => {
    throw redirect({ to: "/sponsors", replace: true });
  },
});
