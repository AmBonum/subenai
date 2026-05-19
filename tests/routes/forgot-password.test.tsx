import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const resetPasswordForEmail = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    Link: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...props}>{children}</a>
    ),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: (...args: unknown[]) => resetPasswordForEmail(...args),
    },
  },
}));

import { Route } from "@/routes/forgot-password";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/forgot-password", () => {
  beforeEach(() => {
    resetPasswordForEmail.mockReset();
  });

  it("submits and shows the success message", async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    render(<Page />);
    fireEvent.change(screen.getByTestId("forgot-email-input"), {
      target: { value: "lost@example.com" },
    });
    fireEvent.click(screen.getByTestId("forgot-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("forgot-success-message")).toBeInTheDocument();
    });
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      "lost@example.com",
      expect.objectContaining({ redirectTo: expect.stringContaining("/auth/reset-password") }),
    );
  });

  it("renders an error when supabase returns one", async () => {
    resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: { message: "rate limit", status: 429 },
    });
    render(<Page />);
    fireEvent.change(screen.getByTestId("forgot-email-input"), {
      target: { value: "x@example.com" },
    });
    fireEvent.click(screen.getByTestId("forgot-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("forgot-error-message")).toBeInTheDocument();
    });
  });

  it("AUTH-FORGOT-01: submit button is disabled when email field is empty", () => {
    render(<Page />);
    const button = screen.getByTestId("forgot-submit-button") as HTMLButtonElement;
    expect(button).toBeDisabled();
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("AUTH-FORGOT-02: passes redirectTo pointing at /auth/reset-password on the current origin", async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    render(<Page />);
    fireEvent.change(screen.getByTestId("forgot-email-input"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByTestId("forgot-submit-button"));
    await waitFor(() => {
      expect(resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        expect.objectContaining({
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }),
      );
    });
  });

  it("AUTH-FORGOT-03: disables the submit button while the request is in flight", async () => {
    let resolveReset: (v: unknown) => void = () => {};
    resetPasswordForEmail.mockReturnValue(
      new Promise((res) => {
        resolveReset = res;
      }),
    );
    render(<Page />);
    fireEvent.change(screen.getByTestId("forgot-email-input"), {
      target: { value: "slow@example.com" },
    });
    const button = screen.getByTestId("forgot-submit-button") as HTMLButtonElement;
    fireEvent.click(button);
    await waitFor(() => {
      expect(button).toBeDisabled();
    });
    expect(button.textContent).toBe("Posielam...");
    resolveReset({ data: {}, error: null });
  });

  it("AUTH-FORGOT-04: success state renders the spam-check copy and hides the form", async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    render(<Page />);
    fireEvent.change(screen.getByTestId("forgot-email-input"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByTestId("forgot-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("forgot-success-message")).toBeInTheDocument();
    });
    // The success body must explicitly tell the user to check spam — the user
    // never sees whether the email actually existed (anti-enumeration).
    expect(screen.getByTestId("forgot-success-message").textContent).toContain(
      "noreply@subenai.sk",
    );
    expect(screen.queryByTestId("forgot-form")).not.toBeInTheDocument();
  });
});
