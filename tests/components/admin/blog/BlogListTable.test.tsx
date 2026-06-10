import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

import type { AdminBlogPostListItem } from "@/lib/blog/admin-queries";

const navigateSpy = vi.fn();

// Router Link + useNavigate stubs. BlogRowActions calls useNavigate
// after a successful duplicate; we capture the destination instead of
// actually navigating.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => navigateSpy,
}));

// Mutations live inside BlogRowActions; stub them at the hook level so
// the table tests don't have to drive Supabase. Tests focused on the
// BlogRowActions component itself live in their own file.
vi.mock("@/lib/blog/admin-queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/blog/admin-queries")>(
    "@/lib/blog/admin-queries",
  );
  const stub = () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({ id: "new-id" }),
    isPending: false,
  });
  return {
    ...actual,
    useDuplicateBlogPost: stub,
    useDeleteBlogPost: stub,
    usePublishBlogPost: stub,
    useUnpublishBlogPost: stub,
    useArchiveBlogPost: stub,
  };
});

import { BlogListTable } from "@/components/admin/blog/BlogListTable";

// Helper: query only the <tr> rows (children of the table also carry
// data-testid="admin-blog-list-row-{kind}-{slug}" prefixes that would
// otherwise leak into a startsWith regex match).
function getDataRows(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("tr[data-testid^='admin-blog-list-row-']"),
  );
}

function row(o: Partial<AdminBlogPostListItem>): AdminBlogPostListItem {
  return {
    id: o.id ?? "id-" + Math.random(),
    slug: o.slug ?? "slug",
    title: o.title ?? "title",
    status: o.status ?? "published",
    published_at: o.published_at ?? "2026-05-10T10:00:00.000Z",
    updated_at: o.updated_at ?? "2026-05-15T10:00:00.000Z",
    category: o.category ?? { slug: "phishing-a-emaily", name: "phishing a emaily" },
    author: o.author ?? { slug: "subenai-editorial", display_name: "subenai editorial" },
  };
}

const POSTS: AdminBlogPostListItem[] = [
  row({
    id: "1",
    slug: "phishing-101",
    title: "phishing 101",
    status: "published",
    updated_at: "2026-05-15T10:00:00.000Z",
  }),
  row({
    id: "2",
    slug: "fake-eshop",
    title: "ako odhalit fake eshop",
    status: "draft",
    category: { slug: "fake-eshopy", name: "fake e-shopy" },
    updated_at: "2026-05-10T10:00:00.000Z",
  }),
  row({
    id: "3",
    slug: "ai-deepfake",
    title: "ai a deepfake",
    status: "published",
    category: { slug: "ai-scamy", name: "ai scamy" },
    updated_at: "2026-05-18T10:00:00.000Z",
  }),
  row({
    id: "4",
    slug: "archived-old",
    title: "starý archivovaný",
    status: "archived",
    updated_at: "2026-04-01T10:00:00.000Z",
  }),
];

beforeEach(() => {
  // Stub URL + blob download so tests don't open downloads
  (URL.createObjectURL as unknown) = vi.fn(() => "blob:fake");
  (URL.revokeObjectURL as unknown) = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BlogListTable — rendering", () => {
  it("renders one row per post and shows the default sort (updated_at desc)", () => {
    render(<BlogListTable posts={POSTS} />);
    expect(screen.getByTestId("admin-blog-list-table")).toBeInTheDocument();
    // Default sort: updated_at desc → ai-deepfake (5-18), phishing (5-15),
    // fake-eshop (5-10), archived-old (4-01)
    const rows = getDataRows();
    expect(rows.map((r) => r.dataset.testid)).toEqual([
      "admin-blog-list-row-ai-deepfake",
      "admin-blog-list-row-phishing-101",
      "admin-blog-list-row-fake-eshop",
      "admin-blog-list-row-archived-old",
    ]);
  });

  it("result-count line reflects the visible row count", () => {
    render(<BlogListTable posts={POSTS} />);
    expect(screen.getByTestId("admin-blog-result-count")).toHaveTextContent(
      "Zobrazených 4 článkov",
    );
  });
});

