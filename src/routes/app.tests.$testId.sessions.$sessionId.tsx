// E49 Phase 1 — URL-addressable side-sheet over the test editor.
// `app.tests.$testId.sessions.$sessionId` is a child of the test editor
// route; the parent renders `<Outlet />` and this route mounts a portal'd
// Sheet on top. Closing navigates back to the editor's Results tab.

import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";

import { SessionDetailSheet } from "@/components/app/tests/SessionDetailSheet";
import { tFor as tAppShell } from "@/i18n/app-shell";

const tRoutes = tAppShell("route_titles");

export const Route = createFileRoute("/app/tests/$testId/sessions/$sessionId")({
  head: () => ({
    meta: [{ title: tRoutes("test_editor") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: SessionDetailRoute,
});

function SessionDetailRoute() {
  const { testId, sessionId } = useParams({
    from: "/app/tests/$testId/sessions/$sessionId",
  });
  const nav = useNavigate();
  const closeHref = `/app/tests/${testId}?tab=results`;
  return (
    <SessionDetailSheet
      testId={testId}
      sessionId={sessionId}
      onClose={() =>
        nav({ to: "/app/tests/$testId", params: { testId }, search: { tab: "results" } })
      }
      onCloseHref={closeHref}
    />
  );
}
