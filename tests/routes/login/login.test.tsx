import type { JSX } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const navigate = vi.fn();
const signInWithPassword = vi.fn();
const signInWithOAuth = vi.fn();
const rpc = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    createLazyFileRoute: () => (config: unknown) => config,
    useNavigate: () => navigate,
    Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...props}>{children}</a>
    ),
  };
});

vi.mock("@/lib/auth/mfa", () => ({
  getAALStatus: vi.fn().mockResolvedValue({ currentLevel: "aal1", nextLevel: "aal1" }),
  listFactors: vi.fn().mockResolvedValue({ totp: [] }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
      signInWithOAuth: (...args: unknown[]) => signInWithOAuth(...args),
    },
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

import { Route } from "@/routes/login.lazy";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/login — email/password form", () => {
  beforeEach(() => {
    navigate.mockReset();
    signInWithPassword.mockReset();
    signInWithOAuth.mockReset();
    rpc.mockReset();
    // Default: non-admin → /app.
    rpc.mockResolvedValue({ data: false, error: null });
  });

  it("AUTH-LOGIN-01: invalid credentials surface the Slovak invalid-creds error", async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "Invalid login credentials", status: 400 },
    });
    render(<Page />);
    fireEvent.change(screen.getByTestId("login-email-input"), {
      target: { value: "wrong@example.com" },
    });
    fireEvent.change(screen.getByTestId("login-password-input"), {
      target: { value: "badpass" },
    });
    fireEvent.click(screen.getByTestId("login-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("login-error-message").textContent).toBe(
        "Neplatný e-mail alebo heslo.",
      );
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("AUTH-LOGIN-02: non-invalid (e.g. rate-limit) returns the generic Slovak error", async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "Too many requests", status: 429 },
    });
    render(<Page />);
    fireEvent.change(screen.getByTestId("login-email-input"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByTestId("login-password-input"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByTestId("login-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("login-error-message").textContent).toBe(
        "Prihlásenie zlyhalo. Skús to znovu.",
      );
    });
    // The OAuth-collision hint is reserved for invalid-creds; rate-limit must not surface it.
    expect(screen.queryByTestId("login-oauth-collision")).not.toBeInTheDocument();
  });

  it("AUTH-LOGIN-03: submit button is disabled while sign-in is in flight", async () => {
    let resolveSignIn: (v: unknown) => void = () => {};
    signInWithPassword.mockReturnValue(
      new Promise((res) => {
        resolveSignIn = res;
      }),
    );
    render(<Page />);
    fireEvent.change(screen.getByTestId("login-email-input"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByTestId("login-password-input"), {
      target: { value: "secret" },
    });
    const button = screen.getByTestId("login-submit-button") as HTMLButtonElement;
    fireEvent.click(button);
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
    expect(button.textContent).toBe("Prihlasujem...");
    resolveSignIn({ data: { session: null, user: null }, error: null });
  });

  it("AUTH-LOGIN-04: forgot-password link points to /forgot-password", () => {
    render(<Page />);
    const link = screen.getByTestId("login-forgot-password") as HTMLAnchorElement;
    expect(link.getAttribute("to")).toBe("/forgot-password");
  });

  it("AUTH-LOGIN-05: back-home link points to '/'", () => {
    render(<Page />);
    const link = screen.getByTestId("login-back-home") as HTMLAnchorElement;
    expect(link.getAttribute("to")).toBe("/");
  });

  it("AUTH-LOGIN-06: happy path calls signInWithPassword with trimmed email + password", async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: { user: { id: "u1" } }, user: { id: "u1" } },
      error: null,
    });
    render(<Page />);
    fireEvent.change(screen.getByTestId("login-email-input"), {
      target: { value: "  user@example.com  " },
    });
    fireEvent.change(screen.getByTestId("login-password-input"), {
      target: { value: "correct-horse" },
    });
    fireEvent.click(screen.getByTestId("login-submit-button"));
    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "correct-horse",
      });
    });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ to: "/app" });
    });
  });
});
