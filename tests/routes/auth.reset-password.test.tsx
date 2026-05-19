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
});
