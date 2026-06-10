import type { JSX } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// E25 Phase 2 — /courses catalog redesign verification.
//
// Asserts:
//  - head() emits both ItemList + FAQPage JSON-LD blobs
//  - component renders hero, value strip, search, FAQ, CTA
//  - related-article fetch is wired via useBlogPostsByRelatedCourses
//    and the resulting map is passed down to each CourseCard
//
// We stub useBlogPostsByRelatedCourses with a one-entry map so the
// related-article slot test path is exercised without booting Supabase.

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute:
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

import { Route } from "@/routes/courses.index";

type HeadFn = () => {
  meta: Array<Record<string, string>>;
  links?: Array<{ rel: string; href: string }>;
  scripts?: Array<{ type: string; children: string }>;
};

type RouteCfg = {
  options: { head: HeadFn; component: () => JSX.Element };
};

const cfg = Route as unknown as RouteCfg;

describe("/courses head() — E25 Phase 2 SEO blobs", () => {
  it("emits a FAQPage JSON-LD blob alongside the ItemList blob", () => {
    const out = cfg.options.head();
    const ld = (out.scripts ?? []).map((s) => JSON.parse(s.children) as Record<string, unknown>);
    const types = ld.map((b) => b["@type"]);
    expect(types).toContain("ItemList");
    expect(types).toContain("FAQPage");
  });

  it("FAQPage carries 8 Question entries", () => {
    const out = cfg.options.head();
    const faq = (out.scripts ?? [])
      .map((s) => JSON.parse(s.children) as Record<string, unknown>)
      .find((b) => b["@type"] === "FAQPage");
    expect(faq).toBeDefined();
    expect((faq!.mainEntity as unknown[]).length).toBe(8);
  });

  it("emits canonical + robots:index on the catalog index", () => {
    const out = cfg.options.head();
    expect(out.links).toEqual([{ rel: "canonical", href: "https://subenai.sk/courses" }]);
    const robots = out.meta.find((m) => m.name === "robots");
    expect(robots?.content).toMatch(/^index, follow/);
  });
});

describe("/courses page — E25 Phase 2 layout", () => {
  it("renders hero, value strip, search, grid, FAQ, CTA", () => {
    const Page = cfg.options.component;
    render(<Page />);
    expect(screen.getByTestId("courses-catalog-heading")).toBeInTheDocument();
    expect(screen.getByTestId("courses-catalog-intro")).toBeInTheDocument();
    expect(screen.getByTestId("courses-value-strip")).toBeInTheDocument();
    expect(screen.getByTestId("courses-catalog-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("courses-catalog-grid")).toBeInTheDocument();
    expect(screen.getByTestId("courses-faq-section")).toBeInTheDocument();
    expect(screen.getByTestId("courses-catalog-cta-test")).toBeInTheDocument();
  });

  it("wires the batched related-article fetch into the email-phishing card", () => {
    const Page = cfg.options.component;
    render(<Page />);
    // The stub returns an article for "email-phishing" — the slot must render.
    expect(screen.getByTestId("courses-card-related-article-email-phishing")).toBeInTheDocument();
    expect(
      screen.getByTestId("courses-card-related-article-title-email-phishing"),
    ).toHaveTextContent("Phishing do hĺbky");
  });
});
