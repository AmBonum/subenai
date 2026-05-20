import { describe, it, expect } from "vitest";

import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumb-jsonld";

describe("buildBreadcrumbJsonLd — generic BreadcrumbList builder", () => {
  const items = [
    { name: "A", url: "https://x/" },
    { name: "B", url: "https://x/b" },
  ];

  it("emits the canonical @context and @type", () => {
    const ld = buildBreadcrumbJsonLd(items);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("BreadcrumbList");
  });

  it("emits one itemListElement per input crumb", () => {
    const ld = buildBreadcrumbJsonLd(items);
    const list = ld.itemListElement as Array<Record<string, unknown>>;
    expect(list).toHaveLength(2);
  });

  it("each list item is a 1-indexed ListItem with name + item URL", () => {
    const ld = buildBreadcrumbJsonLd(items);
    const list = ld.itemListElement as Array<Record<string, unknown>>;
    expect(list[0]).toMatchObject({
      "@type": "ListItem",
      position: 1,
      name: "A",
      item: "https://x/",
    });
    expect(list[1]).toMatchObject({
      "@type": "ListItem",
      position: 2,
      name: "B",
      item: "https://x/b",
    });
  });
});
