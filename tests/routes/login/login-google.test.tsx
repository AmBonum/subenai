import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const signInWithOAuth = vi.fn();
const signInWithPassword = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    useNavigate: () => vi.fn(),
    Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...props}>{children}</a>
    ),
  };
});

vi.mock("@/lib/auth/mfa", () => ({
  getAALStatus: vi.fn(),
  listFactors: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
      signInWithOAuth: (...args: unknown[]) => signInWithOAuth(...args),
    },
    rpc: vi.fn(),
  },
}));

import { Route } from "@/routes/login";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/login — Google + forgot-password links", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    signInWithPassword.mockReset();
  });

  it("clicking the Google button calls signInWithOAuth with provider=google", async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: "https://example" }, error: null });
    render(<Page />);
    fireEvent.click(screen.getByTestId("login-google-button"));
    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }));
    });
  });

  it("renders forgot-password and signup links", () => {
    render(<Page />);
    expect(screen.getByTestId("login-forgot-password")).toBeInTheDocument();
    expect(screen.getByTestId("login-to-signup")).toBeInTheDocument();
  });
});
