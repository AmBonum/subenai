import { describe, it, expect, beforeEach } from "vitest";

import { getPublicCmsPage } from "@/lib/cms/get-page.functions";
import { cmsPagesStore, resetCmsStoresForTests } from "@/lib/admin/cms-mock-store";

describe("getPublicCmsPage loader", () => {
  beforeEach(() => {
    resetCmsStoresForTests();
  });

  it("returns the page for a published slug", () => {
    const page = getPublicCmsPage("o-projekte-rozsirene");
    expect(page).not.toBeNull();
    expect(page!.title).toBe("O projekte — rozšírené");
    expect(page!.content_blocks.length).toBeGreaterThan(0);
  });

  it("returns null for an unknown slug", () => {
    expect(getPublicCmsPage("does-not-exist")).toBeNull();
  });

  it("returns null for a draft (unpublished) slug", () => {
    expect(getPublicCmsPage("skoly-rozsirene")).toBeNull();
  });

  it("safe-column projection does not include owner_id or audit columns", () => {
    cmsPagesStore.set((prev) =>
      prev.map((p) => (p.slug === "o-projekte-rozsirene" ? { ...p, owner_id: "secret_owner" } : p)),
    );
    const page = getPublicCmsPage("o-projekte-rozsirene");
    expect(page).not.toBeNull();
    const keys = Object.keys(page!);
    expect(keys).not.toContain("owner_id");
    expect(keys).not.toContain("updated_at");
    expect(keys).not.toContain("status");
  });

  it("projects only the documented fields", () => {
    const page = getPublicCmsPage("o-projekte-rozsirene")!;
    expect(Object.keys(page).sort()).toEqual(
      ["content_blocks", "id", "published_at", "seo_description", "slug", "title"].sort(),
    );
  });
});
