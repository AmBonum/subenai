import { describe, it, expect, vi } from "vitest";
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

import { Route } from "@/routes/app.account.profile";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/app/account/profile", () => {
  it("renders the profile form and primary fields", () => {
    render(<Page />);
    expect(screen.getByTestId("app-account-profile-root")).toBeInTheDocument();
    expect(screen.getByTestId("app-account-profile-page-header")).toBeInTheDocument();
    expect(screen.getByTestId("app-account-profile-form")).toBeInTheDocument();
    expect(screen.getByTestId("app-account-profile-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("app-account-profile-email-input")).toBeInTheDocument();
    expect(screen.getByTestId("app-account-profile-submit")).toBeInTheDocument();
  });

  it("shows the dirty badge when the name input changes", () => {
    render(<Page />);
    const name = screen.getByTestId("app-account-profile-name-input") as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Nove Meno Test" } });
    expect(screen.getByTestId("app-account-profile-badge-dirty")).toBeInTheDocument();
  });

  it("shows a validation error when name is too short on submit", () => {
    render(<Page />);
    const name = screen.getByTestId("app-account-profile-name-input") as HTMLInputElement;
    fireEvent.change(name, { target: { value: "A" } });
    fireEvent.click(screen.getByTestId("app-account-profile-submit"));
    expect(screen.getByTestId("app-account-profile-name-error")).toBeInTheDocument();
  });
});
