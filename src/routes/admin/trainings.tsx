import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Copy, Trash2, GraduationCap } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TrainingEditor } from "@/components/admin/TrainingEditor";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminRepo, useAdminState } from "@/lib/admin/mock-store";
import type { AdminTraining } from "@/lib/admin/mock-data";
import { topicLabel } from "@/lib/admin/mock-data";
import { tFor } from "@/i18n/admin";

export const Route = createFileRoute("/admin/trainings")({
  component: AdminTrainingsPage,
});

function AdminTrainingsPage() {
  const t = tFor("trainings");
  const trainings = useAdminState((s) => s.trainings);
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTraining | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminTraining | null>(null);

  const filtered = useMemo(
    () =>
      trainings.filter((tr) =>
        query ? tr.title.toLowerCase().includes(query.toLowerCase()) : true,
      ),
    [trainings, query],
  );

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (tr: AdminTraining) => {
    setEditing(tr);
    setEditorOpen(true);
  };

  const duplicate = (tr: AdminTraining) => {
    const copy = adminRepo.trainings.create({
      title: `${tr.title}${t("duplicate_suffix")}`,
      topic: tr.topic,
      description: tr.description,
      duration_min: tr.duration_min,
      status: "draft",
    });
    toast.success(copy.title);
  };

  return (
    <div className="space-y-6" data-testid="admin-trainings-root">
      <PageHeader
        title={t("title")}
        description={t("description")}
        testId="admin-trainings-page-header"
        actions={
          <Button size="sm" onClick={openCreate} data-testid="admin-trainings-list-new-button">
            <Plus className="mr-2 h-4 w-4" />
            {t("new_button")}
          </Button>
        }
      />

      <Card className="border-border/60">
        <CardContent className="space-y-4 p-4">
          <Input
            placeholder={t("search_placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:max-w-xs"
            data-testid="admin-trainings-list-search"
          />

          {filtered.length === 0 ? (
            <div
              className="py-10 text-center text-sm text-muted-foreground"
              data-testid="admin-trainings-list-empty-state"
            >
              <p className="font-medium text-foreground">{t("empty_state_title")}</p>
              <p>{t("empty_state_description")}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead>{t("title")}</TableHead>
                    <TableHead>{t("editor_topic_label")}</TableHead>
                    <TableHead>{t("editor_status_label")}</TableHead>
                    <TableHead className="w-[160px] text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tr) => (
                    <TableRow key={tr.id} data-testid={`admin-trainings-list-row-${tr.id}`}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <GraduationCap className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-medium">{tr.title}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {tr.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {topicLabel(tr.topic)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tr.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t("edit")}
                            data-testid={`admin-trainings-row-edit-${tr.id}`}
                            onClick={() => openEdit(tr)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t("duplicate")}
                            data-testid={`admin-trainings-row-duplicate-${tr.id}`}
                            onClick={() => duplicate(tr)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t("delete")}
                            data-testid={`admin-trainings-row-delete-${tr.id}`}
                            onClick={() => setConfirmDelete(tr)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TrainingEditor open={editorOpen} onOpenChange={setEditorOpen} training={editing} />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={t("delete_confirm_title")}
        description={confirmDelete ? confirmDelete.title : t("delete_confirm_description")}
        confirmLabel={t("delete")}
        destructive
        onConfirm={() => {
          if (confirmDelete) {
            adminRepo.trainings.remove(confirmDelete.id);
            setConfirmDelete(null);
          }
        }}
      />
    </div>
  );
}
