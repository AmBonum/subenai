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

const mockUseAcademyList = vi.fn();
vi.mock("@/lib/academy/queries", () => ({
  useAcademyList: () => mockUseAcademyList(),
}));

import { AcademyIndex } from "@/components/academy/AcademyIndex";

const base = {
  hero_image_url: null,
  published_at: "2026-01-01",
  category: { slug: "phishing", name: "Phishing" },
  author: { slug: "ed", display_name: "Editorial" },
} as const;

const items: AcademyListItem[] = [
  {
    ...base,
    id: "1",
    slug: "email-phishing",
    title: "Email phishing",
    excerpt: "Ako spoznať podvodný e-mail",
    content_type: "lesson",
    difficulty: "beginner",
    estimated_minutes: 9,
    hero_emoji: "📧",
    reading_minutes: null,
  },
  {
    ...base,
    id: "2",
    slug: "psychologia-podvodov",
    title: "Psychológia podvodov",
    excerpt: "Prečo naletíme",
    content_type: "article",
    difficulty: null,
    estimated_minutes: null,
    hero_emoji: null,
    reading_minutes: 6,
  },
];

describe("AcademyIndex", () => {
  it("lists academy entries and links lessons to /academy/$slug", () => {
    mockUseAcademyList.mockReturnValue({ data: items, isLoading: false, isError: false });
    render(<AcademyIndex />);
    const cards = screen.getAllByTestId("academy-index-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute("data-content-type", "lesson");
    expect(screen.getByText("Email phishing")).toBeInTheDocument();
  });

  it("filters to lessons when the Kurzy tab is selected", () => {
    mockUseAcademyList.mockReturnValue({ data: items, isLoading: false, isError: false });
    render(<AcademyIndex />);
    fireEvent.click(screen.getByTestId("academy-index-tab-lesson"));
    const cards = screen.getAllByTestId("academy-index-card");
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAttribute("data-content-type", "lesson");
  });

  it("shows the empty state when nothing matches the query", () => {
    mockUseAcademyList.mockReturnValue({ data: items, isLoading: false, isError: false });
    render(<AcademyIndex />);
    fireEvent.change(screen.getByTestId("academy-index-search"), {
      target: { value: "zzz-nenajde-sa" },
    });
    expect(screen.getByTestId("academy-index-empty")).toBeInTheDocument();
  });

  it("has no a11y violations", async () => {
    mockUseAcademyList.mockReturnValue({ data: items, isLoading: false, isError: false });
    const { container } = render(<AcademyIndex />);
    await expectNoA11yViolations(container);
  });
});
