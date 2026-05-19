import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

import type { FaqSection } from "@/components/home/HomeFaqSection";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
}));

import { HomeFaqSection } from "@/components/home/HomeFaqSection";

const SECTIONS: FaqSection[] = [
  {
    slug: "rychly_test",
    title: "Rýchly test",
    items: [
      { id: "q1", question: "Otázka 1?", answer: "Odpoveď 1." },
      { id: "q2", question: "Otázka 2?", answer: "Odpoveď 2." },
      { id: "q3", question: "Otázka 3?", answer: "Odpoveď 3." },
    ],
  },
  {
    slug: "testy",
    title: "Testy",
    items: [{ id: "qx", question: "Otázka X?", answer: "Odpoveď X." }],
  },
  {
    slug: "vzdelavanie",
    title: "Vzdelávanie",
    items: [
      { id: "qa", question: "Otázka A?", answer: "Odpoveď A." },
      { id: "qb", question: "Otázka B?", answer: "Odpoveď B." },
    ],
  },
];

describe("HomeFaqSection — initial collapsed state", () => {
  it("renders the heading, subheading, and one row per category", () => {
    render(<HomeFaqSection sections={SECTIONS} />);
    expect(screen.getByTestId("home-faq-heading")).toHaveTextContent("Časté otázky");
    expect(screen.getByTestId("home-faq-subheading")).toHaveTextContent(
      "Kliknutím na kategóriu zobrazíš otázky.",
    );
    expect(screen.getByTestId("home-faq-category-rychly_test")).toBeInTheDocument();
    expect(screen.getByTestId("home-faq-category-testy")).toBeInTheDocument();
    expect(screen.getByTestId("home-faq-category-vzdelavanie")).toBeInTheDocument();
  });

  it("renders the Slovak-correct question count badge per category", () => {
    render(<HomeFaqSection sections={SECTIONS} />);
    // 3 → genitive plural 'otázok' (5+/0 rule does NOT apply to 3, but
    // 'otázka' (1) vs 'otázky' (2-4) vs 'otázok' (5+/0) — 3 → otázky)
    expect(screen.getByTestId("home-faq-category-count-rychly_test")).toHaveTextContent("3 otázky");
    expect(screen.getByTestId("home-faq-category-count-testy")).toHaveTextContent("1 otázka");
    expect(screen.getByTestId("home-faq-category-count-vzdelavanie")).toHaveTextContent("2 otázky");
  });

  it("does NOT render any expanded answer text on initial render", () => {
    render(<HomeFaqSection sections={SECTIONS} />);
    // Radix Accordion keeps content in DOM but hides via [data-state="closed"]
    // — assert the trigger for an individual question is NOT visible
    // because its parent category is closed (Radix removes the inner
    // accordion items entirely when the outer is collapsed).
    expect(screen.queryByText("Otázka 1?")).toBeNull();
    expect(screen.queryByText("Odpoveď 1.")).toBeNull();
  });

  it("the 'rozbaliť všetky' toggle starts in the unpressed state", () => {
    render(<HomeFaqSection sections={SECTIONS} />);
    const toggle = screen.getByTestId("home-faq-toggle-all");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveTextContent("Rozbaliť všetky");
  });
});

describe("HomeFaqSection — expanding categories", () => {
  it("clicking a category trigger reveals the inner question list", () => {
    render(<HomeFaqSection sections={SECTIONS} />);
    fireEvent.click(screen.getByTestId("home-faq-category-trigger-rychly_test"));
    expect(screen.getByTestId("home-faq-questions-rychly_test")).toBeInTheDocument();
    expect(screen.getByText("Otázka 1?")).toBeInTheDocument();
    expect(screen.getByText("Otázka 2?")).toBeInTheDocument();
  });

  it("multiple categories can be open at once (type='multiple')", () => {
    render(<HomeFaqSection sections={SECTIONS} />);
    fireEvent.click(screen.getByTestId("home-faq-category-trigger-rychly_test"));
    fireEvent.click(screen.getByTestId("home-faq-category-trigger-vzdelavanie"));
    expect(screen.getByTestId("home-faq-questions-rychly_test")).toBeInTheDocument();
    expect(screen.getByTestId("home-faq-questions-vzdelavanie")).toBeInTheDocument();
  });

  it("clicking a question reveals its answer (inner accordion expands)", () => {
    render(<HomeFaqSection sections={SECTIONS} />);
    fireEvent.click(screen.getByTestId("home-faq-category-trigger-rychly_test"));
    fireEvent.click(screen.getByText("Otázka 1?"));
    expect(screen.getByText("Odpoveď 1.")).toBeInTheDocument();
  });

  it("each question carries a stable anchor id for deep-linking", () => {
    render(<HomeFaqSection sections={SECTIONS} />);
    fireEvent.click(screen.getByTestId("home-faq-category-trigger-rychly_test"));
    const q1 = screen.getByTestId("home-faq-question-rychly_test-q1");
    expect(q1.id).toBe("faq-q-rychly_test-q1");
  });
});

describe("HomeFaqSection — expand/collapse all toggle", () => {
  it("clicking the toggle opens every category", () => {
    render(<HomeFaqSection sections={SECTIONS} />);
    fireEvent.click(screen.getByTestId("home-faq-toggle-all"));
    expect(screen.getByTestId("home-faq-questions-rychly_test")).toBeInTheDocument();
    expect(screen.getByTestId("home-faq-questions-testy")).toBeInTheDocument();
    expect(screen.getByTestId("home-faq-questions-vzdelavanie")).toBeInTheDocument();
  });

  it("clicking again collapses everything", () => {
    render(<HomeFaqSection sections={SECTIONS} />);
    const toggle = screen.getByTestId("home-faq-toggle-all");
    fireEvent.click(toggle); // expand
    fireEvent.click(toggle); // collapse
    expect(screen.queryByTestId("home-faq-questions-rychly_test")).toBeNull();
  });

  it("toggle button label + aria-pressed flip when state changes", () => {
    render(<HomeFaqSection sections={SECTIONS} />);
    const toggle = screen.getByTestId("home-faq-toggle-all");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveTextContent("Zbaliť všetky");
  });
});

describe("HomeFaqSection — docs link", () => {
  it("renders an Akadémia cross-link below the accordion", () => {
    render(<HomeFaqSection sections={SECTIONS} />);
    const hint = screen.getByTestId("home-faq-docs-hint");
    const link = within(hint).getByRole("link");
    expect(link).toHaveAttribute("data-to", "/blog");
    expect(link).toHaveTextContent("Otvor akadémiu");
  });
});
