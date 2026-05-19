import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
    useLocation: () => ({ pathname: "/app/legal/dsr" }),
  };
});

import { Route } from "@/routes/app.legal.dsr";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/legal/dsr", () => {
  it("renders title, form fields and submit button", () => {
    render(<Page />);
    expect(screen.getByTestId("app-legal-dsr-root")).toBeInTheDocument();
    expect(screen.getByTestId("app-legal-dsr-title")).toBeInTheDocument();
    expect(screen.getByTestId("dsr-form-type-select")).toBeInTheDocument();
    expect(screen.getByTestId("dsr-form-subject-input")).toBeInTheDocument();
    expect(screen.getByTestId("dsr-form-details-textarea")).toBeInTheDocument();
    expect(screen.getByTestId("dsr-form-submit-button")).toBeInTheDocument();
  });

  it("submitting without a valid e-mail shows the error banner", () => {
    render(<Page />);
    fireEvent.click(screen.getByTestId("dsr-form-submit-button"));
    expect(screen.getByTestId("dsr-form-error-banner")).toBeInTheDocument();
    expect(screen.queryByTestId("dsr-form-success-banner")).toBeNull();
  });

  it("submitting with a valid e-mail shows success banner and appends to history", async () => {
    render(<Page />);
    const email = screen.getByTestId("dsr-form-subject-input") as HTMLInputElement;
    fireEvent.change(email, { target: { value: "test-user-7-1@example.sk" } });
    fireEvent.click(screen.getByTestId("dsr-form-submit-button"));
    const banner = await screen.findByTestId("dsr-form-success-banner");
    expect(banner).toBeInTheDocument();
    const history = screen.getByTestId("app-legal-dsr-history-card");
    expect(await within(history).findByText(/test-user-7-1@example.sk/)).toBeInTheDocument();
  });
});
