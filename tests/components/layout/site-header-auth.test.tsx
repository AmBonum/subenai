import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

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

describe("SiteHeader auth-aware nav (AH-9.8)", () => {
  beforeEach(() => {
    authStateRef.current = { isAuthenticated: false, isAdmin: false };
  });

  it("hides the Moje testy link when unauthenticated", () => {
    authStateRef.current = { isAuthenticated: false, isAdmin: false };
    render(<SiteHeader />);
    expect(screen.queryByTestId("site-header-nav-link-app")).not.toBeInTheDocument();
  });

  it("shows the Moje testy link when authenticated", () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: false };
    render(<SiteHeader />);
    expect(screen.getByTestId("site-header-nav-link-app")).toBeInTheDocument();
    expect(screen.getByTestId("site-header-nav-link-app")).toHaveTextContent("Moje testy");
  });

  it("preserves existing test-ids regardless of auth state", () => {
    render(<SiteHeader />);
    expect(screen.getByTestId("header-root")).toBeInTheDocument();
    expect(screen.getByTestId("header-cta-pill")).toBeInTheDocument();
    expect(screen.getByTestId("header-mobile-trigger")).toBeInTheDocument();
  });
});
