import type { JSX } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { TestPack } from "@/content/test-packs";

const PACK_FIXTURE: TestPack = {
  slug: "fixture-eshop",
  title: "Fixture E-shop pack",
  tagline: "Krátky popis fixture packu pre detail.",
  industry: "eshop",
  industryEmoji: "🛒",
  targetPersona: "E-shop tím — pokladňa, sklad, logistika.",
  questionIds: ["q-1", "q-2", "q-3", "q-4", "q-5", "q-6", "q-7", "q-8", "q-9", "q-10"],
  passingThreshold: 70,
  publishedAt: "2026-04-01",
  updatedAt: "2026-04-15",
};

// E28 — verify the detail-page hero renders the new gradient zone +
// pill-style chip meta (instead of the legacy text-7xl emoji).
//
// E37 Phase F (2026-05-21) — useLoaderData now returns the full detail
// payload (pack + questions + allPacks for RelatedTestPacks). The mock
// shape mirrors the new contract from `fetchPackWithQuestions` +
// the parallel `fetchPlatformPacks` call inside the loader.
const LOADER_DATA = {
  pack: PACK_FIXTURE,
  questions: PACK_FIXTURE.questionIds.map((id) => ({
    id,
    category: "phishing" as const,
    difficulty: "medium" as const,
    prompt: `Prompt ${id}`,
    options: [
      { id: "a", label: "A", correct: true, severity: null },
      { id: "b", label: "B", correct: false, severity: "minor" as const },
    ],
    explanation: "",
  })),
  allPacks: [PACK_FIXTURE],
};

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute:
      () =>
      <T,>(config: T) => {
        return {
          ...(config as object),
          useLoaderData: () => LOADER_DATA,
        } as typeof config & { useLoaderData: () => typeof LOADER_DATA };
      },
    notFound: () => new Error("not-found"),
    Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
      <a href={typeof to === "string" ? to : "#"} {...(rest as Record<string, unknown>)}>
        {children}
      </a>
    ),
  };
});

// TestFlow only renders when `started` is true (CTA click) — stub it
// so its dependency tree doesn't matter for the hero-render test.
vi.mock("@/components/quiz/flow/TestFlow", () => ({
  TestFlow: () => <div data-testid="test-flow-stub" />,
}));

// RelatedTestPackArticleCard hits supabase; stub it.
vi.mock("@/components/test-packs/RelatedTestPackArticleCard", () => ({
  RelatedTestPackArticleCard: () => null,
}));

import { Route } from "@/routes/tests.$slug";

type RouteCfg = { component: () => JSX.Element };

describe("/tests/$slug — E28 detail hero alignment", () => {
  it("renders the gradient hero visual zone (not the legacy text-7xl emoji)", () => {
    const Page = (Route as unknown as RouteCfg).component;
    render(<Page />);
    expect(screen.getByTestId("test-pack-hero")).toBeInTheDocument();
    expect(screen.getByTestId("test-pack-hero")).toHaveAttribute("role", "img");
  });

  it("uses industry-mapped gradient ('eshop' → blue) on the hero visual", () => {
    const Page = (Route as unknown as RouteCfg).component;
    render(<Page />);
    expect(screen.getByTestId("test-pack-hero").className).toMatch(/from-blue-600/);
  });

  it("renders title + tagline", () => {
    const Page = (Route as unknown as RouteCfg).component;
    render(<Page />);
    expect(screen.getByTestId("test-pack-heading")).toHaveTextContent("Fixture E-shop pack");
    expect(screen.getByTestId("test-pack-tagline")).toHaveTextContent(
      "Krátky popis fixture packu pre detail.",
    );
  });

  it("renders meta as 3 separate pill chips (questions · threshold · industry)", () => {
    const Page = (Route as unknown as RouteCfg).component;
    render(<Page />);
    expect(screen.getByTestId("test-pack-meta-questions")).toHaveTextContent(/10 otázok/);
    expect(screen.getByTestId("test-pack-meta-threshold")).toHaveTextContent(/70/);
    expect(screen.getByTestId("test-pack-meta-industry")).toBeInTheDocument();
  });

  it("keeps the Start-pack CTA visible (no regression on primary action)", () => {
    const Page = (Route as unknown as RouteCfg).component;
    render(<Page />);
    expect(screen.getByTestId("test-pack-start-button")).toBeInTheDocument();
  });
});

// E37 CR follow-up — fetchPackWithQuestions returns `publishedAt: ""` when
// the DB column is null, which made `new Date("").getFullYear()` render as
// NaN in the copyright footer.
describe("/tests/$slug — copyright year is never NaN", () => {
  it("falls back to the current year when publishedAt is empty", async () => {
    vi.resetModules();
    const EMPTY_PACK: TestPack = { ...PACK_FIXTURE, publishedAt: "" };
    const EMPTY_LOADER = {
      pack: EMPTY_PACK,
      questions: LOADER_DATA.questions,
      allPacks: [EMPTY_PACK],
    };
    vi.doMock("@tanstack/react-router", async () => {
      const actual =
        await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
      return {
        ...actual,
        createFileRoute:
          () =>
          <T,>(config: T) => ({
            ...(config as object),
            useLoaderData: () => EMPTY_LOADER,
          }),
        notFound: () => new Error("not-found"),
        Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
          <a href={typeof to === "string" ? to : "#"} {...(rest as Record<string, unknown>)}>
            {children}
          </a>
        ),
      };
    });
    vi.doMock("@/components/quiz/flow/TestFlow", () => ({
      TestFlow: () => <div data-testid="test-flow-stub" />,
    }));
    vi.doMock("@/components/test-packs/RelatedTestPackArticleCard", () => ({
      RelatedTestPackArticleCard: () => null,
    }));
    const { Route: FreshRoute } = await import("@/routes/tests.$slug");
    const Page = (FreshRoute as unknown as RouteCfg).component;
    render(<Page />);
    const copyright = screen.getByText(/©/);
    expect(copyright.textContent).not.toMatch(/NaN/);
  });
});
