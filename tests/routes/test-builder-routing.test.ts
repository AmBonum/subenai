import { describe, it, expect } from "vitest";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";

import { routeTree } from "@/routeTree.gen";

// E33 hotfix (2026-05-20) — regression sentinel for the production bug where
// `/test/builder/<id>` silently rendered the composer page instead of the
// respondent intake form.
//
// Root cause: Phase 0 collapsed `/test/zostav` (composer) and
// `/test/zostava/$id` (respondent) into a shared `/test/builder` stem.
// TanStack file-based routing auto-nests by file-name prefix, so
// `test.builder.$id.tsx` became a CHILD of `test.builder.tsx`. The composer
// at the parent never rendered `<Outlet />`, so the child route never
// mounted — any URL beneath `/test/builder` fell back to the composer UI.
//
// The fix: pathless layout pattern — `test.builder.tsx` is a layout that
// renders `<Outlet />`; the composer moved to `test.builder.index.tsx` /
// `.lazy.tsx` (route ID `/test/builder/`). Matches the same split applied
// at the `$id` level on 2026-05-19 (see `test.builder.$id.lazy.tsx`).
//
// This test asserts at the ROUTE TREE level — runs in CI without a dev
// server, catches the bug class structurally rather than via UI render.
//
// Why not an e2e: the existing `e2e/specs/quiz/shared-set.spec.ts` TC-01
// SHOULD have caught this, but e2e requires `npm run dev` + isn't part of
// CI on every PR. A Vitest assertion against the runtime route tree is
// both faster (~ms vs seconds) and tied to the bug's actual surface (the
// TanStack route registration).

function getMatchedRouteIds(initialPath: string): string[] {
  // Cast to `any` because the generated route tree's full type is huge and
  // the test only cares about the runtime match shape. We use
  // `router.matchRoutes(pathname)` for a synchronous match against the
  // configured route tree — `router.state.matches` is empty until
  // `router.load()` resolves, which would force every test to be async
  // for no added signal.
  const router = createRouter({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    routeTree: routeTree as any,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  // `matchRoutes` returns a flat array of match objects, each carrying
  // the `routeId` for the matched route at that level of the tree.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches = (router as any).matchRoutes(initialPath) as ReadonlyArray<{
    routeId: string;
  }>;
  return matches.map((m) => m.routeId);
}

describe("E33 routing — /test/builder layout + index split", () => {
  it("/test/builder/<uuid> matches the layout, the $id route, and the $id index (respondent)", () => {
    const matches = getMatchedRouteIds("/test/builder/d5405c57-ffe2-43e4-aee0-2233943f56c9");

    // Layout MUST be matched so its `<Outlet />` mounts the children.
    expect(matches).toContain("/test/builder");
    // $id is the parent for `/results`; it also renders an Outlet.
    expect(matches).toContain("/test/builder/$id");
    // The actual respondent page (BuilderSetView) lives at $id/index.
    expect(matches).toContain("/test/builder/$id/");

    // Critically: the composer index must NOT match — that was the
    // production bug. If a future refactor accidentally re-roots the
    // composer at `/test/builder` (leaf), this assertion fails.
    expect(matches).not.toContain("/test/builder/");
  });

  it("/test/builder/<uuid>/results matches the layout, the $id route, and the results child", () => {
    const matches = getMatchedRouteIds(
      "/test/builder/d5405c57-ffe2-43e4-aee0-2233943f56c9/results",
    );

    expect(matches).toContain("/test/builder");
    expect(matches).toContain("/test/builder/$id");
    expect(matches).toContain("/test/builder/$id/results");
    expect(matches).not.toContain("/test/builder/$id/");
    expect(matches).not.toContain("/test/builder/");
  });

  it("/test/builder matches the layout AND the composer index (not the $id route)", () => {
    const matches = getMatchedRouteIds("/test/builder");

    expect(matches).toContain("/test/builder");
    // The composer's index route — the actual ComposerPage component lives
    // in `test.builder.index.lazy.tsx`.
    expect(matches).toContain("/test/builder/");
    expect(matches).not.toContain("/test/builder/$id");
  });
});
