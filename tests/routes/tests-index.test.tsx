import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import type { TestPack } from "@/content/test-packs";

// E25 Phase 1 — /tests catalog redesign verification.
// E37 Phase F (2026-05-21) — head() + component now read data from
// `Route.useLoaderData()` (DB-backed via get_platform_packs RPC at SSR).
// The mock createFileRoute exposes `useLoaderData` returning the fixture
// list below, so the assertions stay the same shape but the data flows
// through the new loader-driven path.
const PACK_FIXTURES: TestPack[] = [
  {
    slug: "fixture-eshop",
    title: "Fixture E-shop",
    tagline: "Tag pre eshop.",
    industry: "eshop",
    industryEmoji: "🛒",
    targetPersona: "",
    questionIds: Array.from({ length: 14 }, () => ""),
    passingThreshold: 70,
    publishedAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    slug: "fixture-vseobecny",
    title: "Fixture Všeobecný",
    tagline: "Tag pre všeobecný.",
    industry: "vseobecny",
    industryEmoji: "🌐",
    targetPersona: "",
    questionIds: Array.from({ length: 14 }, () => ""),
    passingThreshold: 70,
    publishedAt: "2026-04-15",
    updatedAt: "2026-04-15",
  },
];

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute:
      () =>
      <T,>(config: T) => ({
        options: config,
        // Phase F: component calls Route.useLoaderData() — return the same
        // fixture list head() will see via its loaderData arg.
        useLoaderData: () => PACK_FIXTURES,
      }),
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

type HeadFn = (ctx: { loaderData: TestPack[] }) => {
  meta: Array<Record<string, string>>;
  links?: Array<{ rel: string; href: string }>;
  scripts?: Array<{ type: string; children: string }>;
};

type RouteCfg = {
  options: { head: HeadFn; component: () => JSX.Element };
};

const cfg = Route as unknown as RouteCfg;
const callHead = () => cfg.options.head({ loaderData: PACK_FIXTURES });

describe("/tests head() — E25 Phase 1 SEO blobs", () => {
  it("emits a FAQPage JSON-LD blob alongside the ItemList blob", () => {
    const out = callHead();
    expect(out.scripts).toBeDefined();
    const ldBlobs = (out.scripts ?? []).map(
      (s) => JSON.parse(s.children) as Record<string, unknown>,
    );
    const types = ldBlobs.map((b) => b["@type"]);
    expect(types).toContain("ItemList");
    expect(types).toContain("FAQPage");
  });

  it("FAQPage carries 5 Question entries (one per FAQ key)", () => {
    const out = callHead();
    const faqBlob = (out.scripts ?? [])
      .map((s) => JSON.parse(s.children) as Record<string, unknown>)
      .find((b) => b["@type"] === "FAQPage");
    expect(faqBlob).toBeDefined();
    const entries = faqBlob!.mainEntity as Array<{ name: string }>;
    expect(entries).toHaveLength(5);
  });

  it("emits canonical and robots:index on the catalog index", () => {
    const out = callHead();
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
