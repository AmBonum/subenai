import { createLazyFileRoute } from "@tanstack/react-router";

import { ManageSupportForm } from "./-manage-support-form";

export const Route = createLazyFileRoute("/manage-support")({
  component: SpravovatPodporuPage,
});

function SpravovatPodporuPage() {
  return <ManageSupportForm />;
}
