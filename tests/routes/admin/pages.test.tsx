import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

beforeAll(() => {
  if (typeof window !== "undefined" && !window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
});

const navigateSpy = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    useNavigate: () => navigateSpy,
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...(rest as Record<string, unknown>)}>{children}</a>
    ),
  };
});

import { Route } from "@/routes/admin/pages";
import { resetCmsStoresForTests } from "@/lib/admin/cms-mock-store";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/pages", () => {
  beforeEach(() => {
    resetCmsStoresForTests();
    navigateSpy.mockReset();
  });

  it("renders seeded rows", () => {
    render(<Page />);
    expect(screen.getByTestId("cms-pages-list-row-pg_o_projekte")).toBeInTheDocument();
    expect(screen.getByTestId("cms-pages-list-row-pg_draft_skoly")).toBeInTheDocument();
  });

  it("status filter narrows the list", () => {
    render(<Page />);
    const trigger = screen.getByTestId("cms-pages-list-status-filter");
    fireEvent.click(trigger);
    const draftOption = screen.getByRole("option", { name: /Koncept/i });
    fireEvent.click(draftOption);
    expect(screen.queryByTestId("cms-pages-list-row-pg_o_projekte")).not.toBeInTheDocument();
    expect(screen.getByTestId("cms-pages-list-row-pg_draft_skoly")).toBeInTheDocument();
  });

  it("search narrows by title", () => {
    render(<Page />);
    const input = screen.getByTestId("cms-pages-list-search-input");
    fireEvent.change(input, { target: { value: "školy" } });
    expect(screen.queryByTestId("cms-pages-list-row-pg_o_projekte")).not.toBeInTheDocument();
    expect(screen.getByTestId("cms-pages-list-row-pg_draft_skoly")).toBeInTheDocument();
  });

  it("search narrows by slug", () => {
    render(<Page />);
    const input = screen.getByTestId("cms-pages-list-search-input");
    fireEvent.change(input, { target: { value: "o-projekte" } });
    expect(screen.getByTestId("cms-pages-list-row-pg_o_projekte")).toBeInTheDocument();
    expect(screen.queryByTestId("cms-pages-list-row-pg_draft_skoly")).not.toBeInTheDocument();
  });

  it("new-page button creates a draft and navigates", () => {
    render(<Page />);
    fireEvent.click(screen.getByTestId("cms-pages-list-new-button"));
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    const arg = navigateSpy.mock.calls[0][0] as { to: string; params: { pageId: string } };
    expect(arg.to).toBe("/admin/pages/$pageId");
    expect(arg.params.pageId).toMatch(/^pg_/);
  });
});
