import { createLazyFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout component for `/test/builder/$id` and its children. The current
 * page UI (set load → start CTA → inline TestFlow) lives in the
 * `.index` sibling so the nested `.results` child route can render
 * through `<Outlet />`. Before this split (2026-05-19), this file
 * rendered the full BuilderSetView and the `/results` subroute was
 * unreachable in the browser — see e2e/specs/quiz/shared-set.spec.ts
 * TC-05 for the regression sentinel.
 *
 * E33 — renamed from `test.zostava.$id.lazy.tsx` (zostava → builder
 * for English URL consistency). 301 redirects in public/_redirects
 * preserve inbound link equity.
 */
export const Route = createLazyFileRoute("/test/builder/$id")({
  component: BuilderSetLayout,
});

function BuilderSetLayout() {
  return <Outlet />;
}
