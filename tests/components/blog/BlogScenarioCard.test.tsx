import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

// Mock TanStack Link with a plain <a> so the component can render
// without a Router context (the in-card CTA at the end uses <Link>).
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a href={typeof to === "string" ? to : "#"} {...rest}>
      {children}
    </a>
  ),
}));

import { BlogScenarioCard } from "@/components/blog/BlogScenarioCard";
import { QUESTIONS } from "@/lib/quiz/bank/questions";

// Pick a real question id from the bank so we don't drift if specific
// fixtures get renamed. The first question is always present.
const sampleQuestion = QUESTIONS[0];

describe("BlogScenarioCard", () => {
  it("returns null when the questionId is unknown", () => {
    const { container } = render(<BlogScenarioCard questionId="does-not-exist" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the question prompt and every option before any choice", () => {
    render(<BlogScenarioCard questionId={sampleQuestion.id} />);

    expect(screen.getByTestId(`blog-scenario-card-prompt-${sampleQuestion.id}`)).toHaveTextContent(
      sampleQuestion.prompt,
    );

    for (const option of sampleQuestion.options) {
      expect(
        screen.getByTestId(`blog-scenario-card-option-${sampleQuestion.id}-${option.id}`),
      ).toBeInTheDocument();
    }

    expect(
      screen.queryByTestId(`blog-scenario-card-explanation-${sampleQuestion.id}`),
    ).not.toBeInTheDocument();
  });

  it("reveals the explanation and CTA after a click and locks further input", () => {
    render(<BlogScenarioCard questionId={sampleQuestion.id} />);

    const firstOption = sampleQuestion.options[0];
    const firstButton = screen.getByTestId(
      `blog-scenario-card-option-${sampleQuestion.id}-${firstOption.id}`,
    );
    fireEvent.click(firstButton);

    const explanation = screen.getByTestId(`blog-scenario-card-explanation-${sampleQuestion.id}`);
    expect(explanation).toBeInTheDocument();
    expect(explanation).toHaveTextContent(sampleQuestion.explanation);

    const cta = screen.getByTestId(`blog-scenario-card-cta-${sampleQuestion.id}`);
    // CTA was changed from /test (legacy quiz) to /tests (suite landing)
    // in E16.4 — both routes existed but only /tests is the canonical
    // conversion target for blog readers.
    expect(cta).toHaveAttribute("href", "/tests");

    // After reveal every option button is disabled — second click is a no-op.
    for (const option of sampleQuestion.options) {
      expect(
        screen.getByTestId(`blog-scenario-card-option-${sampleQuestion.id}-${option.id}`),
      ).toBeDisabled();
    }
  });
});
