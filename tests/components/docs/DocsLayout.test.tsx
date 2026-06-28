import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { expectNoA11yViolations } from "../../utils/axe";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({
      children,
      to,
      params,
      ...rest
    }: {
      children: React.ReactNode;
      to?: string;
      params?: { slug?: string };
    } & Record<string, unknown>) => (
      <a href={params?.slug ? `/docs/${params.slug}` : to} {...(rest as Record<string, unknown>)}>
        {children}
      </a>
    ),
  };
});

import { DocsLayout } from "@/components/docs/DocsLayout";

describe("DocsLayout", () => {
  it("renders the category-grouped sidebar and the content slot", () => {
    render(
      <DocsLayout activeSlug="co-je-subenai">
        <p data-testid="doc-body">Telo dokumentu</p>
      </DocsLayout>,
    );
    expect(screen.getByTestId("docs-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("doc-body")).toBeInTheDocument();
    const links = screen.getAllByTestId("docs-sidebar-link");
    expect(links.length).toBeGreaterThanOrEqual(6);
    // active slug carries aria-current
    const active = links.find((l) => l.getAttribute("href") === "/docs/co-je-subenai");
    expect(active).toHaveAttribute("aria-current", "page");
  });

  it("has no a11y violations", async () => {
    const { container } = render(
      <DocsLayout>
        <article>
          <h1>Nadpis</h1>
          <p>Obsah</p>
        </article>
      </DocsLayout>,
    );
    await expectNoA11yViolations(container);
  });
});
