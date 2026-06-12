import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ROUTE_CATALOG,
  type RouteCatalogEntry,
} from "../../functions/_lib/scam-chat/route-catalog";

const routeTree = readFileSync(resolve(__dirname, "../../src/routeTree.gen.ts"), "utf8");

describe("scam-chat route catalog (E53.6 audience tiers)", () => {
  it("contains no /admin route at all — corpus blackout", () => {
    for (const entry of ROUTE_CATALOG) {
      expect(entry.path).not.toBe("/admin");
      expect(entry.path.startsWith("/admin/")).toBe(false);
    }
  });

  it("tags every /app route as audience app and everything else as public", () => {
    for (const entry of ROUTE_CATALOG) {
      const expected: RouteCatalogEntry["audience"] =
        entry.path === "/app" || entry.path.startsWith("/app/") ? "app" : "public";
      expect(entry.audience, entry.path).toBe(expected);
    }
  });

  it("has unique, well-formed paths", () => {
    const paths = ROUTE_CATALOG.map((e) => e.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      expect(path.startsWith("/")).toBe(true);
      if (path !== "/") expect(path.endsWith("/"), path).toBe(false);
    }
  });

  it("only references routes that exist in the generated route tree", () => {
    for (const entry of ROUTE_CATALOG) {
      expect(routeTree.includes(`'${entry.path}'`), `missing route: ${entry.path}`).toBe(true);
    }
  });

  it("carries a Slovak title and one-line description on every entry", () => {
    for (const entry of ROUTE_CATALOG) {
      expect(entry.title.trim().length).toBeGreaterThan(0);
      expect(entry.description.trim().length).toBeGreaterThan(10);
      expect(entry.description).not.toContain("\n");
    }
  });
});
