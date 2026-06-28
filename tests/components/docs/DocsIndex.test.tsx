import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { expectNoA11yViolations } from "../../utils/axe";

const authStateRef = { current: { isAuthenticated: false, isAdmin: false } };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => authStateRef.current }));

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({
      children,
      to,
      params,
      ...rest
    }: {
      children: React.ReactNode;
      to?: string;
      params?: { slug?: string };
    } & Record<string, unknown>) => (
      <a
        href={params?.slug ? `${to}`.replace("$slug", params.slug) : to}
        {...(rest as Record<string, unknown>)}
      >
        {children}
      </a>
    ),
  };
});

import { DocsIndex } from "@/components/docs/DocsIndex";

describe("DocsIndex", () => {
  it("lists public sections and hides the app-docs link when signed out", () => {
    authStateRef.current = { isAuthenticated: false, isAdmin: false };
    render(<DocsIndex />);
    expect(screen.getByTestId("docs-index-root")).toBeInTheDocument();
    expect(screen.getAllByTestId("docs-index-section-link").length).toBeGreaterThanOrEqual(6);
    expect(screen.queryByTestId("docs-index-app-link")).toBeNull();
  });

  it("shows the app-docs link when signed in", () => {
    authStateRef.current = { isAuthenticated: true, isAdmin: false };
    render(<DocsIndex />);
    expect(screen.getByTestId("docs-index-app-link")).toHaveAttribute(
      "href",
      "/docs/app/dashboard",
    );
  });

  it("has no a11y violations", async () => {
    authStateRef.current = { isAuthenticated: false, isAdmin: false };
    const { container } = render(<DocsIndex />);
    await expectNoA11yViolations(container);
  });
});
