import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock router primitives — the page composes Link from multiple
// components, none of which need a real router.
vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => {
      const {
        to: _to,
        params: _params,
        ...domProps
      } = rest as {
        to?: string;
        params?: Record<string, string>;
      };
      return (
        <a href="#" {...(domProps as Record<string, unknown>)}>
          {children}
        </a>
      );
    },
  };
});

// Footer pulls in real ConsentProvider hooks via SponsorsManager — stub it
// out so this test doesn't need the world.
vi.mock("@/components/layout/Footer", () => ({
  Footer: () => null,
}));

import { Route } from "@/routes/schools";

describe("/schools — senior-level marketing landing (E19)", () => {
  it("renders the persona hero with outcome-first H1 + 3 persona chips", () => {
    const Comp = Route.options.component as React.ComponentType;
    render(<Comp />);
    expect(screen.getByTestId("schools-hero")).toBeInTheDocument();
    expect(screen.getByTestId("schools-hero-title")).toBeInTheDocument();
    expect(screen.getByTestId("schools-hero-persona-riaditel")).toBeInTheDocument();
    expect(screen.getByTestId("schools-hero-persona-itkoord")).toBeInTheDocument();
    expect(screen.getByTestId("schools-hero-persona-ucitel")).toBeInTheDocument();
  });

  it("renders all 4 workflow step headings (original Slovak copy preserved)", () => {
    const Comp = Route.options.component as React.ComponentType;
    render(<Comp />);
    expect(screen.getByRole("heading", { name: /Krok 1: Vytvor test/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Krok 2: Zapni edu mód/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Krok 3: Pošli link/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Krok 4: Pozri výsledky/i })).toBeInTheDocument();
  });

  it("renders GDPR card with controller/processor roles + 12-mes retention", () => {
    const Comp = Route.options.component as React.ComponentType;
    render(<Comp />);
    expect(screen.getByTestId("schools-gdpr-card")).toBeInTheDocument();
    // Both texts appear on the page in multiple places after the rework
    // (GDPR card + persona comparison table) — assert >0 rather than ==1.
    expect(screen.getAllByText(/ty kontrolór/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sprostredkovateľ/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/12 mesiacov/i).length).toBeGreaterThan(0);
  });

  it("DPA callout is visible without interaction (no longer buried in a mailto)", () => {
    const Comp = Route.options.component as React.ComponentType;
    render(<Comp />);
    expect(screen.getByTestId("schools-gdpr-dpa-box")).toBeInTheDocument();
    expect(screen.getByTestId("schools-gdpr-dpa-link")).toBeInTheDocument();
  });

  it("includes the copy-paste e-mail template inside step 3", () => {
    const Comp = Route.options.component as React.ComponentType;
    render(<Comp />);
    expect(screen.getByText(/Vzor e-mailu/i)).toBeInTheDocument();
    expect(screen.getByText(/{public_url}/)).toBeInTheDocument();
  });

  it("renders the persona comparison table (desktop) + stacked cards (mobile)", () => {
    const Comp = Route.options.component as React.ComponentType;
    render(<Comp />);
    expect(screen.getByTestId("schools-persona-comparison")).toBeInTheDocument();
    expect(screen.getByTestId("schools-persona-col-riaditel")).toBeInTheDocument();
    expect(screen.getByTestId("schools-persona-col-itkoord")).toBeInTheDocument();
    expect(screen.getByTestId("schools-persona-col-ucitel")).toBeInTheDocument();
  });

  it("joins the cross-link triangle — footer CTAs to test / composer / blog", () => {
    const Comp = Route.options.component as React.ComponentType;
    render(<Comp />);
    expect(screen.getByTestId("schools-footer-cta-composer")).toBeInTheDocument();
    expect(screen.getByTestId("schools-footer-cta-test")).toBeInTheDocument();
    expect(screen.getByTestId("schools-footer-cta-blog")).toBeInTheDocument();
  });

  it("breadcrumb nav + sticky mobile CTA mounted", () => {
    const Comp = Route.options.component as React.ComponentType;
    render(<Comp />);
    expect(screen.getByTestId("schools-breadcrumb")).toBeInTheDocument();
    expect(screen.getByTestId("schools-sticky-cta")).toBeInTheDocument();
  });

  it("FAQ accordion replaces the old <dl> wall — section + questions present", () => {
    const Comp = Route.options.component as React.ComponentType;
    render(<Comp />);
    expect(screen.getByTestId("schools-faq")).toBeInTheDocument();
    // Radix accordion content is collapsed initially and marked [hidden],
    // which RTL queries skip. Assert on the section + the category
    // triggers (always visible) instead of probing inside hidden panels.
    expect(screen.getByTestId("schools-faq-section")).toBeInTheDocument();
    expect(screen.getByTestId("schools-faq-category-pristup")).toBeInTheDocument();
    expect(screen.getByTestId("schools-faq-category-data")).toBeInTheDocument();
  });
});