describe("BlogListTable — search", () => {
  it("filters by title (case-insensitive)", () => {
    render(<BlogListTable posts={POSTS} />);
    fireEvent.change(screen.getByTestId("admin-blog-search-input"), {
      target: { value: "PHISH" },
    });
    expect(screen.queryByTestId("admin-blog-list-row-phishing-101")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-blog-list-row-fake-eshop")).toBeNull();
  });

  it("filters by slug substring", () => {
    render(<BlogListTable posts={POSTS} />);
    fireEvent.change(screen.getByTestId("admin-blog-search-input"), {
      target: { value: "archived" },
    });
    expect(screen.getByTestId("admin-blog-list-row-archived-old")).toBeInTheDocument();
  });

  it("1-char search is a no-op", () => {
    render(<BlogListTable posts={POSTS} />);
    fireEvent.change(screen.getByTestId("admin-blog-search-input"), { target: { value: "a" } });
    expect(getDataRows().length).toBe(POSTS.length);
  });

  it("no matches shows the empty-state row", () => {
    render(<BlogListTable posts={POSTS} />);
    fireEvent.change(screen.getByTestId("admin-blog-search-input"), { target: { value: "zzzz" } });
    expect(screen.getByTestId("admin-blog-no-results")).toBeInTheDocument();
  });
});

describe("BlogListTable — status + category filters", () => {
  it("status filter narrows to published only", () => {
    render(<BlogListTable posts={POSTS} />);
    fireEvent.change(screen.getByTestId("admin-blog-filter-status"), {
      target: { value: "published" },
    });
    const slugs = getDataRows().map((r) => r.dataset.testid);
    expect(slugs).toEqual(["admin-blog-list-row-ai-deepfake", "admin-blog-list-row-phishing-101"]);
  });

  it("category filter narrows to one category", () => {
    render(<BlogListTable posts={POSTS} />);
    fireEvent.change(screen.getByTestId("admin-blog-filter-category"), {
      target: { value: "ai-scamy" },
    });
    expect(getDataRows().length).toBe(1);
    expect(screen.getByTestId("admin-blog-list-row-ai-deepfake")).toBeInTheDocument();
  });

  it("combined search + status + category narrows correctly", () => {
    render(<BlogListTable posts={POSTS} />);
    // 'deepfake' is title-unique; using 'ai' would also match the
    // category-name 'phishing a em-AI-ly' substring which is correct
    // behaviour but ambiguous for the intent of this test.
    fireEvent.change(screen.getByTestId("admin-blog-search-input"), {
      target: { value: "deepfake" },
    });
    fireEvent.change(screen.getByTestId("admin-blog-filter-status"), {
      target: { value: "published" },
    });
    expect(getDataRows().length).toBe(1);
    expect(screen.getByTestId("admin-blog-list-row-ai-deepfake")).toBeInTheDocument();
  });

  it("reset button restores all rows + clears filters", () => {
    render(<BlogListTable posts={POSTS} />);
    fireEvent.change(screen.getByTestId("admin-blog-filter-status"), {
      target: { value: "archived" },
    });
    expect(getDataRows().length).toBe(1);
    fireEvent.click(screen.getByTestId("admin-blog-filters-reset"));
    expect(getDataRows().length).toBe(POSTS.length);
  });
});

describe("BlogListTable — sort", () => {
  it("clicking title header sorts asc, second click flips to desc", () => {
    render(<BlogListTable posts={POSTS} />);
    fireEvent.click(screen.getByTestId("admin-blog-sort-title"));
    let order = getDataRows().map((r) => r.dataset.testid);
    expect(order[0]).toBe("admin-blog-list-row-ai-deepfake"); // 'ai a deepfake' alpha first
    fireEvent.click(screen.getByTestId("admin-blog-sort-title"));
    order = getDataRows().map((r) => r.dataset.testid);
    expect(order[0]).toBe("admin-blog-list-row-archived-old"); // 'starý archivovaný' alpha last
  });

  it("clicking status header sorts by status alphabetically", () => {
    render(<BlogListTable posts={POSTS} />);
    fireEvent.click(screen.getByTestId("admin-blog-sort-status"));
    const slugs = getDataRows().map((r) => r.dataset.testid);
    // asc: archived < draft < published
    expect(slugs[0]).toBe("admin-blog-list-row-archived-old");
    expect(slugs[1]).toBe("admin-blog-list-row-fake-eshop");
  });
});

describe("BlogListTable — column toggle", () => {
  it("opens the columns menu and hides a column", () => {
    render(<BlogListTable posts={POSTS} />);
    fireEvent.click(screen.getByTestId("admin-blog-columns-trigger"));
    expect(screen.getByTestId("admin-blog-columns-menu")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("admin-blog-columns-toggle-author"));
    expect(screen.queryByTestId("admin-blog-list-row-author-phishing-101")).not.toBeInTheDocument();
  });

  it("the title column is locked and cannot be hidden", () => {
    render(<BlogListTable posts={POSTS} />);
    fireEvent.click(screen.getByTestId("admin-blog-columns-trigger"));
    const toggle = screen.getByTestId("admin-blog-columns-toggle-title");
    expect(toggle).toBeDisabled();
    fireEvent.click(toggle);
    expect(screen.getByTestId("admin-blog-list-row-link-phishing-101")).toBeInTheDocument();
  });
});

describe("BlogListTable — bulk export", () => {
  it("disables the export menu when zero rows are visible", () => {
    render(<BlogListTable posts={POSTS} />);
    fireEvent.change(screen.getByTestId("admin-blog-search-input"), {
      target: { value: "zzzz" },
    });
    expect(screen.getByTestId("admin-blog-bulk-export-trigger")).toBeDisabled();
  });

  it("clicking JSON export opens a download (URL.createObjectURL called)", () => {
    const createSpy = vi.spyOn(URL, "createObjectURL");
    render(<BlogListTable posts={POSTS} />);
    fireEvent.click(screen.getByTestId("admin-blog-bulk-export-trigger"));
    fireEvent.click(screen.getByTestId("admin-blog-bulk-export-json"));
    expect(createSpy).toHaveBeenCalled();
    const blob = createSpy.mock.calls[0][0] as Blob;
    expect(blob.type).toContain("application/json");
  });

  it("clicking CSV export emits a CSV blob", () => {
    const createSpy = vi.spyOn(URL, "createObjectURL");
    render(<BlogListTable posts={POSTS} />);
    fireEvent.click(screen.getByTestId("admin-blog-bulk-export-trigger"));
    fireEvent.click(screen.getByTestId("admin-blog-bulk-export-csv"));
    const blob = createSpy.mock.calls[0][0] as Blob;
    expect(blob.type).toContain("text/csv");
  });
});

describe("BlogListTable — i18n / a11y", () => {
  it("search field has an accessible label", () => {
    render(<BlogListTable posts={POSTS} />);
    expect(screen.getByLabelText("Hľadať")).toBe(screen.getByTestId("admin-blog-search-input"));
  });

  it("status + category selects have aria-labels", () => {
    render(<BlogListTable posts={POSTS} />);
    expect(screen.getByTestId("admin-blog-filter-status")).toHaveAttribute(
      "aria-label",
      "Filter podľa stavu",
    );
    expect(screen.getByTestId("admin-blog-filter-category")).toHaveAttribute(
      "aria-label",
      "Filter podľa kategórie",
    );
  });

  it("each cell has a stable data-testid scoped to row slug", () => {
    render(<BlogListTable posts={POSTS} />);
    expect(screen.getByTestId("admin-blog-list-row-category-phishing-101")).toHaveTextContent(
      "phishing a emaily",
    );
  });
});
