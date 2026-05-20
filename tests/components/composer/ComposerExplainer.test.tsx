import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={typeof to === "string" ? to : "#"} {...(rest as Record<string, unknown>)}>
      {children}
    </a>
  ),
}));

import { ComposerExplainer } from "@/components/composer/build/ComposerExplainer";

describe("ComposerExplainer — E33 Phase 1 D8 decision helper", () => {
  it("renders collapsed by default (toggle visible, body hidden)", () => {
    render(<ComposerExplainer />);
    expect(screen.getByTestId("composer-explainer-toggle")).toBeInTheDocument();
    expect(screen.queryByTestId("composer-explainer-body")).not.toBeInTheDocument();
  });

  it("renders the canonical Slovak heading on the toggle", () => {
    render(<ComposerExplainer />);
    expect(screen.getByTestId("composer-explainer-toggle")).toHaveTextContent(
      "Kedy si zostaviť vlastný test vs. použiť hotový?",
    );
  });

  it("clicking the toggle expands the body with the 3-line decision copy", () => {
    render(<ComposerExplainer />);
    fireEvent.click(screen.getByTestId("composer-explainer-toggle"));
    expect(screen.getByTestId("composer-explainer-body")).toBeInTheDocument();
    expect(screen.getByTestId("composer-explainer-custom")).toBeInTheDocument();
    expect(screen.getByTestId("composer-explainer-pack")).toBeInTheDocument();
  });

  it("aria-expanded reflects state", () => {
    render(<ComposerExplainer />);
    const toggle = screen.getByTestId("composer-explainer-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("renders an escape-hatch CTA to /tests when expanded", () => {
    render(<ComposerExplainer />);
    fireEvent.click(screen.getByTestId("composer-explainer-toggle"));
    const cta = screen.getByTestId("composer-explainer-cta-packs");
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/tests");
  });
});
