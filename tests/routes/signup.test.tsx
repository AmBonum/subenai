import type { JSX } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const signUp = vi.fn();
const signInWithOAuth = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    createLazyFileRoute: () => (config: unknown) => config,
    Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...props}>{children}</a>
    ),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => signUp(...args),
      signInWithOAuth: (...args: unknown[]) => signInWithOAuth(...args),
    },
  },
}));

import { Route } from "@/routes/signup.lazy";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/signup", () => {
  beforeEach(() => {
    signUp.mockReset();
    signInWithOAuth.mockReset();
  });

  it("submits successfully and shows the verification message", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    render(<Page />);
    fireEvent.change(screen.getByTestId("signup-email-input"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByTestId("signup-password-input"), {
      target: { value: "Strong#Pass1234" },
    });
    fireEvent.change(screen.getByTestId("signup-password-confirm-input"), {
      target: { value: "Strong#Pass1234" },
    });
    fireEvent.click(screen.getByTestId("signup-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("signup-success-message")).toBeInTheDocument();
    });
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        password: "Strong#Pass1234",
      }),
    );
  });

  it("flags a password mismatch before calling supabase", async () => {
    render(<Page />);
    fireEvent.change(screen.getByTestId("signup-email-input"), {
      target: { value: "x@example.com" },
    });
    fireEvent.change(screen.getByTestId("signup-password-input"), {
      target: { value: "Strong#Pass1234" },
    });
    fireEvent.change(screen.getByTestId("signup-password-confirm-input"), {
      target: { value: "Different#Pass99" },
    });
    fireEvent.click(screen.getByTestId("signup-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("signup-error-message").textContent).toBe("Heslá sa nezhodujú.");
    });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("surfaces the email-already-registered error", async () => {
    signUp.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered", status: 400 },
    });
    render(<Page />);
    fireEvent.change(screen.getByTestId("signup-email-input"), {
      target: { value: "dup@example.com" },
    });
    fireEvent.change(screen.getByTestId("signup-password-input"), {
      target: { value: "Strong#Pass1234" },
    });
    fireEvent.change(screen.getByTestId("signup-password-confirm-input"), {
      target: { value: "Strong#Pass1234" },
    });
    fireEvent.click(screen.getByTestId("signup-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("signup-error-message").textContent).toBe(
        "Tento e-mail je už registrovaný.",
      );
    });
  });

  it("blocks weak passwords client-side before calling supabase", async () => {
    render(<Page />);
    fireEvent.change(screen.getByTestId("signup-email-input"), {
      target: { value: "weak@example.com" },
    });
    fireEvent.change(screen.getByTestId("signup-password-input"), {
      target: { value: "abc" },
    });
    fireEvent.change(screen.getByTestId("signup-password-confirm-input"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByTestId("signup-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("signup-error-message").textContent).toBe(
        "Heslo je príliš slabé. Použi aspoň 8 znakov.",
      );
    });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("Google button calls signInWithOAuth with provider=google", async () => {
    signInWithOAuth.mockResolvedValue({
      data: { url: "https://accounts.google.com" },
      error: null,
    });
    render(<Page />);
    fireEvent.click(screen.getByTestId("signup-google-button"));
    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }));
    });
  });

  it("AUTH-SIGNUP-03: disables the submit button while signUp is in flight", async () => {
    let resolveSignUp: (v: unknown) => void = () => {};
    signUp.mockReturnValue(
      new Promise((res) => {
        resolveSignUp = res;
      }),
    );
    render(<Page />);
    fireEvent.change(screen.getByTestId("signup-email-input"), {
      target: { value: "slow@example.com" },
    });
    fireEvent.change(screen.getByTestId("signup-password-input"), {
      target: { value: "Strong#Pass1234" },
    });
    fireEvent.change(screen.getByTestId("signup-password-confirm-input"), {
      target: { value: "Strong#Pass1234" },
    });
    const button = screen.getByTestId("signup-submit-button") as HTMLButtonElement;
    fireEvent.click(button);
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
    expect(button.textContent).toBe("Vytváram účet...");
    resolveSignUp({ data: { user: { id: "u1" } }, error: null });
  });

  it("AUTH-SIGNUP-04: passes emailRedirectTo pointing at /auth/callback on the current origin", async () => {
    signUp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    render(<Page />);
    fireEvent.change(screen.getByTestId("signup-email-input"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByTestId("signup-password-input"), {
      target: { value: "Strong#Pass1234" },
    });
    fireEvent.change(screen.getByTestId("signup-password-confirm-input"), {
      target: { value: "Strong#Pass1234" },
    });
    fireEvent.click(screen.getByTestId("signup-submit-button"));
    await waitFor(() => {
      expect(signUp).toHaveBeenCalledTimes(1);
    });
    const arg = signUp.mock.calls[0][0] as {
      email: string;
      password: string;
      options?: { emailRedirectTo?: string };
    };
    expect(arg.options?.emailRedirectTo).toBe(`${window.location.origin}/auth/callback`);
  });
});
