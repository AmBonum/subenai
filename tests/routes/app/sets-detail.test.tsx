import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    Link: ({
      to,
      params,
      children,
      ...rest
    }: {
      to: string;
      params?: Record<string, string>;
      children: React.ReactNode;
    } & React.HTMLAttributes<HTMLAnchorElement>) => (
      <a href={params ? to.replace(/\$(\w+)/g, (_, k) => params[k] ?? "") : to} {...rest}>
        {children}
      </a>
    ),
  };
});

import { Route } from "@/routes/app.sets.$setId";
type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

function renderWithParams(setId: string) {
  (Route as unknown as { useParams: () => { setId: string } }).useParams = () => ({ setId });
  return render(<Page />);
}

describe("/app/sets/$setId", () => {
  it("renders correct + incorrect columns for a seeded set", () => {
    renderWithParams("as_001");
    expect(screen.getByTestId("set-detail-root")).toBeInTheDocument();
    expect(screen.getByTestId("set-detail-title")).toBeInTheDocument();
    expect(screen.getByTestId("set-detail-correct-column")).toBeInTheDocument();
    expect(screen.getByTestId("set-detail-incorrect-column")).toBeInTheDocument();
    expect(screen.getByTestId("set-detail-back-button")).toBeInTheDocument();
    expect(screen.queryByTestId("set-detail-not-found")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId(/^set-detail-correct-row-/).length).toBeGreaterThan(0);
  });

  it("renders the not-found state for an unknown setId", () => {
    renderWithParams("as_does_not_exist");
    expect(screen.getByTestId("set-detail-not-found")).toBeInTheDocument();
    expect(screen.getByTestId("set-detail-back-button")).toBeInTheDocument();
    expect(screen.queryByTestId("set-detail-correct-column")).not.toBeInTheDocument();
  });
});
