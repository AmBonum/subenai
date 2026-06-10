import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

import type { AdminBlogPostListItem } from "@/lib/blog/admin-queries";

// ---- Mocks ---------------------------------------------------------------

const navigateSpy = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => navigateSpy,
}));

const duplicateMutateAsync = vi.fn();
const deleteMutateAsync = vi.fn();
const publishMutate = vi.fn();
const unpublishMutate = vi.fn();
const archiveMutate = vi.fn();

vi.mock("@/lib/blog/admin-queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/blog/admin-queries")>(
    "@/lib/blog/admin-queries",
  );
  return {
    ...actual,
    useDuplicateBlogPost: () => ({
      mutate: vi.fn(),
      mutateAsync: duplicateMutateAsync,
      isPending: false,
    }),
    useDeleteBlogPost: () => ({
      mutate: vi.fn(),
      mutateAsync: deleteMutateAsync,
      isPending: false,
    }),
    usePublishBlogPost: () => ({
      mutate: publishMutate,
      mutateAsync: vi.fn(),
      isPending: false,
    }),
    useUnpublishBlogPost: () => ({
      mutate: unpublishMutate,
      mutateAsync: vi.fn(),
      isPending: false,
    }),
    useArchiveBlogPost: () => ({
      mutate: archiveMutate,
      mutateAsync: vi.fn(),
      isPending: false,
    }),
  };
});

import { BlogRowActions } from "@/components/admin/blog/BlogRowActions";

const SAMPLE: AdminBlogPostListItem = {
  id: "post-1",
  slug: "phishing-101",
  title: "phishing 101",
  status: "published",
  published_at: "2026-05-10T10:00:00.000Z",
  updated_at: "2026-05-15T10:00:00.000Z",
  category: { slug: "phishing-a-emaily", name: "phishing a emaily" },
  author: { slug: "subenai-editorial", display_name: "subenai editorial" },
};

