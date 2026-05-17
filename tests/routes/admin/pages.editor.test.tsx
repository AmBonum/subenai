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
    useNavigate: () => vi.fn(),
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...(rest as Record<string, unknown>)}>{children}</a>
    ),
  };
});

import { Route } from "@/routes/admin/pages.$pageId";
import { cmsPagesStore, resetCmsStoresForTests, seedPages } from "@/lib/admin/cms-mock-store";

type RouteConfig = { component: () => JSX.Element };
const Editor = (Route as unknown as RouteConfig).component;

function setPageId(id: string) {
  paramsRef.current = { pageId: id };
}

describe("/admin/pages/$pageId", () => {
  beforeEach(() => {
    resetCmsStoresForTests();
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

  it("add-block appends a new block at the end", () => {
    render(<Editor />);
    const before = cmsPagesStore.get().find((p) => p.id === "pg_o_projekte")!.content_blocks.length;
    fireEvent.click(screen.getByTestId("cms-page-editor-add-block"));
    const after = cmsPagesStore.get().find((p) => p.id === "pg_o_projekte")!.content_blocks.length;
    expect(after).toBe(before + 1);
  });

  it("reorder moves a block up", () => {
    render(<Editor />);
    const page = cmsPagesStore.get().find((p) => p.id === "pg_o_projekte")!;
    const first = page.content_blocks[0].id;
    const second = page.content_blocks[1].id;
    fireEvent.click(screen.getByTestId("cms-page-editor-block-1-move-up"));
    const reordered = cmsPagesStore.get().find((p) => p.id === "pg_o_projekte")!.content_blocks;
    expect(reordered[0].id).toBe(second);
    expect(reordered[1].id).toBe(first);
  });

  it("delete removes a block", () => {
    render(<Editor />);
    const before = cmsPagesStore.get().find((p) => p.id === "pg_o_projekte")!.content_blocks.length;
    fireEvent.click(screen.getByTestId("cms-page-editor-block-0-remove"));
    const after = cmsPagesStore.get().find((p) => p.id === "pg_o_projekte")!.content_blocks.length;
    expect(after).toBe(before - 1);
  });

  it("publish sets published_at; unpublish clears it", () => {
    setPageId("pg_draft_skoly");
    render(<Editor />);
    fireEvent.click(screen.getByTestId("cms-page-editor-publish"));
    const after = cmsPagesStore.get().find((p) => p.id === "pg_draft_skoly")!;
    expect(after.status).toBe("published");
    expect(after.published_at).not.toBeNull();
    fireEvent.click(screen.getByTestId("cms-page-editor-unpublish"));
    const reverted = cmsPagesStore.get().find((p) => p.id === "pg_draft_skoly")!;
    expect(reverted.status).toBe("draft");
    expect(reverted.published_at).toBeNull();
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
});
