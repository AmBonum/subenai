import { Link, useNavigate } from "@tanstack/react-router";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  useArchiveBlogPost,
  useDeleteBlogPost,
  useDuplicateBlogPost,
  usePublishBlogPost,
  useUnpublishBlogPost,
  type AdminBlogPostListItem,
  type BlogPostStatus,
} from "@/lib/blog/admin-queries";

// E16.5 — per-row action bar for /admin/blog table. Four entry points:
//   • Edit       — direct link to /admin/blog/$id (no mutation)
//   • Duplicate  — calls useDuplicateBlogPost + navigates to the new id
//   • Status     — dropdown switching draft / published / archived;
//                  each option maps to the existing publish/unpublish/
//                  archive mutations rather than re-implementing the
//                  status logic
//   • Delete     — AlertDialog confirmation, then useDeleteBlogPost
//
// Lives inline in the table cell — no overflow menu — so the four
// most common operations are 1-click away. Senior-UX wisdom: when
// admins do an action ≥ N times per day, hiding it in a dropdown is
// hostile. Status sits behind a dropdown because it has 3 sub-states
// and a single button can't express the choice.

interface BlogRowActionsProps {
  post: AdminBlogPostListItem;
}

export function BlogRowActions({ post }: BlogRowActionsProps) {
  const navigate = useNavigate();
  const duplicate = useDuplicateBlogPost();
  const deletePost = useDeleteBlogPost();
  const publish = usePublishBlogPost();
  const unpublish = useUnpublishBlogPost();
  const archive = useArchiveBlogPost();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const handleDuplicate = async (): Promise<void> => {
    try {
      const { id } = await duplicate.mutateAsync(post.id);
      navigate({ to: "/admin/blog/$id", params: { id } });
    } catch {
      // Mutation error is surfaced by react-query; no toast system in
      // the codebase yet. The list query will re-fetch on next mount
      // and the editor route will not load. Silent here is acceptable
      // until a toast surface lands.
    }
  };

  const handleStatusChange = (next: BlogPostStatus): void => {
    setStatusOpen(false);
    if (next === post.status) return;
    if (next === "published") publish.mutate(post.id);
    else if (next === "draft") unpublish.mutate(post.id);
    else archive.mutate(post.id);
  };

  const handleDelete = async (): Promise<void> => {
    setConfirmDelete(false);
    await deletePost.mutateAsync(post.id);
  };

  return (
    <div
      className="flex items-center gap-0.5"
      role="group"
      aria-label={`Akcie pre ${post.title}`}
      data-testid={`admin-blog-row-actions-${post.slug}`}
    >
      {/* Edit */}
      <Button asChild variant="ghost" size="icon" className="size-8" title="Upraviť">
        <Link
          to="/admin/blog/$id"
          params={{ id: post.id }}
          aria-label={`Upraviť ${post.title}`}
          data-testid={`admin-blog-row-edit-${post.slug}`}
        >
          <Pencil className="size-4" />
        </Link>
      </Button>

      {/* Duplicate */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={handleDuplicate}
        disabled={duplicate.isPending}
        aria-label={`Duplikovať ${post.title}`}
        title="Duplikovať"
        data-testid={`admin-blog-row-duplicate-${post.slug}`}
      >
        <Copy className="size-4" />
      </Button>

      {/* Status dropdown */}
      <StatusDropdown
        currentStatus={post.status}
        open={statusOpen}
        onOpenChange={setStatusOpen}
        onChange={handleStatusChange}
        postSlug={post.slug}
        postTitle={post.title}
        isPending={publish.isPending || unpublish.isPending || archive.isPending}
      />

      {/* Delete */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-destructive hover:text-destructive"
        onClick={() => setConfirmDelete(true)}
        aria-label={`Vymazať ${post.title}`}
        title="Vymazať"
        data-testid={`admin-blog-row-delete-${post.slug}`}
      >
        <Trash2 className="size-4" />
      </Button>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent data-testid={`admin-blog-delete-confirm-${post.slug}`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Vymazať článok?</AlertDialogTitle>
            <AlertDialogDescription>
              Týmto natrvalo vymažeš článok „{post.title}". Operáciu nemožno vrátiť.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`admin-blog-delete-cancel-${post.slug}`}>
              Zrušiť
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              data-testid={`admin-blog-delete-confirm-button-${post.slug}`}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Vymazať natrvalo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---- Status dropdown ----------------------------------------------------

const STATUS_LABEL: Record<BlogPostStatus, string> = {
  draft: "Draft",
  published: "Publikované",
  archived: "Archivované",
};

const STATUS_OPTIONS: ReadonlyArray<BlogPostStatus> = ["draft", "published", "archived"];

interface StatusDropdownProps {
  currentStatus: BlogPostStatus;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onChange: (next: BlogPostStatus) => void;
  postSlug: string;
  postTitle: string;
  isPending: boolean;
}

function StatusDropdown({
  currentStatus,
  open,
  onOpenChange,
  onChange,
  postSlug,
  postTitle,
  isPending,
}: StatusDropdownProps) {
  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => onOpenChange(!open)}
        disabled={isPending}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Zmeniť stav pre ${postTitle}`}
        title="Zmeniť stav"
        data-testid={`admin-blog-row-status-trigger-${postSlug}`}
      >
        <MoreHorizontal className="size-4" />
      </Button>
      {open && (
        <>
          {/* Click-outside catcher */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => onOpenChange(false)}
          />
          <div
            className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-border bg-popover p-1 shadow-md"
            role="menu"
            data-testid={`admin-blog-row-status-menu-${postSlug}`}
          >
            {STATUS_OPTIONS.map((opt) => {
              const isActive = opt === currentStatus;
              return (
                <button
                  key={opt}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => onChange(opt)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted ${
                    isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                  }`}
                  data-testid={`admin-blog-row-status-option-${postSlug}-${opt}`}
                >
                  <span>{STATUS_LABEL[opt]}</span>
                  {isActive && (
                    <span aria-hidden="true" className="text-primary">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
