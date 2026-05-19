import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// E25 Phase 1 — /tests catalog redesign verification.
//
// Asserts:
//  - head() emits a FAQPage JSON-LD blob in addition to the existing
//    ItemList blob (route SSR contract — Google rich-result eligibility)
//  - component renders hero, value strip, FAQ section, sort dropdown,
//    and featured-spotlight tile
//  - sort dropdown re-orders the grid via publishedAt / questionIds
//
// Mock @tanstack/react-router so createFileRoute returns the raw config
// — we test the route as data, not via a real router.
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
      } = rest as {
        to?: string;
        params?: Record<string, string>;
      };
      return <a {...(domProps as Record<string, unknown>)}>{children}</a>;
    },
  };
});

import { Route } from "@/routes/tests.index";

type HeadFn = () => {
  meta: Array<Record<string, string>>;
  links?: Array<{ rel: string; href: string }>;
  scripts?: Array<{ type: string; children: string }>;
};

type RouteCfg = {
  options: { head: HeadFn; component: () => JSX.Element };
};

const cfg = Route as unknown as RouteCfg;

describe("/tests head() — E25 Phase 1 SEO blobs", () => {
  it("emits a FAQPage JSON-LD blob alongside the ItemList blob", () => {
    const out = cfg.options.head();
    expect(out.scripts).toBeDefined();
    const ldBlobs = (out.scripts ?? []).map(
      (s) => JSON.parse(s.children) as Record<string, unknown>,
    );
    const types = ldBlobs.map((b) => b["@type"]);
    expect(types).toContain("ItemList");
    expect(types).toContain("FAQPage");
  });

  it("FAQPage carries 5 Question entries (one per FAQ key)", () => {
    const out = cfg.options.head();
    const faqBlob = (out.scripts ?? [])
      .map((s) => JSON.parse(s.children) as Record<string, unknown>)
      .find((b) => b["@type"] === "FAQPage");
    expect(faqBlob).toBeDefined();
    const entries = faqBlob!.mainEntity as Array<{ name: string }>;
    expect(entries).toHaveLength(5);
  });

  it("emits canonical and robots:index on the catalog index", () => {
    const out = cfg.options.head();
    expect(out.links).toEqual([{ rel: "canonical", href: "https://subenai.sk/tests" }]);
    const robots = out.meta.find((m) => m.name === "robots");
    expect(robots?.content).toMatch(/^index, follow/);
  });
});

describe("/tests page — E25 Phase 1 layout", () => {
  it("renders the hero, value strip, sort dropdown, FAQ and CTAs", () => {
    const Page = cfg.options.component;
    render(<Page />);
    expect(screen.getByTestId("tests-catalog-heading")).toBeInTheDocument();
    expect(screen.getByTestId("tests-catalog-intro")).toBeInTheDocument();
    expect(screen.getByTestId("tests-value-strip")).toBeInTheDocument();
    expect(screen.getByTestId("tests-catalog-sort")).toBeInTheDocument();
    expect(screen.getByTestId("tests-catalog-grid")).toBeInTheDocument();
    expect(screen.getByTestId("tests-faq-section")).toBeInTheDocument();
    expect(screen.getByTestId("tests-catalog-cta-standard")).toBeInTheDocument();
    expect(screen.getByTestId("tests-catalog-cta-courses")).toBeInTheDocument();
  });

  it("renders the featured-spotlight tile with the 'newest' badge by default", () => {
    const Page = cfg.options.component;
    render(<Page />);
    // The first pack in published order is the featured one. We don't pin
    // the specific slug — the featured prop is what we assert.
    const featuredBadges = screen.queryAllByText("⭐ Najnovší");
    expect(featuredBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("changing the sort dropdown re-renders the grid", () => {
    const Page = cfg.options.component;
    render(<Page />);
    const select = screen.getByTestId("tests-catalog-sort") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "questions_desc" } });
    expect(select.value).toBe("questions_desc");
    // Grid still renders after re-sort (no crash, no empty state).
    expect(screen.getByTestId("tests-catalog-grid")).toBeInTheDocument();
  });
});
