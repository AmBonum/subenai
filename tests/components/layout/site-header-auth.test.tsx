import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render as rtlRender, screen } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const render = (ui: Parameters<typeof rtlRender>[0]) => rtlRender(ui, { wrapper: ThemeProvider });

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
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...(rest as Record<string, unknown>)}>{children}</a>
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
});
