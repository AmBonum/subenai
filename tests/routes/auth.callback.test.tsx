import type { JSX } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const navigate = vi.fn();
const exchangeCodeForSession = vi.fn();
const getSession = vi.fn();
const rpc = vi.fn();
let currentSearch: Record<string, unknown> = {};

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    useNavigate: () => navigate,
    useSearch: () => currentSearch,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => exchangeCodeForSession(...args),
      getSession: () => getSession(),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn(),
        listFactors: vi.fn(),
      },
    },
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

import { Route } from "@/routes/auth.callback";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/auth/callback", () => {
  beforeEach(() => {
    navigate.mockReset();
    exchangeCodeForSession.mockReset();
    getSession.mockReset();
    rpc.mockReset();
    // Default: non-admin (decidePostLoginTarget → /app).
    rpc.mockResolvedValue({ data: false, error: null });
    currentSearch = {};
  });

  it("exchanges the PKCE code and navigates to /app on success", async () => {
    currentSearch = { code: "pkce-code-123" };
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    render(<Page />);
    expect(screen.getByTestId("auth-callback-loading")).toBeInTheDocument();
    await waitFor(() => {
      expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code-123");
    });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ to: "/app" });
    });
  });

  it("honours a safe ?redirect= target", async () => {
    currentSearch = { code: "c2", redirect: "/app/tests" };
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    render(<Page />);
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ to: "/app/tests" });
    });
  });

  it("shows the error state when ?error= is present", async () => {
    currentSearch = { error: "access_denied", error_description: "User cancelled" };
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByTestId("auth-callback-error")).toBeInTheDocument();
    });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("AUTH-CB-01: error from provider renders the Slovak error and bounces to /login", async () => {
    vi.useFakeTimers();
    try {
      currentSearch = { error: "access_denied", error_description: "User cancelled" };
      render(<Page />);
      await vi.waitFor(() => {
        expect(screen.getByTestId("auth-callback-error").textContent).toBe(
          "Prihlásenie zlyhalo. Skús to znovu.",
        );
      });
      vi.advanceTimersByTime(1600);
      await vi.waitFor(() => {
        expect(navigate).toHaveBeenCalledWith({ to: "/login" });
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("AUTH-CB-02: renders the loading spinner copy before the exchange resolves", () => {
    currentSearch = { code: "pkce-pending" };
    // Leave exchangeCodeForSession unresolved so the loading state is observable.
    exchangeCodeForSession.mockReturnValue(new Promise(() => {}));
    render(<Page />);
    expect(screen.getByTestId("auth-callback-loading").textContent).toBe("Overujem prihlásenie...");
    expect(screen.queryByTestId("auth-callback-error")).not.toBeInTheDocument();
  });

  it("AUTH-CB-03: missing session after exchange shows the error then bounces to /login", async () => {
    vi.useFakeTimers();
    try {
      currentSearch = { code: "no-session-code" };
      exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
      getSession.mockResolvedValue({ data: { session: null } });
      render(<Page />);
      await vi.waitFor(() => {
        expect(screen.getByTestId("auth-callback-error")).toBeInTheDocument();
      });
      vi.advanceTimersByTime(1600);
      await vi.waitFor(() => {
        expect(navigate).toHaveBeenCalledWith({ to: "/login" });
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("AUTH-CB-04: ignores an off-site ?redirect= (not starting with '/') and falls back to /app", async () => {
    currentSearch = { code: "c3", redirect: "https://evil.example/admin" };
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    render(<Page />);
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ to: "/app" });
    });
    // Critical: the open-redirect attempt must not appear in any navigate call.
    for (const call of navigate.mock.calls) {
      const arg = call[0] as { to?: string };
      expect(arg.to).not.toContain("evil.example");
    }
  });
});
