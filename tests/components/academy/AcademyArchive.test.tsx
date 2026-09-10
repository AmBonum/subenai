import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { expectNoA11yViolations } from "../../utils/axe";
import type { AcademyListItem } from "@/lib/academy/queries";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...(rest as Record<string, unknown>)}>{children}</a>
    ),
  };
});

import { AcademyArchive } from "@/components/academy/AcademyArchive";

const base = {
  hero_image_url: null,
  published_at: "2026-09-10",
  estimated_minutes: null,
  hero_emoji: null,
  reading_minutes: 7,
  content_type: "article" as const,
  category: { slug: "bezpecna-praca-s-ai", name: "Bezpečná práca s AI" },
  author: { slug: "ed", display_name: "Editorial" },
};

const items: AcademyListItem[] = [
  { ...base, id: "p", slug: "pillar", title: "sprievodca", excerpt: "...", difficulty: null },
  {
    ...base,
    id: "b",
    slug: "beginner",
    title: "čo nepísať do chatgpt",
    excerpt: "...",
    difficulty: "beginner",
  },
  {
    ...base,
    id: "a",
    slug: "advanced",
    title: "prompt injection",
    excerpt: "...",
    difficulty: "advanced",
  },
];

describe("AcademyArchive lane toggle", () => {
  it("hides the toggle when no item carries a lane", () => {
    render(<AcademyArchive heading="Kat" items={[items[0]]} isLoading={false} />);
    expect(screen.queryByTestId("academy-archive-lane-all")).not.toBeInTheDocument();
  });

  it("filters cards by lane and keeps lane-less items", () => {
    render(<AcademyArchive heading="Kat" items={items} isLoading={false} />);
    expect(screen.getAllByTestId("academy-archive-card")).toHaveLength(3);
    fireEvent.click(screen.getByTestId("academy-archive-lane-advanced"));
    expect(screen.getAllByTestId("academy-archive-card")).toHaveLength(2);
    expect(screen.getByText("prompt injection")).toBeInTheDocument();
    expect(screen.queryByText("čo nepísať do chatgpt")).not.toBeInTheDocument();
  });

  it("shows the lane badge on cards", () => {
    render(<AcademyArchive heading="Kat" items={items} isLoading={false} />);
    expect(screen.getByText("pre odborníkov")).toBeInTheDocument();
    expect(screen.getByText("pre každého")).toBeInTheDocument();
  });

  it("has no a11y violations", async () => {
    const { container } = render(<AcademyArchive heading="Kat" items={items} isLoading={false} />);
    await expectNoA11yViolations(container);
  });
});
