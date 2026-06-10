import type { JSX } from "react";
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
    createLazyFileRoute: () => (config: unknown) => config,
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

import { Route } from "@/routes/login.lazy";
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

  it("passes a redirectTo option pointing at /auth/callback on the current origin", async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: "https://example" }, error: null });
    render(<Page />);
    fireEvent.click(screen.getByTestId("login-google-button"));
    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledTimes(1);
    });
    const arg = signInWithOAuth.mock.calls[0][0] as {
      provider: string;
      options?: { redirectTo?: string };
    };
    expect(arg.provider).toBe("google");
    expect(arg.options?.redirectTo).toBe(`${window.location.origin}/auth/callback`);
  });

  it("disables the Google button while the OAuth call is in flight", async () => {
    let resolveOAuth: (v: unknown) => void = () => {};
    signInWithOAuth.mockReturnValue(
      new Promise((res) => {
        resolveOAuth = res;
      }),
    );
    render(<Page />);
    const button = screen.getByTestId("login-google-button") as HTMLButtonElement;
    fireEvent.click(button);
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
    resolveOAuth({ data: { url: "https://example" }, error: null });
  });

  it("shows the generic Slovak error and re-enables the button on OAuth throw", async () => {
    signInWithOAuth.mockRejectedValue(new Error("network down"));
    render(<Page />);
    const button = screen.getByTestId("login-google-button") as HTMLButtonElement;
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByTestId("login-error-message").textContent).toBe(
        "Prihlásenie cez Google zlyhalo. Skús to znovu.",
      );
    });
    expect(button).not.toBeDisabled();
  });

  it("renders the back-home link pointing to '/'", () => {
    render(<Page />);
    const back = screen.getByTestId("login-back-home") as HTMLAnchorElement;
    expect(back).toBeInTheDocument();
    expect(back.getAttribute("to")).toBe("/");
  });
});
