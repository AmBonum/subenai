import { createLazyFileRoute, Outlet } from "@tanstack/react-router";

// E33 hotfix (2026-05-20) — see test.builder.tsx for the full rationale.
// This file is the layout that makes nested children (`$id`, `$id/results`)
// actually mount. Without `<Outlet />` here, any visit to
// `/test/builder/<anything>` falls back to a blank parent.

export const Route = createLazyFileRoute("/test/builder")({
  component: BuilderLayout,
});

function BuilderLayout() {
  return <Outlet />;
}
