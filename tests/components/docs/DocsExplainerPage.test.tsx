import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { expectNoA11yViolations } from "../../utils/axe";
import { DocsExplainerPage } from "@/components/docs/DocsExplainerPage";

describe("DocsExplainerPage", () => {
  it("renders title, lead and sections from the explainer i18n", () => {
    render(<DocsExplainerPage explainerKey="dashboard" />);
    expect(screen.getByTestId("docs-explainer-title")).toHaveTextContent("O sekcii Prehľad");
    expect(screen.getAllByTestId("docs-explainer-section").length).toBeGreaterThan(0);
  });

  it("renders admin explainer content when area=admin", () => {
    render(<DocsExplainerPage explainerKey="users" area="admin" />);
    expect(screen.getByTestId("docs-explainer-root")).toHaveAttribute("data-doc-area", "admin");
    expect(screen.getByTestId("docs-explainer-title").textContent?.length ?? 0).toBeGreaterThan(0);
  });

  it("does not crash for an entry without sections (defensive)", () => {
    render(<DocsExplainerPage explainerKey="___missing___" />);
    expect(screen.getByTestId("docs-explainer-root")).toBeInTheDocument();
    expect(screen.queryAllByTestId("docs-explainer-section").length).toBe(0);
  });

  it("has no a11y violations", async () => {
    const { container } = render(<DocsExplainerPage explainerKey="dashboard" />);
    await expectNoA11yViolations(container);
  });
});
