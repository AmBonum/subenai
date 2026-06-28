import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import { AccessibilityProvider } from "@/components/theme/AccessibilityProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const Providers = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <AccessibilityProvider>{children}</AccessibilityProvider>
  </ThemeProvider>
);

const render = (ui: Parameters<typeof rtlRender>[0]) => rtlRender(ui, { wrapper: Providers });

beforeAll(() => {
  if (typeof window !== "undefined" && !window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
});

const authStateRef = { current: { isAuthenticated: false, isAdmin: false } };

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authStateRef.current,
}));

vi.mock("@/lib/platform/queries", () => ({
  useCurrentProfile: () => ({
    data: {
      id: "u1",
      email: "lubo@example.com",
      display_name: "Lubo Test",
      avatar_initials: "LT",
    },
  }),
}));

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...rest
    }: { children: React.ReactNode; to?: string } & Record<string, unknown>) => (
      <a href={typeof to === "string" ? to : undefined} {...(rest as Record<string, unknown>)}>
        {children}
      </a>
    ),
    useLocation: () => ({ pathname: "/" }),
  };
});

import { SiteHeader } from "@/components/layout/SiteHeader";

describe("SiteHeader auth-aware nav (E36 A2: avatar+dropdown)", () => {
  beforeEach(() => {
    authStateRef.current = { isAuthenticated: false, isAdmin: false };
  });

  it("hides the user menu trigger when unauthenticated", () => {
    authStateRef.current = { isAuthenticated: false, isAdmin: false };
    render(<SiteHeader />);
    expect(screen.queryByTestId("header-user-menu-trigger")).not.toBeInTheDocument();
  });

  it("shows the avatar pill (user menu trigger) when authenticated", () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: false };
    render(<SiteHeader />);
    const trigger = screen.getByTestId("header-user-menu-trigger");
    expect(trigger).toBeInTheDocument();
    // E36 C1: aria-label embeds the signed-in user's name (WCAG 4.1.2)
    // when the profile has resolved. The generic fallback
    // "Otvoriť menu používateľa" only shows pre-resolution or when no
    // display_name/email is available.
    expect(trigger).toHaveAttribute("aria-label", "Menu používateľa: Lubo Test");
    expect(screen.getByTestId("header-user-menu-avatar")).toHaveTextContent("LT");
  });

  it("preserves CTA and core header test-ids regardless of auth state (CTA stays even when signed in)", () => {
    render(<SiteHeader />);
    expect(screen.getByTestId("header-root")).toBeInTheDocument();
    expect(screen.getByTestId("header-cta-pill")).toBeInTheDocument();
    expect(screen.getByTestId("header-mobile-trigger")).toBeInTheDocument();
  });

  // E54.1 — login is built but was undiscoverable; surface it in the nav.
  // Desktop links are always in the DOM; the mobile links live inside the
  // Radix Sheet (rendered only when open) and are covered by the e2e suite.
  it("shows desktop login + docs links when unauthenticated", () => {
    authStateRef.current = { isAuthenticated: false, isAdmin: false };
    render(<SiteHeader />);
    expect(screen.getByTestId("header-nav-login")).toHaveAttribute("href", "/login");
    expect(screen.getByTestId("header-nav-docs")).toHaveAttribute("href", "/docs");
  });

  it("hides the login link when authenticated but keeps the docs link", () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: false };
    render(<SiteHeader />);
    expect(screen.queryByTestId("header-nav-login")).not.toBeInTheDocument();
    expect(screen.queryByTestId("header-mobile-login")).not.toBeInTheDocument();
    expect(screen.getByTestId("header-nav-docs")).toHaveAttribute("href", "/docs");
  });
});
