import type { JSX } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const navigate = vi.fn();
const updateUser = vi.fn();
const getSession = vi.fn();
const unsubscribe = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    useNavigate: () => navigate,
    Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...props}>{children}</a>
    ),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      updateUser: (...args: unknown[]) => updateUser(...args),
      getSession: () => getSession(),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe } },
      }),
    },
  },
}));

import { Route } from "@/routes/auth.reset-password";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/auth/reset-password", () => {
  beforeEach(() => {
    navigate.mockReset();
    updateUser.mockReset();
    getSession.mockReset();
  });

  it("updates the password and navigates to /login on success", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    updateUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    render(<Page />);
    await waitFor(() => screen.getByTestId("reset-form"));
    fireEvent.change(screen.getByTestId("reset-password-input"), {
      target: { value: "Strong#Pass1234" },
    });
    fireEvent.change(screen.getByTestId("reset-password-confirm-input"), {
      target: { value: "Strong#Pass1234" },
    });
    fireEvent.click(screen.getByTestId("reset-submit-button"));
    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith({ password: "Strong#Pass1234" });
    });
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        expect.objectContaining({ to: "/login", search: { reset: "1" } }),
      );
    });
  });

  it("flags a password mismatch before calling supabase", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    render(<Page />);
    await waitFor(() => screen.getByTestId("reset-form"));
    fireEvent.change(screen.getByTestId("reset-password-input"), {
      target: { value: "Strong#Pass1234" },
    });
    fireEvent.change(screen.getByTestId("reset-password-confirm-input"), {
      target: { value: "Other#Password99" },
    });
    fireEvent.click(screen.getByTestId("reset-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("reset-error-message").textContent).toBe("Heslá sa nezhodujú.");
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("shows the no-session message when the recovery link expired", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByTestId("reset-no-session")).toBeInTheDocument();
    });
  });

  it("AUTH-RESET-01: blocks weak passwords client-side before calling supabase", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    render(<Page />);
    await waitFor(() => screen.getByTestId("reset-form"));
    fireEvent.change(screen.getByTestId("reset-password-input"), {
      target: { value: "abc" },
    });
    fireEvent.change(screen.getByTestId("reset-password-confirm-input"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByTestId("reset-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("reset-error-message").textContent).toBe(
        "Heslo je príliš slabé. Použi aspoň 8 znakov.",
      );
    });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("AUTH-RESET-02: disables the submit button while updateUser is in flight", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    let resolveUpdate: (v: unknown) => void = () => {};
    updateUser.mockReturnValue(
      new Promise((res) => {
        resolveUpdate = res;
      }),
    );
    render(<Page />);
    await waitFor(() => screen.getByTestId("reset-form"));
    fireEvent.change(screen.getByTestId("reset-password-input"), {
      target: { value: "Strong#Pass1234" },
    });
    fireEvent.change(screen.getByTestId("reset-password-confirm-input"), {
      target: { value: "Strong#Pass1234" },
    });
    const button = screen.getByTestId("reset-submit-button") as HTMLButtonElement;
    fireEvent.click(button);
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
    expect(button.textContent).toBe("Ukladám...");
    resolveUpdate({ data: { user: { id: "u1" } }, error: null });
  });

  it("AUTH-RESET-03: surfaces the generic Slovak error when updateUser fails", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Session expired", status: 401 },
    });
    render(<Page />);
    await waitFor(() => screen.getByTestId("reset-form"));
    fireEvent.change(screen.getByTestId("reset-password-input"), {
      target: { value: "Strong#Pass1234" },
    });
    fireEvent.change(screen.getByTestId("reset-password-confirm-input"), {
      target: { value: "Strong#Pass1234" },
    });
    fireEvent.click(screen.getByTestId("reset-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("reset-error-message").textContent).toBe(
        "Zmena hesla zlyhala. Skús to znovu.",
      );
    });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("AUTH-RESET-04: no-session view links back to /forgot-password to request a fresh link", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByTestId("reset-no-session")).toBeInTheDocument();
    });
    const link = screen.getByTestId("reset-to-forgot") as HTMLAnchorElement;
    expect(link.getAttribute("to")).toBe("/forgot-password");
  });
});
