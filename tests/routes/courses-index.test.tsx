import type { JSX } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { CourseJsonLdInput } from "@/lib/seo/courses-jsonld";

// E25 Phase 2 — /courses catalog redesign verification.
//
// E50 bundle-split — the route is split into an eager file
// (courses.index.tsx: route def + loader + head) and a lazy file
// (courses.index.lazy.tsx: component + the ~177KB COURSES registry).
// head() now reads its ItemList course list from loaderData (the loader
// dynamically imports COURSES and projects it to the light
// CourseJsonLdInput shape), so the head() assertions feed a fixture
// loaderData; the component assertions render the lazy component.
//
// We stub useBlogPostsByRelatedCourses with a one-entry map so the
// related-article slot test path is exercised without booting Supabase.

const COURSE_LD_FIXTURES: CourseJsonLdInput[] = [
  {
    slug: "email-phishing",
    title: "Email phishing",
    tagline: "x",
    estimatedMinutes: 9,
    publishedAt: "2026-04-26",
    updatedAt: "2026-04-26",
  },
  {
    slug: "sms-smishing",
    title: "SMS smishing",
    tagline: "y",
    estimatedMinutes: 7,
    publishedAt: "2026-04-20",
    updatedAt: "2026-04-20",
  },
];

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute:
      () =>
      <T,>(config: T) => ({ options: config }),
    createLazyFileRoute:
      () =>
      <T,>(config: T) => ({ options: config }),
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => {
      const {
        to: _to,
        params: _params,
        ...domProps
      } = rest as { to?: string; params?: Record<string, string> };
      return <a {...(domProps as Record<string, unknown>)}>{children}</a>;
    },
  };
});

vi.mock("@/lib/blog/queries", () => ({
  useBlogPostsByRelatedCourses: () => ({
    data: {
      "email-phishing": {
        id: "p1",
        slug: "phishing-do-hlbky",
        title: "Phishing do hĺbky",
        excerpt: "x",
        hero_image_url: null,
        reading_minutes: 6,
        published_at: "2026-04-10",
        category: { slug: "phishing-a-emaily", name: "Phishing" },
        author: { slug: "subenai", display_name: "subenai" },
      },
    },
    isLoading: false,
    error: null,
  }),
}));

import { Route as EagerRoute } from "@/routes/courses.index";
import { Route as LazyRoute } from "@/routes/courses.index.lazy";

type HeadFn = (ctx: { loaderData: CourseJsonLdInput[] }) => {
  meta: Array<Record<string, string>>;
  links?: Array<{ rel: string; href: string }>;
  scripts?: Array<{ type: string; children: string }>;
};

type EagerCfg = { options: { head: HeadFn } };
type LazyCfg = { options: { component: () => JSX.Element } };

const eager = EagerRoute as unknown as EagerCfg;
const lazy = LazyRoute as unknown as LazyCfg;
const callHead = () => eager.options.head({ loaderData: COURSE_LD_FIXTURES });

describe("/courses head() — E25 Phase 2 SEO blobs", () => {
  it("emits a FAQPage JSON-LD blob alongside the ItemList blob", () => {
    const out = callHead();
    const ld = (out.scripts ?? []).map((s) => JSON.parse(s.children) as Record<string, unknown>);
    const types = ld.map((b) => b["@type"]);
    expect(types).toContain("ItemList");
    expect(types).toContain("FAQPage");
  });

  it("FAQPage carries 8 Question entries", () => {
    const out = callHead();
    const faq = (out.scripts ?? [])
      .map((s) => JSON.parse(s.children) as Record<string, unknown>)
      .find((b) => b["@type"] === "FAQPage");
    expect(faq).toBeDefined();
    expect((faq!.mainEntity as unknown[]).length).toBe(8);
  });

  it("ItemList carries one ListItem per loader course", () => {
    const out = callHead();
    const list = (out.scripts ?? [])
      .map((s) => JSON.parse(s.children) as Record<string, unknown>)
      .find((b) => b["@type"] === "ItemList");
    expect((list!.itemListElement as unknown[]).length).toBe(COURSE_LD_FIXTURES.length);
  });

  it("emits canonical + robots:index on the catalog index", () => {
    const out = callHead();
    expect(out.links).toEqual([{ rel: "canonical", href: "https://subenai.sk/courses" }]);
    const robots = out.meta.find((m) => m.name === "robots");
    expect(robots?.content).toMatch(/^index, follow/);
  });
});

describe("/courses page — E25 Phase 2 layout", () => {
  it("renders hero, value strip, search, grid, FAQ, CTA", async () => {
    const Page = lazy.options.component;
    render(<Page />);
    expect(await screen.findByTestId("courses-catalog-heading")).toBeInTheDocument();
    expect(screen.getByTestId("courses-catalog-intro")).toBeInTheDocument();
    expect(screen.getByTestId("courses-value-strip")).toBeInTheDocument();
    expect(screen.getByTestId("courses-catalog-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("courses-catalog-grid")).toBeInTheDocument();
    expect(screen.getByTestId("courses-faq-section")).toBeInTheDocument();
    expect(screen.getByTestId("courses-catalog-cta-test")).toBeInTheDocument();
  });

  it("wires the batched related-article fetch into the email-phishing card", async () => {
    const Page = lazy.options.component;
    render(<Page />);
    // The stub returns an article for "email-phishing" — the slot must render.
    expect(
      await screen.findByTestId("courses-card-related-article-email-phishing"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("courses-card-related-article-title-email-phishing"),
    ).toHaveTextContent("Phishing do hĺbky");
  });
});
