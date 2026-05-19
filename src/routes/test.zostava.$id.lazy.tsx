import { createLazyFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout component for `/test/zostava/$id` and its children. The current
 * page UI (set load → start CTA → inline TestFlow) lives in the
 * `.index` sibling so the nested `.vysledky` child route can render
 * through `<Outlet />`. Before this split (2026-05-19), this file
 * rendered the full ZostavaView and the `/vysledky` subroute was
 * unreachable in the browser — see e2e/specs/quiz/shared-set.spec.ts
 * TC-05 for the regression sentinel.
 */
export const Route = createLazyFileRoute("/test/zostava/$id")({
  component: ZostavaLayout,
});

function ZostavaLayout() {
  return <Outlet />;
}
