import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
  };
});

import { Route } from "@/routes/admin/categories";
import { adminRepo } from "@/lib/admin/mock-store";
import { adminMockRecorded, resetAdminMockRecorded } from "../../utils/admin-supabase-mock";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

describe("/admin/categories", () => {
  it("renders branches and topics lists with seeded rows", () => {
    render(<Page />);
    expect(screen.getByTestId("admin-categories-page-header-root")).toBeInTheDocument();
    expect(screen.getByTestId("admin-categories-branches-list")).toBeInTheDocument();
    expect(screen.getByTestId("admin-categories-topics-list")).toBeInTheDocument();
    const branch = adminRepo.categories.list()[0];
    const topic = adminRepo.topics.list()[0];
    expect(screen.getByTestId(`admin-categories-branch-row-${branch.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`admin-categories-topic-row-${topic.id}`)).toBeInTheDocument();
  });

  it("opens the branch dialog and creates a new branch via the mutation hook", async () => {
    resetAdminMockRecorded();
    render(<Page />);
    fireEvent.click(screen.getByTestId("admin-categories-new-branch-button"));
    const name = screen.getByTestId("category-dialog-name-input") as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Testovacia branža" } });
    fireEvent.click(screen.getByTestId("category-dialog-save-button"));
    await waitFor(() => {
      const inserts = adminMockRecorded.inserts.filter((i) => i.table === "categories");
      expect(inserts.length).toBe(1);
      expect(inserts[0].values.name).toBe("Testovacia branža");
    });
  });

  it("blocks deletion of a branch that has topics, surfacing the inline error", () => {
    resetAdminMockRecorded();
    // Seed a branch + a topic under it so the guard triggers. The component
    // still reads through `useAdminCategories/useAdminTopics`, whose mock
    // pre-seeds from mock-store, so writing to mock-store here is the right
    // setup hook for the in-memory tables.
    const branch = adminRepo.categories.create({
      name: "Bezpečnostná branža",
      slug: "test-branch",
      description: "",
      color: "#ff0000",
    });
    adminRepo.topics.create({
      name: "Téma pod branžou",
      slug: "test-branch-tema",
      description: "",
      color: "#00ff00",
    });
    render(<Page />);
    fireEvent.click(screen.getByTestId(`admin-categories-branch-row-delete-${branch.id}`));
    const confirm = screen.getByRole("button", { name: /vymazať/i });
    fireEvent.click(confirm);
    expect(screen.getByTestId("admin-categories-delete-error")).toBeInTheDocument();
    // Mutation hook was NOT invoked — the guard short-circuited the delete.
    const deletes = adminMockRecorded.deletes.filter((d) => d.table === "categories");
    expect(deletes.length).toBe(0);
  });
});
