import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
  };
});

import { Route } from "@/routes/app.account.security";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/account/security", () => {
  it("renders password form, sessions list, and disabled 2FA toggle", () => {
    render(<Page />);
    expect(screen.getByTestId("app-account-security-root")).toBeInTheDocument();
    expect(screen.getByTestId("app-account-security-page-header")).toBeInTheDocument();
    expect(screen.getByTestId("app-account-security-password-form")).toBeInTheDocument();
    expect(screen.getByTestId("app-account-security-sessions-list")).toBeInTheDocument();
    const toggle = screen.getByTestId("app-account-security-2fa-toggle") as HTMLButtonElement;
    expect(toggle).toBeDisabled();
  });

  it("disables submit-password until both inputs match and non-empty", () => {
    render(<Page />);
    const submit = screen.getByTestId("app-account-security-submit-password") as HTMLButtonElement;
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId("app-account-security-current-password"), {
      target: { value: "Heslo123!" },
    });
    fireEvent.change(screen.getByTestId("app-account-security-new-password"), {
      target: { value: "Heslo123!" },
    });
    expect(submit).not.toBeDisabled();
  });
});
