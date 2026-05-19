import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ExternalLink, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { BRANCHES, branchLabel } from "@/lib/admin/branches";
import { useAdminTests, useDeleteTest } from "@/lib/admin/queries";
import { AdminListLoading, AdminListError } from "@/components/admin/AdminListLoading";
import { tFor } from "@/i18n/tests";

export const Route = createLazyFileRoute("/admin/tests/")({
  component: AdminTestsListPage,
});

function AdminTestsListPage() {
  const t = tFor("admin_list");
  const testsQuery = useAdminTests();
  const deleteTest = useDeleteTest();
  const tests = useMemo(() => testsQuery.data ?? [], [testsQuery.data]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [branch, setBranch] = useState<string>("all");
  const [owner, setOwner] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [rowConfirm, setRowConfirm] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      tests.filter((x) => {
        if (status !== "all" && x.status !== status) return false;
        if (difficulty !== "all" && x.difficulty !== difficulty) return false;
        if (branch !== "all" && !x.categories.includes(branch)) return false;
        if (owner !== "all") return false; // owner is a stub until AH-11.
        if (search && !x.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [tests, search, status, difficulty, branch, owner],
  );

  const allSelected = filtered.length > 0 && filtered.every((x) => selected.has(x.id));
  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected);
      filtered.forEach((x) => next.delete(x.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((x) => next.add(x.id));
      setSelected(next);
    }
  };

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const onBulkDelete = () => {
    for (const id of selected) {
      deleteTest.mutate(id, { onError: (err: Error) => toast.error(err.message) });
    }
    setSelected(new Set());
  };

  const onRowDelete = () => {
    if (rowConfirm) {
      deleteTest.mutate(rowConfirm, { onError: (err: Error) => toast.error(err.message) });
      const next = new Set(selected);
      next.delete(rowConfirm);
      setSelected(next);
      setRowConfirm(null);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setDifficulty("all");
    setBranch("all");
    setOwner("all");
  };

  return (
    <div className="space-y-6" data-testid="admin-tests-list-root">
      <PageHeader
        title={t("page_title")}
        description={t("page_subtitle")}
        actions={
          selected.size > 0 ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkConfirm(true)}
              data-testid="admin-tests-list-bulk-delete-button"
            >
              <Trash2 className="mr-2 h-3 w-3" />
              {t("bulk_delete_button")} ({selected.size})
            </Button>
          ) : null
        }
      />

      <Card className="border-border/60">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t("search_placeholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="admin-tests-list-search"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44" data-testid="admin-tests-list-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("status_all")}</SelectItem>
                <SelectItem value="draft">{t("status_draft")}</SelectItem>
                <SelectItem value="published">{t("status_published")}</SelectItem>
                <SelectItem value="archived">{t("status_archived")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="w-40" data-testid="admin-tests-list-difficulty-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("difficulty_all")}</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger className="w-44" data-testid="admin-tests-list-branch-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("branch_all")}</SelectItem>
                {BRANCHES.map((b) => (
                  <SelectItem key={b.slug} value={b.slug}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={owner} onValueChange={setOwner}>
              <SelectTrigger className="w-40" data-testid="admin-tests-list-owner-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("owner_all")}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              data-testid="admin-tests-list-clear-filters"
            >
              {t("clear_filters")}
            </Button>
          </div>

          {testsQuery.isLoading ? (
            <AdminListLoading testId="admin-tests-list-loading" />
          ) : testsQuery.error ? (
            <AdminListError error={testsQuery.error as Error} testId="admin-tests-list-error" />
          ) : filtered.length === 0 ? (
            <div
              className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"
              data-testid="admin-tests-list-empty-state"
            >
              {t("empty_state")}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        data-testid="admin-tests-list-select-all-checkbox"
                        aria-label={t("select_all")}
                      />
                    </TableHead>
                    <TableHead>{t("column_test")}</TableHead>
                    <TableHead>{t("column_branch")}</TableHead>
                    <TableHead>{t("column_difficulty")}</TableHead>
                    <TableHead>{t("column_status")}</TableHead>
                    <TableHead className="w-[160px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((x) => (
                    <TableRow key={x.id} data-testid={`admin-tests-list-row-${x.id}`}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(x.id)}
                          onCheckedChange={() => toggleRow(x.id)}
                          data-testid={`admin-tests-list-row-checkbox-${x.id}`}
                          aria-label={x.title}
                        />
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p
                          className="line-clamp-1 text-sm font-medium"
                          data-testid={`admin-tests-list-row-title-${x.id}`}
                        >
                          {x.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {x.description}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {x.categories.map((c) => (
                            <Badge key={c} variant="secondary" className="font-normal">
                              {branchLabel(c)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {x.difficulty}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={x.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            data-testid={`admin-tests-row-open-${x.id}`}
                          >
                            <Link to="/admin/tests/$testId" params={{ testId: x.id }}>
                              <ExternalLink className="mr-1 h-3 w-3" />
                              {t("row_open")}
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => setRowConfirm(x.id)}
                            data-testid={`admin-tests-row-delete-${x.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
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

      <ConfirmDialog
        open={bulkConfirm}
        onOpenChange={setBulkConfirm}
        title={t("bulk_delete_confirm_title")}
        description={t("bulk_delete_confirm_body")}
        destructive
        onConfirm={onBulkDelete}
      />
      <ConfirmDialog
        open={rowConfirm !== null}
        onOpenChange={(o) => !o && setRowConfirm(null)}
        title={t("bulk_delete_confirm_title")}
        description={t("bulk_delete_confirm_body")}
        destructive
        onConfirm={onRowDelete}
      />
    </div>
  );
}
