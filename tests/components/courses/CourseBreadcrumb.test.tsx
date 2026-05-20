import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Stub TanStack Link to a plain anchor so breadcrumb assertions on
// link rendering are agnostic to the router shell.
vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => {
      const {
        to,
        params: _params,
        ...domProps
      } = rest as {
        to?: string;
        params?: Record<string, string>;
      };
      return (
        <a href={to ?? "#"} {...(domProps as Record<string, unknown>)}>
          {children}
        </a>
      );
    },
  };
});

import { CourseBreadcrumb } from "@/components/courses/Breadcrumb";

describe("CourseBreadcrumb — semantic breadcrumb component", () => {
  const items = [
    { label: "Domov", to: "/" },
    { label: "Školenia", to: "/courses" },
    { label: "Test Course" },
  ];

  it("renders a <nav> with the Slovak aria-label", () => {
    render(<CourseBreadcrumb items={items} />);
    const nav = screen.getByRole("navigation", { name: "Drobčeková navigácia" });
    expect(nav).toBeInTheDocument();
  });

  it("renders the parent crumbs as links", () => {
    render(<CourseBreadcrumb items={items} />);
    expect(screen.getByRole("link", { name: "Domov" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Školenia" })).toBeInTheDocument();
  });

  it("renders the last crumb as a span with aria-current=page", () => {
    render(<CourseBreadcrumb items={items} />);
    const current = screen.getByText("Test Course");
    expect(current.tagName.toLowerCase()).toBe("span");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renders separator chevrons between crumbs", () => {
    const { container } = render(<CourseBreadcrumb items={items} />);
    // With 3 crumbs there must be at least 2 separators. The component
    // marks separators aria-hidden so they don't pollute the AT tree;
    // assert presence via the aria-hidden role-less SVG/text nodes.
    const separators = container.querySelectorAll("[aria-hidden='true']");
    expect(separators.length).toBeGreaterThanOrEqual(2);
  });
});
