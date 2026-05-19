import { describe, it, expect, vi } from "vitest";

// The Supabase client is imported transitively when the route module
// loads (the loader uses it), but the head() function under test
// here never calls the loader — it just consumes loaderData. A no-op
// mock is enough to satisfy module evaluation.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute:
      () =>
      <T>(config: T) => ({ options: config }),
  };
});

import { Route } from "@/routes/s.$slug";
import type { CmsPage } from "@/lib/admin/cms-types";

type HeadFn = (ctx: { loaderData: CmsPage | null }) => {
  meta: Array<Record<string, string>>;
  links?: Array<{ rel: string; href: string }>;
  scripts?: Array<{ type: string; children: string }>;
};

const head = (Route as unknown as { options: { head: HeadFn } }).options.head;

const samplePage: CmsPage = {
  id: "p1",
  slug: "o-projekte-rozsirene",
  title: "O projekte",
  seo_description: "Anonymný 5-minútový test rozpoznávania online podvodov.",
  content_blocks: [],
  status: "published",
  published_at: "2026-04-01T10:00:00Z",
  updated_at: "2026-04-15T10:00:00Z",
};

describe("/s/$slug head() — E24 SEO restoration", () => {
  it("emits canonical to the slug URL", () => {
    const out = head({ loaderData: samplePage });
    expect(out.links).toEqual([
      { rel: "canonical", href: "https://subenai.sk/s/o-projekte-rozsirene" },
    ]);
  });

  it("emits index, follow for published pages (these ARE meant to rank)", () => {
    const out = head({ loaderData: samplePage });
    const robots = out.meta.find((m) => m.name === "robots");
    expect(robots?.content).toBe("index, follow, max-image-preview:large");
  });

  it("emits title with site suffix and description from page row", () => {
    const out = head({ loaderData: samplePage });
    expect(out.meta.find((m) => m.title)?.title).toBe("O projekte | subenai");
    expect(out.meta.find((m) => m.name === "description")?.content).toBe(
      "Anonymný 5-minútový test rozpoznávania online podvodov.",
    );
  });

  it("emits full OG + Twitter card set", () => {
    const out = head({ loaderData: samplePage });
    const ogTitle = out.meta.find((m) => m.property === "og:title");
    const ogImage = out.meta.find((m) => m.property === "og:image");
    const ogUrl = out.meta.find((m) => m.property === "og:url");
    const twitterCard = out.meta.find((m) => m.name === "twitter:card");
    expect(ogTitle?.content).toBe("O projekte");
    expect(ogImage?.content).toBe("https://subenai.sk/og-default.png");
    expect(ogUrl?.content).toBe("https://subenai.sk/s/o-projekte-rozsirene");
    expect(twitterCard?.content).toBe("summary_large_image");
  });

  it("emits JSON-LD WebPage schema with published + modified dates", () => {
    const out = head({ loaderData: samplePage });
    expect(out.scripts).toHaveLength(1);
    const ld = JSON.parse(out.scripts![0].children) as Record<string, unknown>;
    expect(ld["@type"]).toBe("WebPage");
    expect(ld.name).toBe("O projekte");
    expect(ld.url).toBe("https://subenai.sk/s/o-projekte-rozsirene");
    expect(ld.datePublished).toBe("2026-04-01T10:00:00Z");
    expect(ld.dateModified).toBe("2026-04-15T10:00:00Z");
  });

  it("emits noindex + 'not found' title when loaderData is null", () => {
    const out = head({ loaderData: null });
    expect(out.meta.find((m) => m.title)?.title).toBe("Stránka nenájdená | subenai");
    expect(out.meta.find((m) => m.name === "robots")?.content).toBe("noindex, nofollow");
    expect(out.links).toBeUndefined();
    expect(out.scripts).toBeUndefined();
  });
});
