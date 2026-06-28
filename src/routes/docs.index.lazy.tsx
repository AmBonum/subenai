import { createLazyFileRoute } from "@tanstack/react-router";

import { DocsIndex } from "@/components/docs/DocsIndex";

// E54.4 — lazy component for the public /docs hub. Keeps the docs UI (and
// its content registry) out of the main bundle.
export const Route = createLazyFileRoute("/docs/")({
  component: DocsIndex,
});
