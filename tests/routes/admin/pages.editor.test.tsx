import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
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

const paramsRef = { current: { pageId: "pg_o_projekte" } };

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => {
      const c = config as { component: () => JSX.Element };
      return {
        ...c,
        useParams: () => paramsRef.current,
      };
    },
    createLazyFileRoute: () => (config: unknown) => {
      const c = config as { component: () => JSX.Element };
      return {
        ...c,
        useParams: () => paramsRef.current,
      };
    },
    useNavigate: () => vi.fn(),
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...(rest as Record<string, unknown>)}>{children}</a>
    ),
  };
});

import { Route } from "@/routes/admin/pages.$pageId.lazy";
import { seedPages } from "@/lib/admin/cms-mock-store";
import {
  adminMockRecorded,
  adminMockTables,
  resetAdminMockRecorded,
  resetAdminMockTables,
} from "../../utils/admin-supabase-mock";

type RouteConfig = { component: () => JSX.Element };
const Editor = (Route as unknown as RouteConfig).component;

function setPageId(id: string) {
  paramsRef.current = { pageId: id };
}

function pageRow(id: string) {
  return adminMockTables.cms_pages.rows.find((r) => r.id === id);
}

describe("/admin/pages/$pageId", () => {
  beforeEach(() => {
    resetAdminMockTables();
    resetAdminMockRecorded();
    setPageId("pg_o_projekte");
  });

  it("renders 404-style state when page id is unknown", () => {
    setPageId("pg_does_not_exist");
    render(<Editor />);
    expect(screen.getByTestId("cms-page-editor-not-found")).toBeInTheDocument();
  });

  it("renders title, slug and all seeded blocks", () => {
    render(<Editor />);
    const titleInput = screen.getByTestId("cms-page-editor-title-input") as HTMLInputElement;
    expect(titleInput.value).toBe("O projekte — rozšírené");
    const slugInput = screen.getByTestId("cms-page-editor-slug-input") as HTMLInputElement;
    expect(slugInput.value).toBe("o-projekte-rozsirene");
    expect(screen.getByTestId("cms-page-editor-block-0")).toBeInTheDocument();
    expect(screen.getByTestId("cms-page-editor-block-1")).toBeInTheDocument();
    expect(screen.getByTestId("cms-page-editor-block-2")).toBeInTheDocument();
  });

  it("add-block appends a new block at the end", async () => {
    render(<Editor />);
    const before = (pageRow("pg_o_projekte")!.blocks as unknown[]).length;
    fireEvent.click(screen.getByTestId("cms-page-editor-add-block"));
    await waitFor(() =>
      expect((pageRow("pg_o_projekte")!.blocks as unknown[]).length).toBe(before + 1),
    );
  });

  it("reorder moves a block up", async () => {
    render(<Editor />);
    const before = pageRow("pg_o_projekte")!.blocks as Array<{ id: string }>;
    const first = before[0].id;
    const second = before[1].id;
    fireEvent.click(screen.getByTestId("cms-page-editor-block-1-move-up"));
    await waitFor(() => {
      const reordered = pageRow("pg_o_projekte")!.blocks as Array<{ id: string }>;
      expect(reordered[0].id).toBe(second);
      expect(reordered[1].id).toBe(first);
    });
  });

  it("delete removes a block", async () => {
    render(<Editor />);
    const before = (pageRow("pg_o_projekte")!.blocks as unknown[]).length;
    fireEvent.click(screen.getByTestId("cms-page-editor-block-0-remove"));
    await waitFor(() =>
      expect((pageRow("pg_o_projekte")!.blocks as unknown[]).length).toBe(before - 1),
    );
  });

  it("publish sets published_at; unpublish clears it", async () => {
    setPageId("pg_draft_skoly");
    render(<Editor />);
    fireEvent.click(screen.getByTestId("cms-page-editor-publish"));
    await waitFor(() => {
      const afterRow = pageRow("pg_draft_skoly")!;
      expect(afterRow.status).toBe("published");
      expect(afterRow.published_at).not.toBeNull();
    });
    fireEvent.click(screen.getByTestId("cms-page-editor-unpublish"));
    await waitFor(() => {
      const revertedRow = pageRow("pg_draft_skoly")!;
      expect(revertedRow.status).toBe("draft");
      expect(revertedRow.published_at).toBeNull();
    });
  });

  it("slug validation rejects invalid characters and disables save", () => {
    render(<Editor />);
    const slugInput = screen.getByTestId("cms-page-editor-slug-input") as HTMLInputElement;
    fireEvent.change(slugInput, { target: { value: "Bad Slug!" } });
    expect(screen.getByTestId("cms-page-editor-slug-error")).toBeInTheDocument();
    const save = screen.getByTestId("cms-page-editor-save") as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it("title required validation", () => {
    render(<Editor />);
    const titleInput = screen.getByTestId("cms-page-editor-title-input") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "" } });
    expect(screen.getByTestId("cms-page-editor-title-error")).toBeInTheDocument();
  });

  it("seed shape sanity: pg_o_projekte exists", () => {
    expect(seedPages.find((p) => p.id === "pg_o_projekte")).toBeDefined();
  });

  it("editor mutations are recorded against cms_pages", async () => {
    render(<Editor />);
    fireEvent.click(screen.getByTestId("cms-page-editor-add-block"));
    await waitFor(() => {
      const updates = adminMockRecorded.updates.filter((u) => u.table === "cms_pages");
      expect(updates.length).toBeGreaterThan(0);
    });
  });
});
