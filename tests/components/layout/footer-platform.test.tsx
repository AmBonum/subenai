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

vi.mock("@/hooks/useConsent", () => ({
  useConsent: () => ({ openPreferences: () => {} }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

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

import { Footer } from "@/components/layout/Footer";

describe("Footer Platforma column (AH-9.8)", () => {
  beforeEach(() => {
    authStateRef.current = { isAuthenticated: false, isAdmin: false };
  });

  it("hides the Platforma column when unauthenticated", () => {
    authStateRef.current = { isAuthenticated: false, isAdmin: false };
    render(<Footer />);
    expect(screen.queryByTestId("footer-platform-column")).not.toBeInTheDocument();
    expect(screen.queryByTestId("footer-platform-link-app")).not.toBeInTheDocument();
    expect(screen.queryByTestId("footer-platform-link-admin")).not.toBeInTheDocument();
  });

  it("shows /app link when authenticated non-admin; hides /admin", () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: false };
    render(<Footer />);
    expect(screen.getByTestId("footer-platform-column")).toBeInTheDocument();
    expect(screen.getByTestId("footer-platform-link-app")).toBeInTheDocument();
    expect(screen.queryByTestId("footer-platform-link-admin")).not.toBeInTheDocument();
  });

  it("shows both /app and /admin when authenticated admin", () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: true };
    render(<Footer />);
    expect(screen.getByTestId("footer-platform-link-app")).toBeInTheDocument();
    expect(screen.getByTestId("footer-platform-link-admin")).toBeInTheDocument();
  });

  it("preserves existing footer test-ids regardless of auth state", () => {
    render(<Footer />);
    expect(screen.getByTestId("footer-root")).toBeInTheDocument();
    expect(screen.getByTestId("footer-column-obsah")).toBeInTheDocument();
    expect(screen.getByTestId("footer-column-projekt")).toBeInTheDocument();
    expect(screen.getByTestId("footer-column-pravne")).toBeInTheDocument();
  });
});
