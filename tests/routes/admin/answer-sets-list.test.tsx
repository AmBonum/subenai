import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    createLazyFileRoute: () => (config: unknown) => config,
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

import { Route } from "@/routes/admin/answer-sets.index.lazy";
import { adminRepo } from "@/lib/admin/mock-store";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/answer-sets list", () => {
  it("renders the page header, new button and seeded rows", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-answer-sets-root")).toBeInTheDocument();
    expect(screen.getByTestId("answer-sets-list-new-button")).toBeInTheDocument();
    const seeded = adminRepo.answerSets.list();
    expect(seeded.length).toBeGreaterThan(0);
    expect(screen.getByTestId(`answer-sets-list-row-${seeded[0].id}`)).toBeInTheDocument();
  });

  it("filters by title via the search input", () => {
    render(<Page />);
    const search = screen.getByTestId("answer-sets-list-search") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "___no-match-xyzzy-zzz___" } });
    expect(screen.getByTestId("answer-sets-list-empty-state")).toBeInTheDocument();
  });
});
