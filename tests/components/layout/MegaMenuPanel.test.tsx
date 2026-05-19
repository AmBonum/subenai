import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// The component composes Link from @tanstack/react-router and Radix
// NavigationMenuLink. Neither needs a real router for this test — the
// visual treatment is what we're asserting on.
vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
      <a href={typeof to === "string" ? to : "#"} {...(rest as Record<string, unknown>)}>
        {children}
      </a>
    ),
  };
});

vi.mock("@/components/ui/navigation-menu", () => ({
  NavigationMenuLink: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/i18n/marketing", () => ({
  tFor: () => (key: string) => `t(${key})`,
}));

import { MegaMenuPanel } from "@/components/layout/mega-menu/MegaMenuPanel";
import type { MegaMenuPanel as PanelDef } from "@/components/layout/mega-menu/mega-menu.types";

const baseSections = [
  {
    headingKey: "panel_section_verejnost",
    links: [{ key: "all", labelKey: "panel_link_all", href: "/tests" }],
  },
];

describe("MegaMenuPanel — E25 Phase 0 featured visual treatment", () => {
  it("renders the icon-over-gradient visual when featured.icon + tone are set", () => {
    const panel: PanelDef = {
      sections: baseSections,
      featured: {
        labelKey: "panel_featured",
        href: "/tests",
        icon: "ClipboardCheck",
        tone: "tests",
      },
    };
    render(<MegaMenuPanel slug="testy" panel={panel} />);

    expect(screen.getByTestId("header-mega-panel-testy-featured")).toBeInTheDocument();
    expect(screen.getByTestId("header-mega-panel-testy-featured-visual")).toBeInTheDocument();
    expect(screen.getByTestId("header-mega-panel-testy-featured-label")).toHaveTextContent(
      "t(menu.testy.panel_featured)",
    );
  });

  it("maps tone 'tests' to a primary-led gradient on the visual zone", () => {
    const panel: PanelDef = {
      sections: baseSections,
      featured: {
        labelKey: "panel_featured",
        href: "/tests",
        icon: "ClipboardCheck",
        tone: "tests",
      },
    };
    render(<MegaMenuPanel slug="testy" panel={panel} />);
    const visual = screen.getByTestId("header-mega-panel-testy-featured-visual");
    // Sanity-check the gradient class shape. We don't pin every Tailwind
    // utility — that's a refactor trap — just the brand-tone anchor.
    expect(visual.className).toMatch(/from-primary/);
  });

  it("maps tone 'schools' to an accent-led gradient on the visual zone", () => {
    const panel: PanelDef = {
      sections: baseSections,
      featured: {
        labelKey: "panel_featured",
        href: "/skoly",
        icon: "GraduationCap",
        tone: "schools",
      },
    };
    render(<MegaMenuPanel slug="skolenia" panel={panel} />);
    const visual = screen.getByTestId("header-mega-panel-skolenia-featured-visual");
    expect(visual.className).toMatch(/from-accent/);
  });

  it("falls back to the legacy text-only tile when icon+tone are omitted", () => {
    const panel: PanelDef = {
      sections: baseSections,
      featured: { labelKey: "panel_featured", href: "/tests" },
    };
    render(<MegaMenuPanel slug="testy" panel={panel} />);

    expect(screen.getByTestId("header-mega-panel-testy-featured")).toBeInTheDocument();
    expect(screen.queryByTestId("header-mega-panel-testy-featured-visual")).not.toBeInTheDocument();
    expect(screen.queryByTestId("header-mega-panel-testy-featured-label")).not.toBeInTheDocument();
  });

  it("renders nothing in the featured slot when panel.featured is absent", () => {
    const panel: PanelDef = { sections: baseSections };
    render(<MegaMenuPanel slug="testy" panel={panel} />);
    expect(screen.queryByTestId("header-mega-panel-testy-featured")).not.toBeInTheDocument();
  });
});
