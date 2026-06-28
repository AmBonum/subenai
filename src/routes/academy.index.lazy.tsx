import { createLazyFileRoute } from "@tanstack/react-router";

import { AcademyIndex } from "@/components/academy/AcademyIndex";

// E55.3 — lazy component for the Academy hub.
export const Route = createLazyFileRoute("/academy/")({
  component: AcademyIndex,
});
