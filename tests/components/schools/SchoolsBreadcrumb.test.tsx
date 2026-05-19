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

import { SchoolsBreadcrumb } from "@/components/schools/SchoolsBreadcrumb";

describe("SchoolsBreadcrumb", () => {
  it("renders a nav with breadcrumb aria-label", () => {
    render(<SchoolsBreadcrumb />);
    const nav = screen.getByTestId("schools-breadcrumb");
    expect(nav).toBeInTheDocument();
    expect(nav.tagName.toLowerCase()).toBe("nav");
    expect(nav).toHaveAttribute("aria-label", "breadcrumb");
  });

  it("renders a Link back to the home route", () => {
    render(<SchoolsBreadcrumb />);
    const home = screen.getByTestId("schools-breadcrumb-home");
    expect(home).toHaveAttribute("data-to", "/");
  });

  it("renders the current page with aria-current='page'", () => {
    render(<SchoolsBreadcrumb />);
    const current = screen.getByTestId("schools-breadcrumb-current");
    expect(current).toBeInTheDocument();
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("emits BreadcrumbList JSON-LD with both items", () => {
    render(<SchoolsBreadcrumb />);
    const script = screen.getByTestId("schools-breadcrumb-jsonld");
    expect(script.getAttribute("type")).toBe("application/ld+json");
    const json = JSON.parse(script.innerHTML);
    expect(json["@type"]).toBe("BreadcrumbList");
    expect(json.itemListElement).toHaveLength(2);
    expect(json.itemListElement[0].position).toBe(1);
    expect(json.itemListElement[1].position).toBe(2);
    expect(json.itemListElement[1].item).toMatch(/\/schools$/);
  });
});
