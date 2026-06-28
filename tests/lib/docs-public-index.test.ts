import { describe, it, expect } from "vitest";
import { getPublicDoc, listPublicDocs, RESERVED_PUBLIC_DOC_SLUGS } from "@/content/docs";

describe("public docs index", () => {
  it("resolves a known slug", () => {
    const doc = getPublicDoc("co-je-subenai");
    expect(doc).not.toBeNull();
    expect(doc?.title).toBe("Čo je subenai");
    expect(doc?.body.length).toBeGreaterThan(0);
  });

  it("returns null for an unknown slug", () => {
    expect(getPublicDoc("does-not-exist")).toBeNull();
  });

  it("lists docs sorted by order", () => {
    const docs = listPublicDocs();
    expect(docs.length).toBeGreaterThanOrEqual(6);
    const orders = docs.map((d) => d.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("reserves the gated subtree slugs", () => {
    expect(RESERVED_PUBLIC_DOC_SLUGS.has("app")).toBe(true);
    expect(RESERVED_PUBLIC_DOC_SLUGS.has("admin")).toBe(true);
  });

  it("no public doc shadows a reserved slug", () => {
    for (const d of listPublicDocs()) {
      expect(RESERVED_PUBLIC_DOC_SLUGS.has(d.slug)).toBe(false);
    }
  });

  it("every doc has the required metadata", () => {
    for (const d of listPublicDocs()) {
      expect(d.slug).toMatch(/^[a-z0-9-]+$/);
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.description.length).toBeGreaterThan(0);
      expect(d.category.length).toBeGreaterThan(0);
    }
  });
});