beforeEach(() => {
  navigateSpy.mockReset();
  duplicateMutateAsync.mockReset();
  deleteMutateAsync.mockReset();
  publishMutate.mockReset();
  unpublishMutate.mockReset();
  archiveMutate.mockReset();
  duplicateMutateAsync.mockResolvedValue({ id: "new-id" });
  deleteMutateAsync.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---- Rendering ----------------------------------------------------------

describe("BlogRowActions — render", () => {
  it("renders all four action buttons with accessible labels", () => {
    render(<BlogRowActions post={SAMPLE} />);
    const root = screen.getByTestId(`admin-blog-row-actions-${SAMPLE.slug}`);
    expect(root).toHaveAttribute("aria-label", `Akcie pre ${SAMPLE.title}`);
    expect(within(root).getByLabelText(`Upraviť ${SAMPLE.title}`)).toBeInTheDocument();
    expect(within(root).getByLabelText(`Duplikovať ${SAMPLE.title}`)).toBeInTheDocument();
    expect(within(root).getByLabelText(`Zmeniť stav pre ${SAMPLE.title}`)).toBeInTheDocument();
    expect(within(root).getByLabelText(`Vymazať ${SAMPLE.title}`)).toBeInTheDocument();
  });

  it("Edit button is a link to the editor route", () => {
    render(<BlogRowActions post={SAMPLE} />);
    const link = screen.getByTestId(`admin-blog-row-edit-${SAMPLE.slug}`);
    expect(link.getAttribute("data-to")).toBe("/admin/blog/$id");
  });
});

// ---- Duplicate ----------------------------------------------------------

describe("BlogRowActions — duplicate", () => {
  it("clicking duplicate calls the mutation with the source id", async () => {
    render(<BlogRowActions post={SAMPLE} />);
    fireEvent.click(screen.getByTestId(`admin-blog-row-duplicate-${SAMPLE.slug}`));
    expect(duplicateMutateAsync).toHaveBeenCalledWith(SAMPLE.id);
  });

  it("navigates to the new editor route after duplicate succeeds", async () => {
    render(<BlogRowActions post={SAMPLE} />);
    fireEvent.click(screen.getByTestId(`admin-blog-row-duplicate-${SAMPLE.slug}`));
    await duplicateMutateAsync.mock.results[0]?.value;
    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/admin/blog/$id",
      params: { id: "new-id" },
    });
  });

  it("does NOT navigate when the duplicate mutation rejects", async () => {
    duplicateMutateAsync.mockRejectedValueOnce(new Error("conflict"));
    render(<BlogRowActions post={SAMPLE} />);
    fireEvent.click(screen.getByTestId(`admin-blog-row-duplicate-${SAMPLE.slug}`));
    // Let the rejected promise settle
    await new Promise((r) => setTimeout(r, 0));
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});

// ---- Status dropdown ----------------------------------------------------

describe("BlogRowActions — status dropdown", () => {
  it("opens the status menu and highlights the current status with a check", () => {
    render(<BlogRowActions post={SAMPLE} />);
    fireEvent.click(screen.getByTestId(`admin-blog-row-status-trigger-${SAMPLE.slug}`));
    const menu = screen.getByTestId(`admin-blog-row-status-menu-${SAMPLE.slug}`);
    const publishedOption = within(menu).getByTestId(
      `admin-blog-row-status-option-${SAMPLE.slug}-published`,
    );
    expect(publishedOption).toHaveAttribute("aria-checked", "true");
    const draftOption = within(menu).getByTestId(
      `admin-blog-row-status-option-${SAMPLE.slug}-draft`,
    );
    expect(draftOption).toHaveAttribute("aria-checked", "false");
  });

  it("picking 'draft' calls unpublish mutation", () => {
    render(<BlogRowActions post={SAMPLE} />);
    fireEvent.click(screen.getByTestId(`admin-blog-row-status-trigger-${SAMPLE.slug}`));
    fireEvent.click(screen.getByTestId(`admin-blog-row-status-option-${SAMPLE.slug}-draft`));
    expect(unpublishMutate).toHaveBeenCalledWith(SAMPLE.id);
    expect(publishMutate).not.toHaveBeenCalled();
    expect(archiveMutate).not.toHaveBeenCalled();
  });

  it("picking 'archived' calls archive mutation", () => {
    render(<BlogRowActions post={SAMPLE} />);
    fireEvent.click(screen.getByTestId(`admin-blog-row-status-trigger-${SAMPLE.slug}`));
    fireEvent.click(screen.getByTestId(`admin-blog-row-status-option-${SAMPLE.slug}-archived`));
    expect(archiveMutate).toHaveBeenCalledWith(SAMPLE.id);
  });

  it("picking 'published' on a draft article calls publish mutation", () => {
    render(<BlogRowActions post={{ ...SAMPLE, status: "draft" }} />);
    fireEvent.click(screen.getByTestId(`admin-blog-row-status-trigger-${SAMPLE.slug}`));
    fireEvent.click(screen.getByTestId(`admin-blog-row-status-option-${SAMPLE.slug}-published`));
    expect(publishMutate).toHaveBeenCalledWith(SAMPLE.id);
  });

  it("picking the SAME status is a no-op (no mutation fires)", () => {
    render(<BlogRowActions post={SAMPLE} />);
    fireEvent.click(screen.getByTestId(`admin-blog-row-status-trigger-${SAMPLE.slug}`));
    fireEvent.click(screen.getByTestId(`admin-blog-row-status-option-${SAMPLE.slug}-published`));
    expect(publishMutate).not.toHaveBeenCalled();
    expect(unpublishMutate).not.toHaveBeenCalled();
    expect(archiveMutate).not.toHaveBeenCalled();
  });
});

// ---- Delete confirmation ------------------------------------------------

describe("BlogRowActions — delete", () => {
  it("clicking delete opens the destructive ConfirmDialog but does NOT delete yet", () => {
    render(<BlogRowActions post={SAMPLE} />);
    fireEvent.click(screen.getByTestId(`admin-blog-row-delete-${SAMPLE.slug}`));
    const dialog = screen.getByTestId("app-shell-confirm-dialog-root");
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute("data-severity")).toBe("destructive");
    expect(deleteMutateAsync).not.toHaveBeenCalled();
  });

  it("clicking 'Vymazať natrvalo' in the dialog fires the delete mutation", () => {
    render(<BlogRowActions post={SAMPLE} />);
    fireEvent.click(screen.getByTestId(`admin-blog-row-delete-${SAMPLE.slug}`));
    fireEvent.click(screen.getByTestId("app-shell-confirm-dialog-confirm"));
    expect(deleteMutateAsync).toHaveBeenCalledWith(SAMPLE.id);
  });

  it("clicking 'Zrušiť' closes the dialog without deleting", () => {
    render(<BlogRowActions post={SAMPLE} />);
    fireEvent.click(screen.getByTestId(`admin-blog-row-delete-${SAMPLE.slug}`));
    fireEvent.click(screen.getByTestId("app-shell-confirm-dialog-cancel"));
    expect(deleteMutateAsync).not.toHaveBeenCalled();
  });

  it("delete dialog quotes the article title", () => {
    render(<BlogRowActions post={SAMPLE} />);
    fireEvent.click(screen.getByTestId(`admin-blog-row-delete-${SAMPLE.slug}`));
    const dialog = screen.getByTestId("app-shell-confirm-dialog-root");
    expect(dialog).toHaveTextContent(`„${SAMPLE.title}`);
  });
});
