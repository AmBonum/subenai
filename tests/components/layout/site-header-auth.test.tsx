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
    render(<SiteHeader menuOpen={false} onMenuOpenChange={() => {}} />);
    expect(screen.queryByTestId("header-user-menu-trigger")).not.toBeInTheDocument();
  });

  it("shows the avatar pill (user menu trigger) when authenticated", () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: false };
    render(<SiteHeader menuOpen={false} onMenuOpenChange={() => {}} />);
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
    render(<SiteHeader menuOpen={false} onMenuOpenChange={() => {}} />);
    expect(screen.getByTestId("header-root")).toBeInTheDocument();
    expect(screen.getByTestId("header-cta-pill")).toBeInTheDocument();
    expect(screen.getByTestId("header-mobile-trigger")).toBeInTheDocument();
  });

  // E54.1 — login surfaced in the desktop bar. Per the header redesign,
  // Dokumentácia (and the Sady testov / Školenia dropdowns, theme + a11y)
  // moved OUT of the top bar into the hamburger sidebar; only the flat
  // quick-links + login + CTA stay in the bar.
  it("shows the desktop login link and keeps docs out of the top bar", () => {
    authStateRef.current = { isAuthenticated: false, isAdmin: false };
    render(<SiteHeader menuOpen={false} onMenuOpenChange={() => {}} />);
    expect(screen.getByTestId("header-nav-login")).toHaveAttribute("href", "/login");
    // docs lives in the sidebar now, not the top bar
    expect(screen.queryByTestId("header-nav-docs")).not.toBeInTheDocument();
  });

  it("hides the desktop login link when authenticated", () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: false };
    render(<SiteHeader menuOpen={false} onMenuOpenChange={() => {}} />);
    expect(screen.queryByTestId("header-nav-login")).not.toBeInTheDocument();
  });
});
