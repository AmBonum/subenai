import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { expectNoA11yViolations } from "../../utils/axe";
import type { PublicDoc } from "@/content/docs/types";

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

import { DocsArticlePage } from "@/components/docs/DocsArticlePage";

const doc: PublicDoc = {
  slug: "test-doc",
  title: "Testovací dokument",
  description: "Popis.",
  order: 1,
  category: "Začíname",
  body: "Prvý odsek.\n\n## Podnadpis\n\nDruhý odsek.",
};

describe("DocsArticlePage", () => {
  it("renders the title and markdown body", () => {
    render(<DocsArticlePage doc={doc} />);
    expect(screen.getByTestId("docs-article-title")).toHaveTextContent("Testovací dokument");
    expect(screen.getByText("Prvý odsek.")).toBeInTheDocument();
    expect(screen.getByText("Podnadpis")).toBeInTheDocument();
  });

  it("has no a11y violations", async () => {
    const { container } = render(<DocsArticlePage doc={doc} />);
    await expectNoA11yViolations(container);
  });
});
