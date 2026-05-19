import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { TestPack } from "@/content/test-packs";

const mockPacks = vi.hoisted(() => ({ value: [] as TestPack[] }));

vi.mock("@/content/test-packs", async () => {
  const actual =
    await vi.importActual<typeof import("@/content/test-packs")>("@/content/test-packs");
  return {
    ...actual,
    listPublishedPacks: () => mockPacks.value,
  };
});

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
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

import { RelatedTestPacks } from "@/components/test-packs/RelatedTestPacks";

const makePack = (overrides: Partial<TestPack> = {}): TestPack => ({
  slug: overrides.slug ?? "p",
  title: overrides.title ?? "Pack",
  tagline: "tag",
  industry: overrides.industry ?? "eshop",
  industryEmoji: "🛒",
  targetPersona: "x",
  questionIds: ["a", "b", "c", "d", "e", "f", "g", "h"],
  passingThreshold: 70,
  publishedAt: "2026-04-01",
  updatedAt: "2026-04-15",
  ...overrides,
});

const current = makePack({ slug: "current-eshop", industry: "eshop" });

describe("RelatedTestPacks — E29 cross-sell on /tests/$slug", () => {
  it("returns null when no other packs exist", () => {
    mockPacks.value = [current];
    const { container } = render(<RelatedTestPacks current={current} />);
    expect(container.firstChild).toBeNull();
  });

  it("excludes the current pack from the recommendations", () => {
    mockPacks.value = [current, makePack({ slug: "other", industry: "gastro" })];
    render(<RelatedTestPacks current={current} />);
    expect(screen.queryByTestId("tests-catalog-card-current-eshop")).not.toBeInTheDocument();
    expect(screen.getByTestId("tests-catalog-card-other")).toBeInTheDocument();
  });

  it("prefers same-industry packs first, fills with other industries", () => {
    mockPacks.value = [
      current,
      makePack({ slug: "same-1", industry: "eshop" }),
      makePack({ slug: "same-2", industry: "eshop" }),
      makePack({ slug: "filler", industry: "gastro" }),
    ];
    render(<RelatedTestPacks current={current} />);
    // All three should render — two same-industry first, then filler.
    expect(screen.getByTestId("tests-catalog-card-same-1")).toBeInTheDocument();
    expect(screen.getByTestId("tests-catalog-card-same-2")).toBeInTheDocument();
    expect(screen.getByTestId("tests-catalog-card-filler")).toBeInTheDocument();
  });

  it("caps the recommendations at 3 even when many same-industry siblings exist", () => {
    mockPacks.value = [
      current,
      makePack({ slug: "s1", industry: "eshop" }),
      makePack({ slug: "s2", industry: "eshop" }),
      makePack({ slug: "s3", industry: "eshop" }),
      makePack({ slug: "s4", industry: "eshop" }),
    ];
    render(<RelatedTestPacks current={current} />);
    expect(screen.getByTestId("tests-catalog-card-s1")).toBeInTheDocument();
    expect(screen.getByTestId("tests-catalog-card-s2")).toBeInTheDocument();
    expect(screen.getByTestId("tests-catalog-card-s3")).toBeInTheDocument();
    expect(screen.queryByTestId("tests-catalog-card-s4")).not.toBeInTheDocument();
  });

  it("renders the section heading from i18n", () => {
    mockPacks.value = [current, makePack({ slug: "other" })];
    render(<RelatedTestPacks current={current} />);
    expect(screen.getByTestId("test-pack-related-heading")).toHaveTextContent(
      "Vyskúšaj ďalší pack",
    );
  });
});
