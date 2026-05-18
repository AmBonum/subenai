import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CmsNavItem } from "@/lib/admin/cms-types";
import { useCmsNavigation, useUpdateCmsNavigation } from "@/lib/admin/queries";
import { tFor } from "@/i18n/cms";

const newId = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 8)}`;

export const Route = createFileRoute("/admin/navigation")({
  component: AdminNavigationPage,
});

const URL_RE = /^(\/[^\s]*|https:\/\/[^\s]+)$/;

function ordered(items: CmsNavItem[]): CmsNavItem[] {
  return [...items].sort((a, b) => a.position - b.position);
}

function AdminNavigationPage() {
  const t = tFor("navAdmin");
  const qc = useQueryClient();
  const navQuery = useCmsNavigation();
  const updateNav = useUpdateCmsNavigation();
  const items = navQuery.data ?? [];
  const list = ordered(items);

  const mutateError = (e: unknown) => toast.error((e as Error).message);
  const setNav = (updater: (prev: CmsNavItem[]) => CmsNavItem[]) => {
    const next = updater(items);
    qc.setQueryData<CmsNavItem[]>(["admin", "cms", "navigation"], next);
    updateNav.mutate(next, { onError: mutateError });
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = list.find((i) => i.id === editingId) ?? null;

  const openCreate = () => {
    const item: CmsNavItem = {
      id: newId("nav"),
      label: "",
      url: "",
      position: list.length + 1,
      visible: true,
      open_in_new_tab: false,
      auth_only: false,
    };
    setNav((prev) => [...prev, item]);
    setEditingId(item.id);
  };

  const closeEditor = () => setEditingId(null);

  const patch = (id: string, p: Partial<CmsNavItem>) =>
    setNav((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const remove = (id: string) => setNav((prev) => prev.filter((i) => i.id !== id));

  const move = (id: string, dir: -1 | 1) => {
    const sorted = ordered(items);
    const idx = sorted.findIndex((i) => i.id === id);
    const target = idx + dir;
    if (target < 0 || target >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[target];
    setNav((prev) =>
      prev.map((i) => {
        if (i.id === a.id) return { ...i, position: b.position };
        if (i.id === b.id) return { ...i, position: a.position };
        return i;
      }),
    );
  };

  const onSave = () => {
    if (!editing) return;
    if (!URL_RE.test(editing.url)) {
      toast.error(t("url_invalid"));
      return;
    }
    toast.success(t("save"));
    setEditingId(null);
  };

  return (
    <div className="space-y-6" data-testid="cms-nav-root">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button onClick={openCreate} data-testid="cms-nav-add-button">
            <Plus className="mr-2 h-4 w-4" />
            {t("add_item")}
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <p
              className="py-10 text-center text-sm text-muted-foreground"
              data-testid="cms-nav-empty"
            >
              {t("empty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("label")}</TableHead>
                  <TableHead>{t("url")}</TableHead>
                  <TableHead>{t("visible")}</TableHead>
                  <TableHead>{t("auth_only")}</TableHead>
                  <TableHead className="text-right">{t("position")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((item, idx) => (
                  <TableRow key={item.id} data-testid={`cms-nav-item-${item.id}`}>
                    <TableCell>{item.label}</TableCell>
                    <TableCell className="font-mono text-xs">{item.url}</TableCell>
                    <TableCell>
                      <Switch
                        checked={item.visible}
                        onCheckedChange={(v) => patch(item.id, { visible: v })}
                        data-testid={`cms-nav-item-${item.id}-visible`}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.auth_only}
                        onCheckedChange={(v) => patch(item.id, { auth_only: v })}
                        data-testid={`cms-nav-item-${item.id}-auth-only`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => move(item.id, -1)}
                          disabled={idx === 0}
                          data-testid={`cms-nav-item-${item.id}-move-up`}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => move(item.id, 1)}
                          disabled={idx === list.length - 1}
                          data-testid={`cms-nav-item-${item.id}-move-down`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingId(item.id)}
                          data-testid={`cms-nav-item-edit-${item.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove(item.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`cms-nav-item-delete-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && closeEditor()}>
        <DialogContent data-testid="cms-nav-item-form">
          <DialogHeader>
            <DialogTitle>{t("edit")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="cms-nav-label">{t("label")}</Label>
                <Input
                  id="cms-nav-label"
                  value={editing.label}
                  onChange={(e) => patch(editing.id, { label: e.target.value })}
                  data-testid="cms-nav-item-form-label"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cms-nav-url">{t("url")}</Label>
                <Input
                  id="cms-nav-url"
                  value={editing.url}
                  onChange={(e) => patch(editing.id, { url: e.target.value })}
                  data-testid="cms-nav-item-form-url"
                />
              </div>
              <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>{t("open_new_tab")}</span>
                <Switch
                  checked={editing.open_in_new_tab}
                  onCheckedChange={(v) => patch(editing.id, { open_in_new_tab: v })}
                  data-testid="cms-nav-item-form-new-tab"
                />
              </label>
              <label className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>{t("auth_only")}</span>
                <Switch
                  checked={editing.auth_only}
                  onCheckedChange={(v) => patch(editing.id, { auth_only: v })}
                  data-testid="cms-nav-item-form-auth-only"
                />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeEditor} data-testid="cms-nav-item-form-cancel">
              {t("cancel")}
            </Button>
            <Button onClick={onSave} data-testid="cms-nav-item-form-save">
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
