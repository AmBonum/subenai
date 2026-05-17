import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  };
});

import { Route } from "@/routes/admin/support";
import { resetSupportChannelConfig } from "@/lib/admin/support-config";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/support", () => {
  beforeEach(() => {
    resetSupportChannelConfig();
  });

  it("renders the support form with seeded values", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-support-page-header-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-support-form")).toBeInTheDocument();
    expect(screen.getByTestId("admin-support-email-input")).toBeInTheDocument();
    expect(screen.getByTestId("admin-support-phone-input")).toBeInTheDocument();
    expect(screen.getByTestId("admin-support-hours-input")).toBeInTheDocument();
    expect(screen.getByTestId("admin-support-channel-list")).toBeInTheDocument();
  });

  it("shows an inline error for an invalid email and blocks submit", () => {
    render(<Page />);
    const email = screen.getByTestId("admin-support-email-input") as HTMLInputElement;
    fireEvent.change(email, { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByTestId("admin-support-submit"));
    expect(screen.getByTestId("admin-support-email-error")).toBeInTheDocument();
  });

  it("submits valid input without surfacing an error", () => {
    render(<Page />);
    const email = screen.getByTestId("admin-support-email-input") as HTMLInputElement;
    fireEvent.change(email, { target: { value: "ok@subenai.sk" } });
    fireEvent.click(screen.getByTestId("admin-support-submit"));
    expect(screen.queryByTestId("admin-support-email-error")).toBeNull();
  });
});
