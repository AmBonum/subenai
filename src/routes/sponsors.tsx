import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout route for /sponsors — renders an Outlet so children
 * (/sponsors/, /sponsors/all) actually mount.
 *
 * TanStack file-based routing turns `sponsors.tsx` into the parent of
 * any `sponsors.<child>.tsx` sibling files. Before this layout existed,
 * `sponsors.tsx` rendered the latest-sponsors list itself; visiting
 * /sponsors/all still mounted that latest-list (because the parent
 * never deferred to its child) and the filterable grid was unreachable.
 *
 * The actual /sponsors page content lives in `sponsors.index.tsx`; the
 * filterable list in `sponsors.all.tsx`. Both mount inside this
 * Outlet.
 */
export const Route = createFileRoute("/sponsors")({
  component: SponzoriLayout,
});

function SponzoriLayout() {
  return <Outlet />;
}

// Backwards-compat re-exports so existing imports from "@/routes/sponsors"
// (the all-list page + tests for both) keep working after the index split.
export { SponzoriView, type PublicSponsor } from "./sponsors.index";
