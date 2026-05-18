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
});
