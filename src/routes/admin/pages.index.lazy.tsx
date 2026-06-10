import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminPageExplainer } from "@/components/admin/AdminPageExplainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CmsPage, PageStatus } from "@/lib/admin/cms-types";
import { useCmsPages, useCreateCmsPage, useDeleteCmsPage } from "@/lib/admin/queries";
import { tFor } from "@/i18n/cms";

export const Route = createLazyFileRoute("/admin/pages/")({
  component: AdminCmsPagesPage,
});

function AdminCmsPagesPage() {
  const t = tFor("pagesList");
  const pagesQuery = useCmsPages();
  const createPage = useCreateCmsPage();
  const deletePage = useDeleteCmsPage();
  const navigate = useNavigate();

  const pages = useMemo(() => pagesQuery.data ?? [], [pagesQuery.data]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PageStatus | "all">("all");
  const [confirmDelete, setConfirmDelete] = useState<CmsPage | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pages.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
    });
  }, [pages, search, status]);

  const onNew = () => {
    createPage.mutate(undefined, {
      onSuccess: (page) => {
        toast.success(t("new_button"));
        navigate({ to: "/admin/pages/$pageId", params: { pageId: page.id } });
      },
      onError: (e) => toast.error((e as Error).message),
    });
  };

  const onDelete = (id: string) => {
    deletePage.mutate(id, {
      onSuccess: () => toast.success(t("delete")),
      onError: (e) => toast.error((e as Error).message),
    });
  };

  return (
    <div className="space-y-6" data-testid="cms-pages-list-root">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button onClick={onNew} data-testid="cms-pages-list-new-button">
            <Plus className="mr-2 h-4 w-4" />
            {t("new_button")}
          </Button>
        }
      />

      <AdminPageExplainer pageKey="pages" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          data-testid="cms-pages-list-search-input"
          placeholder={t("search_placeholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as PageStatus | "all")}>
          <SelectTrigger data-testid="cms-pages-list-status-filter" className="sm:max-w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filter_all")}</SelectItem>
            <SelectItem value="draft">{t("filter_draft")}</SelectItem>
            <SelectItem value="published">{t("filter_published")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("column_title")}</TableHead>
                <TableHead>{t("column_slug")}</TableHead>
                <TableHead>{t("column_status")}</TableHead>
                <TableHead>{t("column_updated")}</TableHead>
                <TableHead className="text-right">{t("column_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                    data-testid="cms-pages-list-empty"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id} data-testid={`cms-pages-list-row-${p.id}`}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="font-mono text-xs">{p.slug}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "published" ? "default" : "secondary"}>
                        {p.status === "published" ? t("status_published") : t("status_draft")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.updated_at).toLocaleDateString("sk-SK")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild size="icon" variant="ghost" title={t("edit")}>
                          <Link
                            to="/admin/pages/$pageId"
                            params={{ pageId: p.id }}
                            data-testid={`cms-pages-list-edit-${p.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title={t("delete")}
                          onClick={() => setConfirmDelete(p)}
                          data-testid={`cms-pages-list-delete-${p.id}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Zmazať stránku?"
        description={
          confirmDelete
            ? `Stránka „${confirmDelete.title}“ (/${confirmDelete.slug}) bude nenávratne zmazaná.`
            : undefined
        }
        confirmLabel={t("delete")}
        severity="destructive"
        onConfirm={() => {
          if (confirmDelete) onDelete(confirmDelete.id);
        }}
      />
    </div>
  );
}
