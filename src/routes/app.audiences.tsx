import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Mail, Pencil, Trash2, X, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/app/page-header";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { toast } from "sonner";
import {
  useAudiences,
  useCreateAudience,
  useCurrentProfile,
  useDeleteAudience,
  useUpdateAudience,
} from "@/lib/platform/queries";
import type { RespondentGroup } from "@/lib/platform/types";
import { tFor } from "@/i18n/tests";
import { tFor as tAppShell } from "@/i18n/app-shell";

const tRoutes = tAppShell("route_titles");

export const Route = createFileRoute("/app/audiences")({
  head: () => ({
    meta: [{ title: tRoutes("audiences") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AudiencesPage,
});

function AudiencesPage() {
  const t = tFor("audiences");
  const groupsQ = useAudiences();
  const profileQ = useCurrentProfile();
  const createMut = useCreateAudience();
  const updateMut = useUpdateAudience();
  const deleteMut = useDeleteAudience();
  const myGroups = groupsQ.data ?? [];

  const [editing, setEditing] = useState<RespondentGroup | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [pendingDelete, setPendingDelete] = useState<RespondentGroup | null>(null);

  const openNew = () => {
    setEditing(null);
    setIsNew(true);
    setName("");
    setTags([]);
    setTagInput("");
  };

  const openEdit = (g: RespondentGroup) => {
    setEditing(g);
    setIsNew(false);
    setName(g.name);
    setTags(g.tags);
    setTagInput("");
  };

  const closeEditor = () => {
    setEditing(null);
    setIsNew(false);
  };

  const onAddTag = () => {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) {
      setTags([...tags, v]);
    }
    setTagInput("");
  };

  const onSave = () => {
    if (!name.trim()) return;
    if (editing) {
      updateMut.mutate(
        { id: editing.id, patch: { name: name.trim(), tags } },
        {
          onSuccess: () => closeEditor(),
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      const ownerId = profileQ.data?.id ?? "";
      createMut.mutate(
        { name: name.trim(), tags, owner_id: ownerId },
        {
          onSuccess: () => closeEditor(),
          onError: (err) => toast.error(err.message),
        },
      );
    }
  };

  const onConfirmDelete = () => {
    if (pendingDelete) {
      const id = pendingDelete.id;
      deleteMut.mutate(id, {
        onError: (err) => toast.error(err.message),
      });
      setPendingDelete(null);
    }
  };

  const editorOpen = editing !== null || isNew;

  return (
    <div className="space-y-6" data-testid="audiences-root">
      <PageHeader
        eyebrow={t("page_eyebrow")}
        title={t("page_title")}
        accentWords={1}
        icon={Users}
        subtitle={t("page_subtitle")}
        actions={
          <Button
            size="sm"
            onClick={openNew}
            className="btn-primary"
            data-testid="audiences-new-group-button"
          >
            <Plus className="mr-2 h-3 w-3" />
            {t("new_group_button")}
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    data-testid="audiences-import-emails-button"
                  >
                    <Mail className="mr-2 h-3 w-3" />
                    {t("import_emails_button")}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{t("import_emails_tooltip")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>

      {myGroups.length === 0 ? (
        <Card data-testid="audiences-empty-state">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {t("empty_state")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {myGroups.map((g) => (
            <Card
              key={g.id}
              data-testid={`audiences-list-row-${g.id}`}
              className="border-border/60"
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium" data-testid={`audiences-row-name-${g.id}`}>
                      {g.name}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{g.description}</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0"
                    data-testid={`audiences-row-members-${g.id}`}
                  >
                    {t("members_count", { count: g.member_emails.length })}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {g.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="font-normal text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(g)}
                    data-testid={`audiences-row-edit-${g.id}`}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    {t("row_edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDelete(g)}
                    data-testid={`audiences-row-delete-${g.id}`}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    {t("row_delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editorOpen && (
        <Card data-testid="audiences-editor-root">
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="aud-name">{t("editor_name_label")}</Label>
              <Input
                id="aud-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("editor_name_placeholder")}
                data-testid="audiences-editor-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aud-tag">{t("editor_tag_label")}</Label>
              <div className="flex gap-2">
                <Input
                  id="aud-tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAddTag();
                    }
                  }}
                  placeholder={t("editor_tag_placeholder")}
                  data-testid="audiences-editor-tag-input"
                />
                <Button variant="outline" size="sm" onClick={onAddTag}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((x) => x !== tag))}
                      className="ml-1 inline-flex"
                      data-testid={`audiences-editor-tag-remove-${tag}`}
                      aria-label="remove tag"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={closeEditor}
                data-testid="audiences-editor-cancel-button"
              >
                {t("cancel_button")}
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={!name.trim()}
                data-testid="audiences-editor-save-button"
              >
                {t("save_button")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={t("delete_confirm_title")}
        description={t("delete_confirm_body")}
        destructive
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
