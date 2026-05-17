import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminRepo, useAdminState } from "@/lib/admin/mock-store";
import { tFor } from "@/i18n/admin";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategoriesPage,
});

type Kind = "branch" | "topic";

interface EditorState {
  kind: Kind;
  id?: string;
  name: string;
  branchSlug?: string;
  description: string;
}

function AdminCategoriesPage() {
  const t = tFor("categories");
  const branches = useAdminState((s) => s.categories);
  const topics = useAdminState((s) => s.topics);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ kind: Kind; id: string; name: string } | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // A topic "belongs to" a branch if its slug starts with `${branchSlug}-`.
  // Topics created via this dialog use that convention (see submit()), so the
  // delete-guard fires for any branch with at least one descendant topic.
  const branchHasTopics = (branchSlug: string) =>
    topics.some((tp) => tp.slug.startsWith(`${branchSlug}-`));

  const openCreate = (kind: Kind) =>
    setEditor({
      kind,
      name: "",
      branchSlug: kind === "topic" ? branches[0]?.slug : undefined,
      description: "",
    });

  const openEdit = (kind: Kind, id: string, name: string, description: string) =>
    setEditor({ kind, id, name, description, branchSlug: branches[0]?.slug });

  const submit = () => {
    if (!editor) return;
    const nameSlug = editor.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const baseSlug = nameSlug || `cat-${Date.now()}`;
    const slug =
      editor.kind === "topic" && editor.branchSlug ? `${editor.branchSlug}-${baseSlug}` : baseSlug;
    const payload = {
      name: editor.name,
      slug,
      description: editor.description,
      color: "#6366f1",
    };
    if (!editor.name.trim()) return;
    const repo = editor.kind === "branch" ? adminRepo.categories : adminRepo.topics;
    if (editor.id) {
      repo.update(editor.id, payload);
    } else {
      repo.create(payload);
    }
    setEditor(null);
  };

  const tryDelete = () => {
    if (!confirmDel) return;
    if (confirmDel.kind === "branch") {
      const branch = branches.find((b) => b.id === confirmDel.id);
      if (branch && branchHasTopics(branch.slug)) {
        setDeleteError(t("delete_blocked_topics"));
        toast.error(t("delete_blocked_topics"));
        setConfirmDel(null);
        return;
      }
      adminRepo.categories.remove(confirmDel.id);
    } else {
      adminRepo.topics.remove(confirmDel.id);
    }
    setDeleteError(null);
    setConfirmDel(null);
  };

  return (
    <div className="space-y-6" data-testid="admin-categories-root">
      <PageHeader
        title={t("title")}
        description={t("description")}
        testId="admin-categories-page-header"
      />

      {deleteError && (
        <Card
          className="border-destructive/40 bg-destructive/5"
          data-testid="admin-categories-delete-error"
        >
          <CardContent className="p-4 text-sm text-destructive">{deleteError}</CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("branches_title")}</h2>
          <Button
            type="button"
            size="sm"
            onClick={() => openCreate("branch")}
            data-testid="admin-categories-new-branch-button"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("new_branch")}
          </Button>
        </div>
        <ul className="space-y-2" data-testid="admin-categories-branches-list">
          {branches.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-3 py-2"
              data-testid={`admin-categories-branch-row-${b.id}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{b.name}</p>
                <p className="text-xs text-muted-foreground">/{b.slug}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("edit")}
                  data-testid={`admin-categories-branch-row-edit-${b.id}`}
                  onClick={() => openEdit("branch", b.id, b.name, b.description)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("delete")}
                  data-testid={`admin-categories-branch-row-delete-${b.id}`}
                  onClick={() => setConfirmDel({ kind: "branch", id: b.id, name: b.name })}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("topics_title")}</h2>
          <Button
            type="button"
            size="sm"
            onClick={() => openCreate("topic")}
            data-testid="admin-categories-new-topic-button"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("new_topic")}
          </Button>
        </div>
        <ul className="space-y-2" data-testid="admin-categories-topics-list">
          {topics.map((tp) => (
            <li
              key={tp.id}
              className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-3 py-2"
              data-testid={`admin-categories-topic-row-${tp.id}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{tp.name}</p>
                <p className="text-xs text-muted-foreground">/{tp.slug}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("edit")}
                  data-testid={`admin-categories-topic-row-edit-${tp.id}`}
                  onClick={() => openEdit("topic", tp.id, tp.name, tp.description)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("delete")}
                  data-testid={`admin-categories-topic-row-delete-${tp.id}`}
                  onClick={() => setConfirmDel({ kind: "topic", id: tp.id, name: tp.name })}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={!!editor} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editor?.kind === "branch" ? t("branches_title") : t("topics_title")}
            </DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          {editor && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">{t("dialog_name_label")}</Label>
                <Input
                  id="cat-name"
                  value={editor.name}
                  onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                  data-testid="category-dialog-name-input"
                />
              </div>
              {editor.kind === "topic" && (
                <div className="space-y-1.5">
                  <Label htmlFor="cat-branch">{t("dialog_branch_label")}</Label>
                  <Select
                    value={editor.branchSlug}
                    onValueChange={(v) => setEditor({ ...editor, branchSlug: v })}
                  >
                    <SelectTrigger id="cat-branch" data-testid="category-dialog-branch-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.slug} value={b.slug}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditor(null)}
              data-testid="category-dialog-cancel-button"
            >
              {t("dialog_cancel")}
            </Button>
            <Button
              type="button"
              onClick={submit}
              disabled={!editor?.name.trim()}
              data-testid="category-dialog-save-button"
            >
              {t("dialog_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title={t("delete_confirm_title")}
        description={confirmDel ? confirmDel.name : t("delete_confirm_description")}
        confirmLabel={t("delete")}
        destructive
        onConfirm={tryDelete}
      />
    </div>
  );
}
