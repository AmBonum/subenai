import { createLazyFileRoute } from "@tanstack/react-router";

import { SharePage } from "./-share-page";

export const Route = createLazyFileRoute("/r/$shareId")({
  component: SharePageRoute,
});

function SharePageRoute() {
  const { shareId } = Route.useParams();
  return <SharePage shareId={shareId} />;
}
