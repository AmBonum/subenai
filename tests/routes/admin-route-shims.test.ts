import { describe, expect, it } from "vitest";

// Coverage-lift for the 3-line route shim files. Each
// src/routes/admin/<name>.tsx is just:
//
//   import { createFileRoute } from "@tanstack/react-router";
//   export const Route = createFileRoute("/admin/<path>")({});
//
// They sit at 0% line coverage because no other test imports them.
// Just importing the module here executes the `createFileRoute()` call,
// flipping that line from uncovered to covered. The test itself only
// asserts that the symbol exists — anything heavier (rendering, route
// matching) would require a full router fixture and isn't worth the
// complexity for what is fundamentally a registration ceremony.

describe("admin route shims — import & symbol existence", () => {
  it.each([
    ["admin/answer-sets", () => import("@/routes/admin/answer-sets")],
    ["admin/audit", () => import("@/routes/admin/audit")],
    ["admin/categories", () => import("@/routes/admin/categories")],
    ["admin/dsr", () => import("@/routes/admin/dsr")],
    ["admin/footer", () => import("@/routes/admin/footer")],
    ["admin/header", () => import("@/routes/admin/header")],
    ["admin/index", () => import("@/routes/admin/index")],
    ["admin/navigation", () => import("@/routes/admin/navigation")],
    ["admin/pages.$pageId", () => import("@/routes/admin/pages.$pageId")],
    ["admin/pages.index", () => import("@/routes/admin/pages.index")],
    ["admin/pages", () => import("@/routes/admin/pages")],
    ["admin/questions", () => import("@/routes/admin/questions")],
    ["admin/quick-test", () => import("@/routes/admin/quick-test")],
    ["admin/reports", () => import("@/routes/admin/reports")],
    ["admin/respondents", () => import("@/routes/admin/respondents")],
    ["admin/security", () => import("@/routes/admin/security")],
    ["admin/settings", () => import("@/routes/admin/settings")],
    ["admin/share-card", () => import("@/routes/admin/share-card")],
    ["admin/support", () => import("@/routes/admin/support")],
    ["admin/tests.$testId", () => import("@/routes/admin/tests.$testId")],
    ["admin/tests.index", () => import("@/routes/admin/tests.index")],
    ["admin/tests", () => import("@/routes/admin/tests")],
    ["admin/trainings", () => import("@/routes/admin/trainings")],
    ["admin/users", () => import("@/routes/admin/users")],
    ["admin/blog/$id", () => import("@/routes/admin/blog/$id")],
    ["admin/blog/index", () => import("@/routes/admin/blog/index")],
    ["admin/blog/new", () => import("@/routes/admin/blog/new")],
    // Other 0% route shims that are similarly trivial.
    ["test.zostav", () => import("@/routes/test.zostav")],
    ["test.zostava.$id", () => import("@/routes/test.zostava.$id")],
    ["test.zostava.$id.vysledky", () => import("@/routes/test.zostava.$id.vysledky")],
  ])("loads %s and exposes `Route`", async (_label, loader) => {
    const mod = await loader();
    expect(mod.Route).toBeDefined();
  });
});
