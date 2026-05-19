import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
}));

import { EduWorkflowSteps } from "@/components/schools/EduWorkflowSteps";

describe("EduWorkflowSteps", () => {
  it("renders 4 step cards", () => {
    render(<EduWorkflowSteps />);
    for (const n of [1, 2, 3, 4]) {
      expect(screen.getByTestId(`schools-workflow-step-${n}`)).toBeInTheDocument();
      expect(screen.getByTestId(`schools-workflow-step-${n}-heading`)).toBeInTheDocument();
      expect(screen.getByTestId(`schools-workflow-step-${n}-badge`)).toBeInTheDocument();
      expect(screen.getByTestId(`schools-workflow-step-${n}-outcome`)).toBeInTheDocument();
      expect(screen.getByTestId(`schools-workflow-step-${n}-illustration`)).toBeInTheDocument();
    }
  });

  it("preserves original Slovak step headings (back-compat with existing /schools test)", () => {
    render(<EduWorkflowSteps />);
    expect(screen.getByRole("heading", { name: /Krok 1: Vytvor test/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Krok 2: Zapni edu mód/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Krok 3: Pošli link/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Krok 4: Pozri výsledky/i })).toBeInTheDocument();
  });

  it("step 3 email-template <details> is present and contains {public_url} placeholder", () => {
    render(<EduWorkflowSteps />);
    expect(screen.getByTestId("schools-workflow-step-3-email-summary")).toBeInTheDocument();
    expect(screen.getByText(/{public_url}/)).toBeInTheDocument();
  });

  it("illustrations are aria-hidden (decorative)", () => {
    const { container } = render(<EduWorkflowSteps />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(4);
    svgs.forEach((svg) => {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    });
  });
});
